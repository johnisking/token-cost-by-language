import { Marked } from '../../lib/marked.esm.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('links inside link text', () => {
  const parse = (md) => new Marked().parse(md).trim();

  it('inline link in inline link', () => {
    assert.strictEqual(parse('[foo [bar](/uri)](/uri)'), '<p>[foo <a href="/uri">bar</a>](/uri)</p>');
  });

  it('inline link in reference link', () => {
    assert.strictEqual(
      parse('[foo [bar](/uri)][ref]\n\n[ref]: /uri'),
      '<p>[foo <a href="/uri">bar</a>]<a href="/uri">ref</a></p>',
    );
  });

  it('reference link nested in emphasis in reference link', () => {
    assert.strictEqual(
      parse('[foo *bar [baz][ref]*][ref]\n\n[ref]: /uri'),
      '<p>[foo <em>bar <a href="/uri">baz</a></em>]<a href="/uri">ref</a></p>',
    );
  });

  it('link after the literal closing bracket still works', () => {
    assert.strictEqual(parse('[a [b](c)][d](e)'), '<p>[a <a href="c">b</a>]<a href="e">d</a></p>');
  });

  it('link inside image inside link', () => {
    assert.strictEqual(parse('[![[foo](a)](b)](c)'), '<p>[<img src="b" alt="foo">](c)</p>');
  });

  it('keeps images, links in image text and plain links working', () => {
    assert.strictEqual(
      parse('[![moon](moon.jpg)](/uri) ![x [y](z)](w) [a *b*](c)'),
      '<p><a href="/uri"><img src="moon.jpg" alt="moon"></a> <img src="w" alt="x y"> <a href="c">a <em>b</em></a></p>',
    );
  });

  it('produces flat tokens', () => {
    const tokens = new Marked().lexer('x [foo [bar](/uri)](/uri)')[0].tokens;
    assert.deepStrictEqual(tokens.map(t => [t.type, t.raw]), [
      ['text', 'x [foo '],
      ['link', '[bar](/uri)'],
      ['text', '](/uri)'],
    ]);
  });

  it('handles deep nesting quickly', () => {
    const start = Date.now();
    parse('[a '.repeat(2000) + '[x](y)' + '](y)'.repeat(2000));
    assert.ok(Date.now() - start < 2000);
  });
});
