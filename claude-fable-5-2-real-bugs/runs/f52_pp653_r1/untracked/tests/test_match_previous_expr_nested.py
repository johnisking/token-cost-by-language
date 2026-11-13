import pyparsing as pp


def ok(e, s):
    try:
        e.parse_string(s, parse_all=True)
        return True
    except pp.ParseException:
        return False


def make_tags():
    name = pp.Word(pp.alphas)
    op = pp.Suppress("{") + name + pp.Suppress("}")
    cl = pp.Suppress("{/") + pp.match_previous_expr(name) + pp.Suppress("}")
    el = pp.Forward()
    el <<= pp.Group(op + pp.ZeroOrMore(el | pp.Word("x")) + cl)
    return el


def test_simple_and_nested():
    el = make_tags()
    assert ok(el, "{a}xx{/a}")
    assert ok(el, "{a}{b}xx{/b}{/a}")
    assert ok(el, "{a}{b}x{/b}{c}x{/c}{/a}")
    assert not ok(el, "{a}{b}xx{/a}{/b}")
    assert not ok(el, "{a}xx{/b}")
    assert el.parse_string("{a}{b}xx{/b}{/a}").as_list() == [
        ["a", ["b", "xx", "b"], "a"]
    ]


def test_reparse_after_failure():
    el = make_tags()
    assert not ok(el, "{a}xx{/b}")
    assert ok(el, "{a}xx{/a}")
    assert ok(el, "{a}{b}xx{/b}{/a}")
    assert ok(el, "{a}xx{/a}")


def test_sequential_pairs():
    first = pp.Word(pp.alphas)
    second = pp.match_previous_expr(first)
    pairs = pp.OneOrMore(first + ":" + second)
    assert ok(pairs, "a:a b:b")
    assert not ok(pairs, "a:a b:c")
    assert ok(pairs, "a:a b:b c:c")
    assert ok(first + ":" + second + ":" + second, "a:a:a")
    assert not ok(first + ":" + second, "a:ab")
