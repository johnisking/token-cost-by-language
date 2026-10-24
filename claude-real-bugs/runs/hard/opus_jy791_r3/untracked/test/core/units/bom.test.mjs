import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { load } from 'js-yaml'

const BOM = String.fromCharCode(0xFEFF)

describe('core/units/bom', () => {
  it('BOM does not count as indentation of the first line', () => {
    const expected = { abc: 5, cba: ['Xyz', 'Zyx'] }
    assert.deepStrictEqual(load(BOM + 'abc: 5\ncba:\n  - Xyz\n  - Zyx\n'), expected)
    assert.deepStrictEqual(load(BOM + 'abc: 5\ncba: 1\n'), { abc: 5, cba: 1 })
  })

  it('BOM before a document start marker', () => {
    assert.deepStrictEqual(load(BOM + '--- foo\n'), 'foo')
  })
})
