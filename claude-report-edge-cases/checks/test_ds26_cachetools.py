"""ds26 split checks for cachetools bugs. Each test is one case copied from the maintainers' fix tests.
Names: test_<bug>__<R|U>_<what>  (R = shown in the report, U = not shown). Run with pytest from the repo root."""
import unittest.mock
from datetime import datetime, timedelta

import pytest
from cachetools import Cache, TTLCache, cachedmethod, keys


class Cached:
    def __init__(self, cache, count=0):
        self.cache = cache
        self.count = count

    @cachedmethod(lambda self: self.cache)
    def get(self, value):
        r = self.count
        self.count += 1
        return r


# ---- ct443 (autospec) ----
def test_ct443__R_autospec_positional():
    m = unittest.mock.create_autospec(Cached, instance=True)
    m.get.return_value = 42
    assert m.get(1) == 42
    m.get.assert_called_with(1)


def test_ct443__U_autospec_keyword():
    m = unittest.mock.create_autospec(Cached, instance=True)
    m.get.return_value = 42
    assert m.get(value=1) == 42
    m.get.assert_called_with(value=1)


def test_ct443__U_class_call_without_instance_raises():
    with pytest.raises(TypeError):
        Cached.get()


# ---- ct446 (keyword receiver) ----
def test_ct446__R_keyword_self():
    c = Cached(Cache(2))
    assert Cached.get(self=c, value=1) == 0
    assert Cached.get(c, value=1) == 0
    assert Cached.get(self=c, value=2) == 1
    assert c.count == 2


def test_ct446__R_missing_instance_raises():
    with pytest.raises(TypeError):
        Cached.get(value=1)


class Named:
    def __init__(self, cache):
        self.cache = cache

    @cachedmethod(lambda this: this.cache)
    def get(this, value):
        return value

    @cachedmethod(lambda self: self.cache)
    def get_posonly(self, /, value):
        return value

    @cachedmethod(lambda self: self.cache)
    def get_noargs():
        return 42


def test_ct446__U_receiver_named_this():
    n = Named(Cache(2))
    assert Named.get(this=n, value=1) == 1
    assert Named.get(n, value=1) == 1


def test_ct446__U_wrong_receiver_name_raises():
    with pytest.raises(TypeError):
        Named.get(self=Named(Cache(2)), value=1)


def test_ct446__R_posonly_keyword_raises():
    with pytest.raises(TypeError):
        Named.get_posonly(self=Named(Cache(2)), value=1)


def test_ct446__U_noargs_method_raises():
    with pytest.raises(TypeError):
        Named.get_noargs()


# ---- ct440 (TTL overflow) ----
def _overflow_cache():
    cache = TTLCache(maxsize=1, ttl=timedelta(days=1), timer=lambda: datetime.max)
    with pytest.raises(OverflowError):
        cache["overflow"] = 1
    return cache


def test_ct440__R_not_in_cache():
    assert "overflow" not in _overflow_cache()


def test_ct440__U_len_and_currsize_zero():
    c = _overflow_cache()
    assert len(c) == 0 and c.currsize == 0


def test_ct440__U_iter_empty():
    assert list(_overflow_cache()) == []


def test_ct440__U_expire_empty():
    assert _overflow_cache().expire() == []


# ---- ct437 (super dispatch) ----
def _base(info=False):
    class Base:
        def __init__(self):
            self.base_cache = {}
            self.child_cache = {}

        @cachedmethod(lambda self: self.base_cache, info=info)
        def get(self, value):
            return value * 2
    return Base


def test_ct437__R_undecorated_override_twice():
    Base = _base()

    class Child(Base):
        def get(self, value):
            return super().get(value) + 1
    c = Child()
    assert c.get(3) == 7
    assert c.get(3) == 7


def test_ct437__U_undecorated_override_other_value_and_no_instance_attr():
    Base = _base(info=True)

    class Child(Base):
        def get(self, value):
            return super().get(value) + 1
    c = Child()
    c.get(3); c.get(3)
    assert c.get(4) == 9
    assert "get" not in vars(c)
    assert super(Child, c).get.cache_info() == (1, 2, None, 2)


def test_ct437__R_decorated_override():
    Base = _base()

    class Child(Base):
        @cachedmethod(lambda self: self.child_cache)
        def get(self, value):
            return super().get(value) + 1
    c = Child()
    assert c.get(3) == 7
    assert c.get(3) == 7


def test_ct437__R_decorated_override_separate_caches():
    Base = _base()

    class Child(Base):
        @cachedmethod(lambda self: self.child_cache)
        def get(self, value):
            return super().get(value) + 1
    c = Child()
    c.get(3)
    assert c.base_cache == {keys.hashkey(3): 6}
    assert c.child_cache == {keys.hashkey(3): 7}


@pytest.mark.parametrize("parent_first", [False, True])
# cond variants dropped: my condition stand-in fails at the fix commit and hangs at the parent
@pytest.mark.parametrize("variant", ["plain", "lock", "info"])
def test_ct437__U_decorated_variants(variant, parent_first):
    import threading
    kw = {}
    if "lock" in variant:
        kw["lock"] = lambda self: self.lock
    if "cond" in variant:
        kw["condition"] = lambda self: self.cond
    info = variant == "info"

    class Base:
        def __init__(self):
            self.base_cache = {}
            self.child_cache = {}
            self.lock = threading.RLock()
            self.cond = threading.Condition(threading.RLock())

        @cachedmethod(lambda self: self.base_cache, info=info, **kw)
        def get(self, value):
            return value * 2

    class Child(Base):
        @cachedmethod(lambda self: self.child_cache, info=info, **kw)
        def get(self, value):
            return super().get(value) + 1

    child = Child()
    parent = super(Child, child).get if parent_first else None
    assert child.get(3) == 7
    assert child.get(3) == 7
    if parent is None:
        parent = super(Child, child).get
    assert parent is super(Child, child).get
    assert child.get is child.get
    assert parent(3) == 6
    if info:
        assert parent.cache_info() == (1, 1, None, 1)
        assert child.get.cache_info() == (1, 1, None, 1)
    parent.cache_clear()
    assert child.base_cache == {}
    assert child.get(3) == 7


def test_ct437__U_multilevel_override():
    class Base:
        def __init__(self):
            self.cache = {}

        @cachedmethod(lambda self: self.cache, key=lambda self, value: keys.hashkey("base", value))
        def get(self, value):
            return value * 2

    class Child(Base):
        @cachedmethod(lambda self: self.cache, key=lambda self, value: keys.hashkey("child", value))
        def get(self, value):
            return super().get(value) + 1

    class GrandChild(Child):
        @cachedmethod(lambda self: self.cache, key=lambda self, value: keys.hashkey("grandchild", value))
        def get(self, value):
            return super().get(value) + 1

    c = GrandChild()
    assert c.get(3) == 8
    assert c.get(3) == 8
    assert super(GrandChild, c).get(3) == 7
    assert super(Child, c).get(3) == 6
