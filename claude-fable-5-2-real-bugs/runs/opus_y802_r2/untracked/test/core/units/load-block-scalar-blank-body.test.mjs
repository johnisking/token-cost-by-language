import { describe, it } from 'node:test'

import assert from 'node:assert'
import { load } from 'js-yaml'

describe('block scalar with a whitespace-only body followed by a less indented line', () => {
  it('ends at the less indented sequence entry', () => {
    const source = [
      'a:',
      '  oneOf:',
      '    - type: string',
      '      example: |+',
      ' '.repeat(8),
      '    - type: array',
      ''
    ].join('\n')

    assert.deepStrictEqual(load(source), {
      a: { oneOf: [{ type: 'string', example: '\n' }, { type: 'array' }] }
    })
  })

  for (const [indicator, expected] of [['|+', '\n'], ['>+', '\n'], ['|', ''], ['>', ''], ['|-', '']]) {
    it(`ends at a sibling key (${indicator})`, () => {
      assert.deepStrictEqual(
        load(`a:\n  x: ${indicator}\n      \n  y: 1\n`),
        { a: { x: expected, y: 1 } }
      )
    })
  }

  it('still rejects leading blank lines more indented than the content', () => {
    assert.throws(() => load('x: |\n    \n  a\n'), /bad indentation/)
  })
})
