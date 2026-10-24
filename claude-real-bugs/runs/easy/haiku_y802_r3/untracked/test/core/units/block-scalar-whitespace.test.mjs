import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { load } from 'js-yaml'

describe('block scalar with a whitespace-only body', () => {
  const spaces = ' '.repeat(8)

  it('ends at a less indented sibling of the parent sequence', () => {
    const source = [
      'a:',
      '  oneOf:',
      '    - type: string',
      '      example: |+',
      spaces,
      '    - type: array',
      ''
    ].join('\n')

    assert.deepEqual(load(source), {
      a: { oneOf: [{ type: 'string', example: '\n' }, { type: 'array' }] }
    })
  })

  it('ends at a less indented sibling key with every block style', () => {
    for (const header of ['|', '|+', '>', '>+']) {
      const source = ['a:', `  x: ${header}`, '      ', '  y: 1', ''].join('\n')

      assert.deepEqual(load(source), { a: { x: header.endsWith('+') ? '\n' : '', y: 1 } }, header)
    }
  })

  it('still rejects a whitespace-only line wider than the first content line', () => {
    assert.throws(
      () => load(['a: |', '      ', '   text', ''].join('\n')),
      /bad indentation of a mapping entry/
    )
  })
})
