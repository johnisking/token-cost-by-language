import test from 'node:test'
import assert from 'node:assert/strict'
import * as yaml from '../../dist/js-yaml.mjs'

test('BOM at stream start does not break block sequences', () => {
  const text = '﻿abc: 5\ncba:\n  - Xyz\n  - Zyx\n'
  assert.deepEqual(yaml.load(text), { abc: 5, cba: ['Xyz', 'Zyx'] })
})
