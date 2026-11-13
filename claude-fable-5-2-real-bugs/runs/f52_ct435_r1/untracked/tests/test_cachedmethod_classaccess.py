import threading
import unittest

from cachetools import Cache, cachedmethod


def _classes(**kwargs):
    class Base:
        def __init__(self):
            self.cache = Cache(8)
            self.calls = 0
            self.lock = threading.RLock()
            self.cond = threading.Condition()

        @cachedmethod(lambda self: self.cache, **kwargs)
        def value(self, number):
            self.calls += 1
            return number * 2

    class Derived(Base):
        @cachedmethod(lambda self: Cache(0), **kwargs)
        def value(self, number):
            return Base.value(self, number) + super().value(number + 1)

    return Base, Derived


VARIANTS = [
    dict(),
    dict(info=True),
    dict(lock=lambda self: self.lock),
    dict(lock=lambda self: self.lock, info=True),
    dict(condition=lambda self: self.cond),
    dict(condition=lambda self: self.cond, info=True),
]


class CachedMethodClassAccessTest(unittest.TestCase):
    def test_explicit_instance(self):
        for kwargs in VARIANTS:
            for first in ("class", "instance"):
                with self.subTest(kwargs=sorted(kwargs), first=first):
                    Base, _ = _classes(**kwargs)
                    obj = Base()
                    if first == "instance":
                        self.assertEqual(obj.value(3), 6)
                    self.assertEqual(Base.value(obj, 3), 6)
                    self.assertEqual(obj.value(3), 6)
                    self.assertEqual(obj.calls, 1)
                    self.assertEqual(len(obj.cache), 1)
                    # keyword arguments yield a different cache key
                    self.assertEqual(Base.value(obj, number=3), 6)
                    self.assertEqual(obj.value(number=3), 6)
                    self.assertEqual(obj.calls, 2)
                    if "info" in kwargs:
                        self.assertEqual(Base.value.cache_info(obj).misses, 2)
                        self.assertEqual(obj.value.cache_info().misses, 2)
                    Base.value.cache_clear(obj)
                    self.assertEqual(len(obj.cache), 0)
                    self.assertEqual(Base.value.__name__, "value")
                    with self.assertRaises(TypeError):
                        Base.value()

    def test_instances_are_independent(self):
        Base, _ = _classes()
        a, b = Base(), Base()
        self.assertEqual(Base.value(a, 1), 2)
        self.assertEqual(Base.value(b, 1), 2)
        self.assertEqual((a.calls, b.calls), (1, 1))
        self.assertEqual((len(a.cache), len(b.cache)), (1, 1))

    def test_explicit_base_call_from_override(self):
        for kwargs in VARIANTS:
            with self.subTest(kwargs=sorted(kwargs)):
                _, Derived = _classes(**kwargs)
                obj = Derived()
                self.assertEqual(obj.value(3), 6 + 8)
                self.assertEqual(Derived.value(obj, 3), 6 + 8)
                self.assertEqual(obj.calls, 2)
