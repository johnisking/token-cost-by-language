import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { load } from 'js-yaml'

describe('core/units/block-scalar-blank-body', () => {
  const expected = {
    '|+': '\n',
    '>+': '\n',
    '|': '',
    '>': '',
    '|-': ''
  }

  for (const [indicator, value] of Object.entries(expected)) {
    it(`whitespace-only body ended by a less indented sequence entry (${indicator})`, () => {
      const source = [
        'a:',
        '  oneOf:',
        '    - type: string',
        '      example: ' + indicator,
        ' '.repeat(8),
        '    - type: array',
        ''
      ].join('\n')
      assert.deepStrictEqual(load(source), {
        a: { oneOf: [{ type: 'string', example: value }, { type: 'array' }] }
      })
    })

    it(`whitespace-only body ended by a sibling key (${indicator})`, () => {
      assert.deepStrictEqual(load(`a:\n  x: ${indicator}\n      \n  y: 1\n`), {
        a: { x: value, y: 1 }
      })
    })
  }

  it('still rejects leading blank lines more indented than the first content line', () => {
    assert.throws(() => load('a: |\n    \n  x\n'), /bad indentation/)
    assert.throws(() => load('a:\n  b: |\n        \n      x\n'), /bad indentation/)
  })
})
