import assert from 'node:assert'
import { describe, it } from 'node:test'

const { default: markdownit } = await import('../../src/index.ts')

describe('backtick code spans after an unclosed link label', () => {
  it('renders a code span after an unclosed link label', () => {
    const md = markdownit('commonmark')
    assert.strictEqual(md.render('[foo `bar` baz`'), '<p>[foo <code>bar</code> baz`</p>\n')
  })

  it('renders a code span after an unclosed image label', () => {
    const md = markdownit('commonmark')
    assert.strictEqual(md.render('![alt `code` x`'), '<p>![alt <code>code</code> x`</p>\n')
  })

  it('renders a code span with the default preset', () => {
    const md = markdownit()
    assert.strictEqual(md.render('![alt `code` x`'), '<p>![alt <code>code</code> x`</p>\n')
  })

  it('renders a code span after a minimal unclosed link label', () => {
    const md = markdownit('commonmark')
    assert.strictEqual(md.render('[`a`b`'), '<p>[<code>a</code>b`</p>\n')
  })

  it('keeps unmatched backticks literal', () => {
    const md = markdownit('commonmark')
    assert.strictEqual(md.render('[foo `bar baz'), '<p>[foo `bar baz</p>\n')
  })
})
