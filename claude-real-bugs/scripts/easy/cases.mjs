// Hidden test cases for the Claude-only bug study (2026-10-24).
// Each case is one assertion taken from the test the maintainers added with the fix,
// split so a partial fix gets partial credit. usage: node cases.mjs <bug> <workdir>
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import path from 'node:path'
import assert from 'node:assert/strict'

const [bug, dir] = process.argv.slice(2)
const W = path.resolve(dir)
const req = createRequire(path.join(W, 'package.json'))
const imp = (p) => import(pathToFileURL(path.join(W, p)).href)

const eq = (a, b) => { assert.deepStrictEqual(a, b); return true }
const throwsRe = (fn, re) => { assert.throws(fn, re); return true }
const smiley = '%26%239786%3B'

const C = {
  y802: async () => {
    const { load } = await imp('dist/js-yaml.mjs')
    return [
      ['|+ body whitespace-only then sibling key', () => eq(load('a: |+\n   \nb: 1\n'), { a: '\n', b: 1 })],
      ['nested |+ whitespace-only then parent-level key', () => eq(load('a:\n  b: |+\n      \n  c: 1\n'), { a: { b: '\n', c: 1 } })],
      ['leading spaces longer than first content line still an error', () => throwsRe(() => load('a: |\n   \n b\n'), /bad indentation/)]
    ]
  },
  y798: async () => {
    const { dump } = await imp('dist/js-yaml.mjs')
    const one = (v) => dump({ k: v }, { forceQuotes: true })
    return [
      ['string still quoted', () => eq(one('world'), "k: 'world'\n")],
      ['bool not quoted', () => eq(one(true), 'k: true\n')],
      ['int not quoted', () => eq(one(42), 'k: 42\n')],
      ['float not quoted', () => eq(one(3.14), 'k: 3.14\n')],
      ['null not quoted', () => eq(one(null), 'k: null\n')],
      ['Date stays a plain timestamp', () => eq(one(new Date(0)), 'k: 1970-01-01T00:00:00.000Z\n')],
      ['double quoteStyle for strings', () => eq(dump({ hello: 'world' }, { forceQuotes: true, quoteStyle: 'double' }), 'hello: "world"\n')]
    ]
  },
  d699: async () => {
    const { diffJson } = await imp('libesm/index.js')
    return [
      ['non-callable toJSON treated as a normal property', () => eq(diffJson({ toJSON: 'aaa' }, { toJSON: 'bbb' }), [
        { count: 1, value: '{\n', removed: false, added: false },
        { count: 1, value: '  "toJSON": "aaa"\n', added: false, removed: true },
        { count: 1, value: '  "toJSON": "bbb"\n', added: true, removed: false },
        { count: 1, value: '}', removed: false, added: false }])],
      ['nested callable toJSON still applied', () => eq(diffJson({ foo: { toJSON: () => 'aaa' } }, { foo: { toJSON: () => 'bbb' } }), [
        { count: 1, value: '{\n', removed: false, added: false },
        { count: 1, value: '  "foo": "aaa"\n', added: false, removed: true },
        { count: 1, value: '  "foo": "bbb"\n', added: true, removed: false },
        { count: 1, value: '}', removed: false, added: false }])]
    ]
  },
  d707: async () => {
    const { diffJson } = await imp('libesm/index.js')
    return [
      ['array returned by toJSON stays an array (keys sorted inside)', () => {
        const expected = [1, { a: 2, b: 3 }]
        return eq(diffJson({ toJSON: () => [1, { b: 3, a: 2 }] }, expected),
          [{ count: 7, value: JSON.stringify(expected, null, '  '), added: false, removed: false }])
      }],
      ['toJSON on an array is called', () => {
        const value = [1, 2]; value.toJSON = () => ({ b: 2, a: 1 })
        const expected = { a: 1, b: 2 }
        return eq(diffJson(value, expected), [{ count: 4, value: JSON.stringify(expected, null, '  '), added: false, removed: false }])
      }]
    ]
  },
  d701: async () => {
    const { structuredPatch, applyPatch, parsePatch, formatPatch } = await imp('libesm/index.js')
    const { winToUnix, isWin, isUnix } = await imp('libesm/patch/line-endings.js')
    const H = 'Index: test\n===================================================================\n--- test\theader1\n+++ test\theader2\n'
    return [
      ['applyPatch keeps literal CR on last line (Unix file)', () => {
        const o = 'line1\nline2\n', n = 'line1\nline2\nline3\r'
        return eq(applyPatch(o, structuredPatch('test', 'test', o, n, undefined, undefined, { context: 0 })), n)
      }],
      ['applyPatch of such a patch to a CRLF file', () => {
        const p = structuredPatch('test', 'test', 'line1\nline2\n', 'line1\nline3\r', undefined, undefined, { context: 0 })
        return eq(applyPatch('line1\r\nline2\r\n', p), 'line1\r\nline3\r')
      }],
      ['winToUnix leaves literal CR before no-newline marker', () => eq(formatPatch(winToUnix(parsePatch(
        H + '@@ -1,2 +1,2 @@\n line2\r\n-line3\r\n+line3changed\r\n\\ No newline at end of file\n'))),
        H + '@@ -1,2 +1,2 @@\n line2\n-line3\n+line3changed\r\n\\ No newline at end of file\n')],
      ['isWin false when only CR is the no-newline line', () => eq(isWin(parsePatch(
        H + '@@ -2,0 +3,1 @@\n+line3\r\n\\ No newline at end of file\n')), false)],
      ['isUnix true when only the last no-newline line has a CR', () => eq(isUnix(parsePatch(
        H + '@@ -1,2 +1,3 @@\n line2\n line3\n+line4\r\n\\ No newline at end of file\n')), true)]
    ]
  },
  q629: async () => {
    const qs = req('./lib/index.js')
    const o = { comma: true, charset: 'iso-8859-1', interpretNumericEntities: true }
    return [
      ['issue example a=b,c', () => eq(qs.parse('a=b,c', o), { a: ['b', 'c'] })],
      ['entities interpreted per element', () => eq(qs.parse('a=' + smiley + ',%26%239786%3B', o), { a: ['☺', '☺'] })],
      ['entity comma and encoded comma stay inside elements', () => eq(qs.parse('a=%26%2344%3B,b%2Cc', o), { a: [',', 'b,c'] })],
      ['empty entries kept', () => eq(qs.parse('a=,b,', o), { a: ['', 'b', ''] })],
      ['repeated keys', () => eq(qs.parse('a=b,c&a=d,e', o), { a: ['b', 'c', 'd', 'e'] })],
      ['[] keys', () => eq(qs.parse('a[]=b,c&a[]=d,e', o), { a: [['b', 'c'], ['d', 'e']] })],
      ['[0] key', () => eq(qs.parse('a[0]=b,c', o), { a: [['b', 'c']] })],
      ['charsetSentinel', () => eq(qs.parse('utf8=%26%2310003%3B&a=b,' + smiley, { comma: true, charsetSentinel: true, interpretNumericEntities: true }), { a: ['b', '☺'] })],
      ['arrayLimit overflow', () => eq(qs.parse('a=b,c,d', { ...o, arrayLimit: 2 }), { a: { 0: 'b', 1: 'c', 2: 'd' } })],
      ['throwOnLimitExceeded', () => throwsRe(() => qs.parse('a=b,c,d', { ...o, arrayLimit: 2, throwOnLimitExceeded: true }), RangeError)],
      ['falsy decoder results kept', () => eq(qs.parse('a=null,0,false,' + smiley, { ...o,
        decoder (str, def, cs, type) { if (type === 'value') { if (str === 'null') return null; if (str === '0') return 0; if (str === 'false') return false } return def(str, def, cs, type) } }),
      { a: [null, 0, false, '☺'] })],
      ['old crash test now gives nested array', () => eq(qs.parse('b&a[]=1,' + smiley, o), { b: '', a: [['1', '☺']] })]
    ]
  },
  q624: async () => {
    const qs = req('./lib/index.js'); const utils = req('./lib/utils.js')
    const cases = [
      ['lone high surrogate value', () => eq(qs.stringify({ a: '\uD800x' }), 'a=%EF%BF%BDx')],
      ['lone low surrogate value', () => eq(qs.stringify({ a: '\uDC00x' }), 'a=%EF%BF%BDx')],
      ['lone surrogate key', () => eq(qs.stringify({ '\uD800': 'b' }), '%EF%BF%BD=b')],
      ['round trip', () => eq(qs.parse(qs.stringify({ a: 'x\uD800y' })), { a: 'x\uFFFDy' })],
      ['lone low surrogate key', () => eq(qs.stringify({ '\uDC00': 'b' }), '%EF%BF%BD=b')],
      ['nested key bracket', () => eq(qs.stringify({ a: { 'b\uD800': 'c' } }), 'a%5Bb%EF%BF%BD%5D=c')],
      ['RFC1738 space', () => eq(qs.stringify({ a: '\uD800 x' }, { format: 'RFC1738' }), 'a=%EF%BF%BD+x')],
      ['encodeDotInKeys dot', () => eq(qs.stringify({ 'a\uD800': { b: 'c' } }, { allowDots: true, encodeDotInKeys: true }), 'a%EF%BF%BD.b=c')],
      ['comma arrayFormat', () => eq(qs.stringify({ a: ['x\uD800', 'y'] }, { arrayFormat: 'comma' }), 'a=x%EF%BF%BD%2Cy')],
      ['comma encodeValuesOnly', () => eq(qs.stringify({ a: ['x\uD800', 'y'] }, { arrayFormat: 'comma', encodeValuesOnly: true }), 'a=x%EF%BF%BD,y')],
      ['utils lone pair with space', () => eq(utils.encode('\uD83D \uDCA9'), '%EF%BF%BD%20%EF%BF%BD')],
      ['reversed pair', () => eq(utils.encode('\uDCA9\uD83D'), '%EF%BF%BD%EF%BF%BD')],
      ['trailing high surrogate', () => eq(utils.encode('x\uD83D'), 'x%EF%BF%BD')],
      ['lone high before valid pair', () => eq(utils.encode('\uD83D\uD83D\uDCA9'), '%EF%BF%BD%F0%9F%92%A9')],
      ['high then above-range unit', () => eq(utils.encode('\uD83D\uE000'), '%EF%BF%BD%EE%80%80')],
      ['low then low', () => eq(utils.encode('\uDC00\uDC00'), '%EF%BF%BD%EF%BF%BD')]
    ]
    // chunk-boundary cases (1024 code units)
    const pre = 'a'.repeat(1023)
    cases.push(['lone low surrogate at chunk boundary', () => eq(utils.encode(pre + '\uDC00X'), pre + '%EF%BF%BDX')])
    cases.push(['lone high surrogate ending one chunk', () => eq(utils.encode(pre + '\uD83D'), pre + '%EF%BF%BD')])
    cases.push(['lone high at boundary then X', () => eq(utils.encode(pre + '\uD83DX'), pre + '%EF%BF%BDX')])
    return cases
  },
  p1163: async () => {
    const Papa = req('./papaparse.js')
    const inp = () => [[null], ['hello'], [undefined], ['world']]
    return [
      ['skipEmptyLines true skips null/undefined rows', () => eq(Papa.unparse(inp(), { skipEmptyLines: true }), 'hello\r\nworld')],
      ['skipEmptyLines false keeps empty rows', () => eq(Papa.unparse(inp(), { skipEmptyLines: false }), '\r\nhello\r\n\r\nworld')],
      ['greedy skips', () => eq(Papa.unparse(inp(), { skipEmptyLines: 'greedy' }), 'hello\r\nworld')],
      ['row [0] not skipped', () => eq(Papa.unparse([[0], ['hello']], { skipEmptyLines: true }), '0\r\nhello')]
    ]
  },
  m1204: async () => {
    const md = (await imp('src/index.ts')).default()
    const r = (s) => md.render(s)
    return [
      ['port kept, brackets in path/query still encoded', () => eq(r('[foo](http://[2001:db8::1]:1896/a[b]?x=[y])\n'), '<p><a href="http://[2001:db8::1]:1896/a%5Bb%5D?x=%5By%5D">foo</a></p>\n')],
      ['protocol-relative', () => eq(r('[foo](//[::ffff:192.0.2.1]/)\n'), '<p><a href="//[::ffff:192.0.2.1]/">foo</a></p>\n')],
      ['userinfo', () => eq(r('[foo](http://user:password@[2001:db8:0:0:0:0:0:1]:1926/)\n'), '<p><a href="http://user:password@[2001:db8:0:0:0:0:0:1]:1926/">foo</a></p>\n')]
    ]
  }
}

const cases = await C[bug]()
const res = []
for (const [name, fn] of cases) {
  let ok = false; let err = ''
  try { ok = (await fn()) === true } catch (e) { err = String(e && e.message || e).split('\n')[0].slice(0, 160) }
  res.push({ name, ok, err })
}
console.log(JSON.stringify({ bug, passed: res.filter(x => x.ok).length, total: res.length, cases: res }))
