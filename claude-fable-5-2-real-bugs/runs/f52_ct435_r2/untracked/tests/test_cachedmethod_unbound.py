import threading
import unittest
import unittest.mock

from cachetools import Cache, cachedmethod

VARIANTS = [
    dict(),
    dict(lock=lambda self: self.lock),
    dict(condition=lambda self: self.cond),
    dict(info=True),
    dict(info=True, lock=lambda self: self.lock),
    dict(info=True, condition=lambda self: self.cond),
]


def make_classes(kwargs):
    class Example:
        def __init__(self):
            self.cache = Cache(2)
            self.lock = threading.RLock()
            self.cond = threading.Condition()
            self.calls = 0

        @cachedmethod(lambda self: self.cache, **kwargs)
        def value(self, number):
            """docstring"""
            self.calls += 1
            return number * 2

    class Sub(Example):
        def __init__(self):
            super().__init__()
            self.subcache = Cache(2)

        @cachedmethod(lambda self: self.subcache, **kwargs)
        def value(self, number):
            return Example.value(self, number) + super().value(number) + 1

    return Example, Sub


class CachedMethodUnboundTest(unittest.TestCase):
    def test_class_access_call(self):
        for kwargs in VARIANTS:
            with self.subTest(kwargs=sorted(kwargs)):
                Example, _ = make_classes(kwargs)
                example = Example()
                self.assertEqual(Example.value(example, 3), 6)
                self.assertEqual(example.value(3), 6)
                self.assertEqual(example.calls, 1)
                self.assertEqual(len(example.cache), 1)

                other = Example()
                self.assertEqual(Example.value(other, 4), 8)
                self.assertEqual(len(example.cache), 1)
                self.assertEqual(len(other.cache), 1)

    def test_class_access_attributes(self):
        for kwargs in VARIANTS:
            with self.subTest(kwargs=sorted(kwargs)):
                Example, _ = make_classes(kwargs)
                example = Example()
                self.assertEqual(Example.value.__name__, "value")
                self.assertEqual(Example.value.__doc__, "docstring")
                self.assertIs(Example.value.cache(example), example.cache)
                Example.value(example, 3)
                example.value(3)
                if kwargs.get("info"):
                    info = Example.value.cache_info(example)
                    self.assertEqual((info.hits, info.misses), (1, 1))
                Example.value.cache_clear(example)
                self.assertEqual(len(example.cache), 0)

    def test_overridden_method(self):
        for kwargs in VARIANTS:
            with self.subTest(kwargs=sorted(kwargs)):
                Example, Sub = make_classes(kwargs)
                sub = Sub()
                self.assertEqual(sub.value(2), 9)
                self.assertEqual(sub.value(2), 9)
                self.assertEqual(sub.calls, 1)
                self.assertEqual(Example.value(sub, 2), 4)

    def test_autospec(self):
        Example, _ = make_classes({})
        with unittest.mock.patch.object(Example, "value", autospec=True) as m:
            m.return_value = 1
            self.assertEqual(Example().value(5), 1)
        self.assertEqual(Example().value(5), 10)
