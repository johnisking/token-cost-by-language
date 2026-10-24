"""Prompts for the hard round (2026-10-24). Reports keep the user's symptom, repro and expected result;
cause analysis, proposed fixes and implementation notes are removed."""
import json, os
TPL = ('The current folder is a checkout of {proj}. A user reported the bug below. Find the cause in the source code and fix it in '
       '{src}, without breaking any other behaviour. {deps}, and you may run commands in this folder to check your work, '
       'for example {cmds}. You may add tests. Do not install packages and do not use the network. Change the files in place and finish.'
       '\n\nBug report:\n"""\n{report}\n"""\n')
NODE = 'Dependencies are already installed in node_modules'
PYD = 'Dependencies are already installed in a virtual environment in .venv'
ZOD = dict(proj='zod, the TypeScript schema library (monorepo; the library source is in packages/zod/src/, tests next to it in packages/zod/src/v4/classic/tests/)',
           src='packages/zod/src/', deps=NODE,
           cmds='node node_modules/vitest/vitest.mjs run --typecheck.enabled=false packages/zod/src/v4/classic/tests/default.test.ts (any test file can be given)')
MIT = dict(proj='more-itertools, the Python library (sources in more_itertools/, tests in tests/)', src='more_itertools/', deps=PYD,
           cmds='.venv/Scripts/python -m pytest -q tests/test_more.py')
CT = dict(proj='cachetools, the Python caching library (sources in src/cachetools/, tests in tests/)', src='src/cachetools/', deps=PYD,
          cmds='.venv/Scripts/python -m pytest -q tests/test_cachedmethod.py')
PM = dict(proj='Python-Markdown (sources in markdown/, tests in tests/)', src='markdown/', deps=PYD,
          cmds='.venv/Scripts/python -m pytest -q tests/test_syntax/blocks/test_html_blocks.py')
PP = dict(proj='pyparsing, the Python parsing library (sources in pyparsing/, tests in tests/)', src='pyparsing/', deps=PYD,
          cmds='.venv/Scripts/python -m pytest -q tests/test_unit.py -k Repeater')
MDIT = dict(proj='markdown-it, the Markdown parser (TypeScript sources in src/, tests in test/)', src='src/', deps=NODE,
            cmds='node --test test/markdown-it/markdown-it.test.mjs')
YAML = dict(proj='js-yaml, the YAML parser and dumper (TypeScript sources in src/, tests in test/)', src='src/', deps=NODE,
            cmds='npm run build (builds dist/, which the tests import) and node --test "test/core/**/*.test.mjs"')
MK = dict(proj='marked, the Markdown parser (TypeScript sources in src/, tests in test/)', src='src/', deps=NODE,
          cmds='node esbuild.config.js (builds lib/, which the tests import), then node --test test/run-spec-tests.js and node --test test/unit/marked.test.js')

P = {}
P['z6495'] = (ZOD, """Functions are executed twice for object property defaults

If you define an object type and use a function for a property's default value, the function is executed twice:

let test = 0;
const schema = z.object({
    TEST: z.string().default(() => {
        console.log(`Executed... ${test++}`);
        return 'default';
    })
})
schema.parse({});
// Executed... 0
// Executed... 1

When it's not wrapped in an object, the function is only executed once, as expected:

const defaultTuna = z.string().default(() => {
    console.log(`tuna`);
    return 'tuna';
});
defaultTuna.parse(undefined); // => "tuna"

Zod v4.4.2 does not have this issue and the default function is only executed once.""")

P['z6496'] = (ZOD, """toJSONSchema on record with numeric keys results in invalid propertyNames

import * as z from "zod";
const schema = z.record(z.number(), z.number());
const jsonSchema = z.toJSONSchema(schema);
console.log(jsonSchema);

produces this output:

{
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  propertyNames: { type: 'number' },
  additionalProperties: { type: 'number' }
}

which can never work because in JSON the property names are always strings.

Zod already handles Record<number, ...> keys in a way that mirrors TypeScript ("Zod supports numeric keys inside records in a way that closely mirrors TypeScript itself"), so toJSONSchema should also support numeric keys in a sensible way: the property names in the JSON Schema must be strings, not numbers.""")

P['mit'] = (MIT, """numeric_range: len(), `in` and index() disagree with the items produced, for float steps

With floats, a range can report a length that does not match what it yields, and can deny membership to its own items. On 11.1.0:

len() disagrees with iteration, in both directions:

>>> from more_itertools import numeric_range
>>> r = numeric_range(-8.732, -13.532, -2.4)
>>> list(r)
[-8.732, -11.132]
>>> len(r)
3
>>> r[2]                      # counted, but it is the excluded stop value
-13.532

>>> r = numeric_range(-69.37276490678778, -29.8339073344664, 4.942357196540172)
>>> len(list(r))
9
>>> len(r)
8
>>> r[8]                      # an item iteration yields, but indexing cannot reach
IndexError: numeric range object index out of range

Items are not `in` their own range:

>>> r = numeric_range(0.0, 1.0, 0.1)
>>> r[3]
0.30000000000000004
>>> r[3] in r
False
>>> r.index(r[3])
ValueError: 0.30000000000000004 is not in numeric range
>>> sum(1 for v in r if v not in r)
5

count() follows `in`, so it returns 0 for those items too.

Exact types (Decimal, Fraction, int, datetime/timedelta) behave correctly and must keep doing so. numeric_range is a Sequence, and here r[i] not in r and len(r) != len(list(r)): the object disagrees with itself, so .index(), .count(), in, len() and indexing give inconsistent answers for the same range.""")

P['ct435'] = (CT, """cachedmethod class access loses the explicitly supplied instance

Calling an instance method decorated with `cachedmethod` through its class raises AttributeError, even when the instance is explicitly supplied. This worked in cachetools 6.2.0 and fails on 7.2.1.

Expected: Example.value(example, 3) should behave like example.value(3), including using the instance's cache. This is ordinary instance-method access, not @classmethod usage.

Actual: the instance call returns 6. The class call raises AttributeError: 'NoneType' object has no attribute 'cache'.

from cachetools import Cache, cachedmethod

class Example:
    def __init__(self):
        self.cache = Cache(2)

    @cachedmethod(lambda self: self.cache)
    def value(self, number):
        return number * 2

example = Example()
print(example.value(3))
print(Example.value(example, 3))""")

P['pm1643'] = (PM, """HTML comment inside inline raw HTML creates malformed output

This Markdown:

<picture>
  <!-- TODO: what the heck? -->
  <source media="(prefers-color-scheme: dark)" srcset="../images/example.svg">
  <img alt="Example" src="../images/example.svg">
</picture>

renders as:

<p><picture>
  <!-- TODO: what the heck? --></p>
<p><source media="(prefers-color-scheme: dark)" srcset="../images/example.svg">
  <img alt="Example" src="../images/example.svg">
</picture></p>

Note the insertion of </p> ... <p> in the middle of the <picture> ... </picture> block immediately after the comment. Without the comment the block stays in one paragraph.""")

P['pp653'] = (PP, """match_previous_expr fails on nested and repeated matches

match_previous_expr only works for the simplest case. With an opening tag {name} matched by an expression and the closing tag {/name} built with match_previous_expr from it:

| input | expected | actual |
|---|---|---|
| {a}xx{/a} | match | match |
| {a}{b}xx{/b}{/a} | match | fails |
| two sequential pairs, a:a b:b under OneOrMore | match | fails |
| reparsing valid input after one failed parse | match | fails |

Once the expression has matched once, later matches fail, and a parser that failed once on bad input no longer accepts valid input.""")

P['mdit1201'] = (MDIT, """Unclosed link/image label suppresses a later inline code span

An unclosed link or image label ([ / ![) earlier on a line causes a later, valid inline code span to be rendered as literal text.

Input:

[foo `bar` baz`

Output:

markdown-it 15.0.0:   <p>[foo `bar` baz`</p>          (code span dropped, all literal)
CommonMark reference: <p>[foo <code>bar</code> baz`</p>

The same happens for image labels and for the default/zero presets:

![alt `code` x`
markdown-it:  <p>![alt `code` x`</p>
reference:    <p>![alt <code>code</code> x`</p>

Minimal trigger: [`a`b`

Code spans bind more tightly than links (CommonMark 0.31.2), so this is a spec divergence on valid input.""")

P['jy791'] = (YAML, """Sequence parsing in version 5 fails

Since version 5 this rather simple YAML no longer parses correctly:

abc: 5
cba:
  - Xyz
  - Zyx

YAMLException: end of the stream or a document separator is expected (2:1)

 1 | abc: 5
 2 | cba:
-----^
 3 |   - Xyz
 4 |   - Zyx

Update from the reporter: this only happens if a BOM is present at the start of the file, e.g.
"\\uFEFFabc: 5\\ncba:\\n  - Xyz\\n  - Zyx\\n"
The same text without the BOM works fine:
"abc: 5\\ncba:\\n  - Xyz\\n  - Zyx\\n\"""")

P['mk4059'] = (MK, """Emphasis is lost in the text of a rejected reference link

Expectation (what commonmark 0.31.2 returns):

[foo *bar [baz](/url) qux*][ref]

[ref]: /uri

<p>[foo <em>bar <a href="/url">baz</a> qux</em>]<a href="/uri">ref</a></p>

Result in marked:

<p>[foo *bar <a href="/url">baz</a> qux*]<a href="/uri">ref</a></p>

The asterisks are printed as text. The reference link and the inner link are both right, only the emphasis is gone. Same with _, with **, and when the inner link is a reference link instead of an inline one, which is CommonMark example 533. The trigger is ordinary prose: a reference link whose text happens to hold another link.""")

P['mk4051'] = (MK, """A link inside link text produces nested links

CommonMark 6.3: "Links may not contain other links, at any level of nesting." When a link's text contains a link, the outer brackets are literal text and the inner link wins. Both commonmark 0.31.2 and markdown-it 15 return:

<p>[foo <a href="/uri">bar</a>](/uri)</p>

Result in marked:

marked.parse('[foo [bar](/uri)](/uri)');
// <p><a href="/uri">foo <a href="/uri">bar</a></a></p>

marked.parse('[foo [bar](/uri)][ref]\\n\\n[ref]: /uri');
// <p><a href="/uri">foo <a href="/uri">bar</a></a></p>

The output is nested <a> elements, which is invalid HTML. This is CommonMark examples 518, 519 and 532.""")

OUT = '/home/claude/b15/hard/prompts'
os.makedirs(OUT, exist_ok=True)
allp = {}
for k, (meta, rep) in P.items():
    t = TPL.format(report=rep, **meta)
    open(f'{OUT}/{k}.txt', 'w', encoding='utf-8', newline='\n').write(t)
    allp[k] = t
json.dump(allp, open('/home/claude/b15/hard/prompts_hard.json', 'w'), ensure_ascii=False)
print(sorted(allp))
