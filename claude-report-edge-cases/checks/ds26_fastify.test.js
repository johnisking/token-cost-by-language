'use strict'
// ds26 split checks for fastify#7073, copied from the maintainers' fix tests. Names: <bug>__<R|U>_<what>.
// Copied into test/ when scoring.
const { test } = require('node:test')
const diagnostics = require('node:diagnostics_channel')
const Fastify = require('..')

function withChannel (t) {
  const seen = {}
  const channel = diagnostics.channel('tracing:fastify.request.handler:error')
  const handler = (msg) => { seen.status = msg.reply.statusCode; seen.error = msg.error }
  channel.subscribe(handler)
  t.after(() => channel.unsubscribe(handler))
  return seen
}

test('fy7073__R_subscriber_async_handler_600_answers_500', async (t) => {
  const fastify = Fastify()
  t.after(() => fastify.close())
  withChannel(t)
  fastify.get('/', async () => { const err = new Error('custom invalid status'); err.statusCode = 600; throw err })
  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
})

test('fy7073__U_subscriber_sees_500_and_original_error', async (t) => {
  const fastify = Fastify()
  t.after(() => fastify.close())
  const seen = withChannel(t)
  fastify.get('/', async () => { const err = new Error('custom invalid status'); err.statusCode = 600; throw err })
  const res = await fastify.inject('/')
  t.assert.strictEqual(seen.status, 500)
  t.assert.strictEqual(seen.status, res.statusCode)
  t.assert.strictEqual(seen.error.message, 'custom invalid status')
})

test('fy7073__R_default_handler_600_answers_500', async (t) => {
  const fastify = Fastify()
  t.after(() => fastify.close())
  const err = new Error('winter is coming')
  err.statusCode = 600
  fastify.get('/', () => Promise.reject(err))
  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
})

test('fy7073__U_default_handler_600_body_says_500', async (t) => {
  const fastify = Fastify()
  t.after(() => fastify.close())
  const err = new Error('winter is coming')
  err.statusCode = 600
  fastify.get('/', () => Promise.reject(err))
  const res = await fastify.inject('/')
  t.assert.deepStrictEqual(JSON.parse(res.payload), { error: 'Internal Server Error', message: 'winter is coming', statusCode: 500 })
})
