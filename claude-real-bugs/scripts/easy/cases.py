"""Hidden test cases (Python bugs) for the Claude-only bug study, one assertion each, taken from the
tests the maintainers added with the fix. usage: python cases.py <bug> <workdir>"""
import json, os, sys

bug, d = sys.argv[1], os.path.abspath(sys.argv[2])
sys.path.insert(0, os.path.join(d, 'src') if bug.startswith('h') else d)


def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    return False


def cases():
    if bug == 'h359':
        import humanize
        m = humanize.metric
        return [(f'metric{a!r} == {e!r}', (lambda a=a, e=e: m(*a) == e)) for a, e in [
            ((9999,), '10.0 k'), ((99999,), '100 k'), ((9.99999,), '10.0'),
            ((-9999,), '-10.0 k'), ((9.999, '', 2), '10'), ((999.4,), '999')]]
    if bug == 't336':
        import tomlkit
        good = ['0', '42', '1_000', '5_349_221', '+1_000', '-1_000', '0xdead_beef', '0xDEAD_BEEF', '0o7_7', '0b1_0']
        bad = ['', 'abc', '_100', '100_', '1__000', '01_2', '0x_1', '0X1', '+0x1', '-0o7', ' 1', '1 ', '1.0', '1e3']
        out = [(f'preserve {r!r}', (lambda r=r: tomlkit.integer(r).as_string() == r and int(tomlkit.integer(r)) == int(r, 0))) for r in good]
        def emit(r):
            doc = tomlkit.document(); doc['n'] = tomlkit.integer(r)
            return tomlkit.dumps(doc) == f'n = {r}\n' and tomlkit.integer(r).as_string() == tomlkit.parse(f'n = {r}\n')['n'].as_string()
        out += [(f'emit {r!r}', (lambda r=r: emit(r))) for r in ['1_000', '0xdead_beef', '+1_000', '0o7_7']]
        out += [(f'reject {r!r}', (lambda r=r: raises(ValueError, lambda: tomlkit.integer(r)))) for r in bad]
        out += [('int 1000 unchanged', lambda: tomlkit.integer(1000).as_string() == '1000' and int(tomlkit.integer(1000)) == 1000)]
        return out
    if bug == 't599':
        from tomlkit import item
        def chk(op, lst, s):
            a = item([1, 2, 3]); op(a)
            return a == lst and a.as_string() == s
        def d0(a): del a[:0]
        def d1(a): del a[-1:]
        def d2(a): del a[:-1]
        return [('del a[:0]', lambda: chk(d0, [1, 2, 3], '[1, 2, 3]')), ('del a[-1:]', lambda: chk(d1, [1, 2], '[1, 2]')),
                ('del a[:-1]', lambda: chk(d2, [3], '[3]'))]
    if bug == 't642':
        from tomlkit.parser import Parser
        from tomlkit.exceptions import UnexpectedCharError
        def pos(content):
            try:
                Parser(content).parse()
            except UnexpectedCharError as e:
                return e.line == 3 and e.col == 4
            return False
        return [('LF position', lambda: pos('\n'.join(['a = 1', 'b = 2', 'c = @', 'd = 4']) + '\n')),
                ('CRLF position', lambda: pos('\r\n'.join(['a = 1', 'b = 2', 'c = @', 'd = 4']) + '\r\n')),
                ('mixed endings position', lambda: pos('a = 1\r\nb = 2\nc = @\r\n'))]
    if bug == 'i1304':
        import more_itertools as mi
        def src_untouched():
            s = iter([1, 2, 3])
            return [list(c) for c in mi.ichunked(s, 0)] == [] and list(s) == [1, 2, 3]
        def neg():
            try:
                list(mi.ichunked([1, 2, 3], -1))
            except ValueError as e:
                return 'n must be at least 0' in str(e)
            return False
        return [('ichunked(list, 0) yields nothing', lambda: [list(c) for c in mi.ichunked([1, 2, 3], 0)] == []),
                ('ichunked(iterator, 0) leaves source unconsumed', src_untouched),
                ('negative n: ValueError "n must be at least 0"', neg)]
    if bug == 'i1268':
        import more_itertools as mi
        def peek():
            s = mi.seekable([10, 20, 30], maxlen=0)
            return s.peek() == 10 and s.peek() == 10 and list(s) == [10, 20, 30]
        def truthy():
            s = mi.seekable([10, 20, 30], maxlen=0)
            return bool(s) is True and list(s) == [10, 20, 30]
        return [('peek keeps items', peek), ('bool keeps items', truthy),
                ('empty seekable(maxlen=0) is falsy', lambda: not mi.seekable([], maxlen=0))]
    raise SystemExit('unknown bug')


res = []
for name, fn in cases():
    ok, err = False, ''
    try:
        ok = fn() is True
    except BaseException as e:  # noqa: BLE001
        err = f'{type(e).__name__}: {e}'[:160]
    res.append({'name': name, 'ok': ok, 'err': err})
print(json.dumps({'bug': bug, 'passed': sum(r['ok'] for r in res), 'total': len(res), 'cases': res}))
