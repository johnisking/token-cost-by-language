"""Prompts for the Claude-only bug study (2026-10-24). Writes one prompt file per bug to ../prompts/.
Reports keep the user's symptom, reproduction and expected result; any cause analysis or fix description is removed."""
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'prompts')
os.makedirs(OUT, exist_ok=True)

TPL = ('The current folder is a checkout of {proj}. A user reported the bug below. Find the cause in the source code and fix it in '
       '{src}, without breaking any other behaviour. Dependencies are already installed in node_modules, and you may run commands in '
       'this folder to check your work, for example {cmds}. You may add tests. Do not install packages and do not use the network. '
       'Change the files in place and finish.\n\nBug report:\n"""\n{report}\n"""\n')

P = {}
YAML = dict(proj='js-yaml, the YAML parser and dumper (TypeScript sources in src/, tests in test/)', src='src/',
            cmds='npm run build (builds dist/, which the tests import) and node --test "test/core/**/*.test.mjs"')
DIFF = dict(proj='jsdiff, the npm package "diff" (TypeScript sources in src/, tests in test/)', src='src/',
            cmds='node node_modules/typescript/bin/tsc --module nodenext --outDir libesm --target es6 (the tests import libesm/) '
                 'and node node_modules/mocha/bin/mocha.js --timeout 20000 --ignore test/patch/readme-rename-example.js "test/**/*.js"')
QS = dict(proj='qs, the query string parser and serializer (sources in lib/, tests in test/)', src='lib/',
          cmds='node node_modules/tape/bin/tape "test/**/*.js"')
PAPA = dict(proj='Papa Parse, the CSV parser (source in papaparse.js, tests in tests/)', src='papaparse.js',
            cmds='node node_modules/mocha/bin/mocha tests/node-tests.js tests/test-cases.js')
MDIT = dict(proj='markdown-it, the Markdown parser (TypeScript sources in src/, tests in test/)', src='src/',
            cmds='node --test "test/markdown-it/**/*.test.mjs"')

P['y802'] = (YAML, """Block scalar with a whitespace-only body fails

Since 5.0.0, load rejects a block scalar when its body is one whitespace-only line and the next line is less indented than the scalar. 4.3.2 parses the same input.

import { load } from 'js-yaml'
const source = [
  'a:',
  '  oneOf:',
  '    - type: string',
  '      example: |+',
  ' '.repeat(8),          // a line that contains only spaces
  '    - type: array',
  ''
].join('\\n')
load(source)

Current version: YAMLException: bad indentation of a mapping entry
4.3.2: { a: { oneOf: [ { type: 'string', example: '\\n' }, { type: 'array' } ] } }
The yaml package 2.9.1 gives the same value as 4.3.2.

The same error occurs with |, > and >+, and when the next line is a sibling key at the parent's indent (a:\\n  x: |+\\n      \\n  y: 1\\n). An empty line with no spaces parses correctly.

Expected: the scalar ends at the less indented line, and example is "\\n".""")

P['y798'] = (YAML, """forceQuotes quotes non-string scalars and emits explicit type tags

Enabling forceQuotes applies the quoted style not only to JavaScript strings, but also to booleans, numbers and null. As a result, explicit tags such as !!bool, !!int, !!float and !!null are emitted to preserve their types. The documentation describes forceQuotes as quoting "all non-key strings", and v4 only quoted string values.

import { dump } from 'js-yaml'
console.log(dump(
  { bool: true, integer: 42, float: 3.14, nil: null, text: 'true' },
  { forceQuotes: true, quoteStyle: 'double' }
))

Actual output:
bool: !!bool "true"
integer: !!int "42"
float: !!float "3.14"
nil: !!null "null"
text: "true"

Expected output (only JavaScript string values quoted):
bool: true
integer: 42
float: 3.14
nil: null
text: "true"

The emitted YAML is valid and dump() followed by load() preserves the types; the problem is that forceQuotes is applied to non-string scalar values.""")

P['d699'] = (DIFF, """diffJson throws on truthy, non-callable toJSON

diffJson calls toJSON when it is truthy, even if it is not callable. This can make diffJson throw on valid JSON objects. JSON.stringify only calls toJSON if it is callable.

import { diffJson } from 'diff'
const oldObject = JSON.parse('{"toJSON":"old"}')
const newObject = JSON.parse('{"toJSON":"new"}')
try {
  console.log(diffJson(oldObject, newObject))
} catch (error) {
  console.log(`${error.name}: ${error.message}`)
}

Output:
TypeError: obj.toJSON is not a function""")

P['d707'] = (DIFF, """diffJson serializes arrays with toJSON wrongly

diffJson does not serialize toJSON results the way JSON.stringify does:
- when an object's toJSON() returns an array, diffJson shows it as an object with numeric keys ("0", "1", ...) instead of an array;
- when an array has its own toJSON() method, diffJson ignores it and diffs the array's elements.

JSON.stringify handles both cases correctly, so diffJson(a, b) reports differences between values whose JSON is identical.""")

P['d701'] = (DIFF, """applyPatch drops a literal carriage return at the end of a file

applyPatch corrupts output when a Unix source is patched with a patch whose final line's content ends in a literal carriage return and has no trailing newline. The \\r is silently dropped.

import { structuredPatch, applyPatch } from 'diff';
const oldFile = 'line1\\nline2\\n';
const newFile = 'line1\\nline2\\nline3\\r';
const patch = structuredPatch('f', 'f', oldFile, newFile, undefined, undefined, {context: 0});
applyPatch(oldFile, patch); // => 'line1\\nline2\\nline3'  (the '\\r' is lost)

I found this by fuzzing random source/target pairs through structuredPatch -> applyPatch; 80 of 200k pairs failed to round-trip, all of this shape. Expected: applyPatch(oldFile, patch) === newFile.""")

P['q629'] = (QS, """comma: true is ignored with charset 'iso-8859-1' and interpretNumericEntities

const qs = require('qs');
qs.parse('a=b,c', { comma: true });
// => { a: ['b', 'c'] }
qs.parse('a=b,c', { comma: true, charset: 'iso-8859-1', interpretNumericEntities: true });
// => { a: 'b,c' }      (expected { a: ['b', 'c'] })

The two options cancel each other out. Reproduced on 6.16.1.""")

P['q624'] = (QS, """stringify: a lone surrogate swallows the next character

When a string contains a lone UTF-16 surrogate, qs.stringify silently eats the character after it:

qs.stringify({ a: '\\uD800x' });   // 'a=%F0%90%81%B8'  -> parses back as U+10078; the x is gone
qs.stringify({ a: 'x\\uDBFF' });   // 'a=x%F4%8F%B0%80' -> trailing surrogate combined with garbage
qs.stringify({ a: '\\uDC00 ' });   // the space is swallowed

Expected: like URLSearchParams and TextEncoder, a lone surrogate should be encoded as U+FFFD (%EF%BF%BD) and the following character kept:

qs.stringify({ a: '\\uD800x' });   // 'a=%EF%BF%BDx'
new URLSearchParams({ a: '\\uD800x' }).toString(); // 'a=%EF%BF%BDx'

Valid surrogate pairs (emoji etc.) must still encode as before.""")

P['p1163'] = (PAPA, """unparse crashes on a null cell when skipEmptyLines is true

Papa.unparse() throws an error when a row contains a single null value and skipEmptyLines is set to true. The same data exports successfully when this option is false or 'greedy'.

import Papa from 'papaparse';
const data = [
  [null],
  ['hello'],
];
console.log(Papa.unparse(data, { skipEmptyLines: true }));

Actual result:
TypeError: Cannot read properties of null (reading 'length')

A single-cell row containing undefined also throws.

Expected result: the export should handle null and undefined cells without crashing. Since these values are normally exported as empty cells, an empty single-cell row should be skipped.""")

P['m1204'] = (MDIT, """IPv6 address literal brackets are percent-encoded in link destinations

Link destinations containing IPv6 address literals are rendered with the brackets percent-encoded ([ -> %5B, ] -> %5D). Per the WHATWG URL Standard an IPv6 host must be a literal [IPv6address]; a host starting with %5B falls through to domain parsing and fails, so the emitted links are invalid in browsers (new URL("http://%5B2001:db8::1%5D/") throws, and clicking the generated <a> element does nothing in Firefox and Chromium).

Input:
[visit](http://[2001:db8::1]/)

Expected result:
<p><a href="http://[2001:db8::1]/">visit</a></p>

Actual result:
<p><a href="http://%5B2001:db8::1%5D/">visit</a></p>""")

for k, (meta, rep) in P.items():
    with open(os.path.join(OUT, f'{k}.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(TPL.format(report=rep, **meta))
print(sorted(P))

HUM = dict(proj='humanize, the Python library of number and time formatting helpers (sources in src/humanize/, tests in tests/)', src='src/humanize/',
           cmds='.venv/Scripts/python -m pytest -q tests (a virtual environment with pytest is in .venv)')
TOML = dict(proj='tomlkit, the style-preserving TOML library for Python (sources in tomlkit/, tests in tests/)', src='tomlkit/',
            cmds='.venv/Scripts/python -m pytest -q --ignore=tests/test_toml_tests.py tests (a virtual environment with pytest is in .venv)')
MIT = dict(proj='more-itertools, the Python library (sources in more_itertools/, tests in tests/)', src='more_itertools/',
           cmds='.venv/Scripts/python -m pytest -q tests (a virtual environment with pytest is in .venv)')
PY_TPL = TPL.replace('Dependencies are already installed in node_modules', 'Dependencies are already installed')

PYP = {}
PYP['h359'] = (HUM, """metric() shows one significant figure too many

metric() can show one significant figure too many when rounding carries the mantissa up a power of ten.

>>> import humanize
>>> humanize.metric(9999)
'10.00 k'      # 4 significant figures at the default precision=3
>>> humanize.metric(99999)
'100.0 k'      # 4 significant figures
>>> humanize.metric(9.99999)
'10.00'

The neighbours show the inconsistency: same magnitude, correct 3 significant figures:

>>> humanize.metric(10000)
'10.0 k'
>>> humanize.metric(100000)
'100 k'

Expected: metric(9999) == '10.0 k', metric(99999) == '100 k', metric(9.99999) == '10.0'.""")

PYP['t336'] = (TOML, """Emitting underscores in integers

TOML allows an underscore in an integer as long as there is a digit on each side of it (https://toml.io/en/v1.0.0#integer):

  int5 = 1_000
  int6 = 5_349_221
  int7 = 53_49_221  # Indian number system grouping
  int8 = 1_2_3_4_5  # VALID but discouraged

I'd like to be able to emit an underscore-formatted integer when dumping a TOML file, by supplying a _-formatted integer as a string and having tomlkit render it as a number, without quotation marks. Today the grouping is lost:

>>> import tomlkit
>>> tomlkit.integer("1_000").as_string()
'1000'

Expected: tomlkit.integer("1_000").as_string() == '1_000' (and int() of it is still 1000), so that doc["n"] = tomlkit.integer("1_000"); tomlkit.dumps(doc) gives 'n = 1_000\\n'.""")

PYP['t599'] = (TOML, """Deleting a slice from an array corrupts the rendered output

Deleting a slice from a tomlkit Array keeps the Python list right, but as_string() / dumps() silently disagree with it:

import tomlkit
doc = tomlkit.parse("a = [1, 2, 3]\\n")
del doc["a"][:0]        # deletes nothing
tomlkit.dumps(doc)      # 'a = []\\n'  - expected 'a = [1, 2, 3]\\n'

| operation      | list(arr)  | arr.as_string() | expected  |
| del arr[:0]    | [1, 2, 3]  | []              | [1, 2, 3] |
| del arr[-1:]   | [1, 2]     | []              | [1, 2]    |
| del arr[:-1]   | [3]        | [1, 2, 3]       | [3]       |""")

PYP['t642'] = (TOML, """Parse errors report the wrong line and column for CRLF files

The line and column reported in a parse error depend on the document's line endings. With \\r\\n line endings the error lands on the wrong line and the wrong column:

from tomlkit.parser import Parser
Parser("a = 1\\r\\nb = 2\\r\\nc = @\\r\\nd = 4\\r\\n").parse()
# UnexpectedCharError: Unexpected character: '@' at line 4 col 0

The '@' is on line 3, column 4, which is what the same document with \\n endings reports. Files with mixed line endings are affected too. Expected: the reported position is the same whatever the line endings are.""")

PYP['i1304'] = (MIT, """ichunked(..., 0) raises islice's ValueError on a nonempty iterable

ichunked is documented as being like chunked, but with lazy chunks. chunked treats n=0 as "yield nothing". ichunked only does that when the source is already empty; with any remaining items it blows up.

I hit this switching a streaming pipeline from chunked to ichunked so batches would not be materialized as lists. Chunk size comes from the same config in both paths; 0 means "this stage is disabled, emit nothing."

from more_itertools import chunked, ichunked
rows = ["a", "b", "c"]  # e.g. leftover rows from a DB cursor
chunk_size = 0          # config: skip this sink
print(list(chunked(rows, chunk_size)))
# []
print([list(c) for c in ichunked(rows, chunk_size)])
# ValueError: Stop argument for islice() must be None or an integer: 0 <= x <= sys.maxsize.

Negative n has the same leak: chunked raises ValueError: n must be at least 0, ichunked raises islice's "Indices for islice() must be None or an integer..." instead.""")

PYP['i1268'] = (MIT, """seekable(..., maxlen=0): peek() and bool() drop items

seekable(..., maxlen=0) is supposed to disable the history cache (elements() stays empty) while still iterating the source. peek() and bool() currently consume an item and it is lost:

from more_itertools import seekable
s = seekable([10, 20, 30], maxlen=0)
s.peek()
list(s)  # [20, 30]  - 10 is gone

s = seekable([10, 20, 30], maxlen=0)
bool(s)  # True
list(s)  # [20, 30]  - 10 is gone

The default maxlen=None is fine (peek is stable; bool does not consume).""")

for k, (meta, rep) in PYP.items():
    with open(os.path.join(OUT, f'{k}.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(PY_TPL.format(report=rep, **meta))
print(sorted(PYP))
