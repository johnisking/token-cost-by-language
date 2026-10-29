"""ds26 prompts for the 14 new bugs (written 2026-10-25, before any run).
Reports keep the user's symptom, reproduction and expected result. Cause analysis, code locations,
proposed fixes, links to fix commits and AI-disclosure notes are removed. K-group prompts are reused
unchanged from dataset 25 (b15/prompts.json and b15/hard/prompts_hard.json).
Condition suffixes C2/C3 are appended by the runner, never edited per bug."""
import json, os

TPL = ('The current folder is a checkout of {proj}. A user reported the bug below. Find the cause in the source code and fix it in '
       '{src}, without breaking any other behaviour. {deps}, and you may run commands in this folder to check your work, '
       'for example {cmds}. You may add tests. Do not install packages and do not use the network. Change the files in place and finish.'
       '\n\nBug report:\n"""\n{report}\n"""\n')
C2 = ('\n\nBefore changing code, list the inputs and variants this report does not mention but the fix must also handle. '
      'Write tests for them first, then fix.')
C3 = C2 + ' Read the existing tests for the code you change before you start.'

NODE = 'Dependencies are already installed in node_modules'
PYD = 'Dependencies are already installed in a virtual environment in .venv'
CT = dict(proj='cachetools, the Python caching library (sources in src/cachetools/, tests in tests/)', src='src/cachetools/', deps=PYD,
          cmds='.venv/Scripts/python -m pytest -q tests/test_cachedmethod.py')
ZOD = dict(proj='zod, the TypeScript schema library (monorepo; the library source is in packages/zod/src/, tests next to it in packages/zod/src/v4/classic/tests/)',
           src='packages/zod/src/', deps=NODE,
           cmds='node node_modules/vitest/vitest.mjs run --typecheck.enabled=false packages/zod/src/v4/classic/tests/record.test.ts (any test file can be given)')
PM = dict(proj='Python-Markdown (sources in markdown/, tests in tests/)', src='markdown/', deps=PYD,
          cmds='.venv/Scripts/python -m pytest -q tests/test_syntax/inline/test_code.py')
FY = dict(proj='fastify, the Node.js web framework (sources in lib/ and fastify.js, tests in test/)', src='lib/', deps=NODE,
          cmds='node --test test/reply-error.test.js')
PQ = dict(proj='p-queue, the promise queue library (TypeScript sources in source/, tests in test/)', src='source/', deps=NODE,
          cmds='node --import=tsx/esm --test test/basic.ts')
ANY = dict(proj='AnyIO, the Python async library (sources in src/anyio/, tests in tests/)', src='src/anyio/', deps=PYD,
           cmds='.venv/Scripts/python -m pytest -q tests/test_sockets.py -k "TestTCPStream"')
DU = dict(proj='python-dateutil (sources in src/dateutil/, tests in tests/)', src='src/dateutil/', deps=PYD,
          cmds='.venv/Scripts/python -m pytest -q tests/test_rrule.py')
UN = dict(proj='undici, the Node.js HTTP client (sources in lib/, tests in test/)', src='lib/', deps=NODE,
          cmds='node --test test/pool.js')

P = {}
P['ct443'] = (CT, """@cachedmethod decorator breaks mock autospec

Starting in version 7.2.2, any call to a method of an autospec mock where the method in question is wrapped with @cachedmethod will raise a TypeError. This problem did not occur in versions <=7.2.1.

Expected result: calls to an autospec mock method wrapped with @cachedmethod behave identically to calls made to an undecorated method.

Actual result: calls to methods on autospec mocks decorated with @cachedmethod fail with TypeError: missing a required argument ...

from unittest import mock
from cachetools import cachedmethod

class Service:
    def __init__(self):
        self.cache = {}

    def plain(self, key):
        return key

    @cachedmethod(lambda self: self.cache)
    def cached(self, key):
        return key

mock_service = mock.create_autospec(Service).return_value
mock_service.plain("key")   # No error observed
mock_service.cached("key")  # TypeError: missing a required argument: 'key'""")

P['ct446'] = (CT, """Class-access @cachedmethod rejects keyword instance arguments

@cachedmethod class access rejects a receiver supplied by keyword, even though the wrapped method's signature accepts it:

from cachetools import cachedmethod

class Cached:
    def __init__(self):
        self.cache = {}

    @cachedmethod(lambda obj: obj.cache)
    def get(self, value):
        return value

obj = Cached()
print(Cached.get(self=obj, value=1))

With cachetools 7.2.4 this raises:
TypeError: Cannot call @cachedmethod through the class without an instance

The positional form Cached.get(obj, value=1) and bound form obj.get(value=1) both return 1. The same keyword call also returns 1 with cachetools 6.2.6.

Expected: class calls can use the receiver name exposed by inspect.signature(Cached.get), while a positional-only receiver continues to require a positional argument. Missing-instance calls should still fail.""")

P['ct440'] = (CT, """Failed TTL expiration calculation leaves an unusable cache entry

If computing the expiration time of a new TTLCache entry raises, the rejected entry remains in the cache. A subsequent membership check raises TypeError instead of reporting that the entry was not inserted.

The documented datetime/timedelta timer combination can produce this without an invalid type, for example when the expiration falls beyond datetime's range.

Expected result: an insertion whose expiration cannot be computed should raise the original arithmetic error without adding an unusable entry.

Actual result: the insertion raises OverflowError, then checking membership raises TypeError: '<' not supported between instances of 'datetime.datetime' and 'NoneType'.

from datetime import datetime, timedelta
from cachetools import TTLCache

cache = TTLCache(maxsize=1, ttl=timedelta(days=1), timer=lambda: datetime.max)
try:
    cache['overflow'] = 1
except OverflowError:
    pass
print('overflow' in cache)  # raises TypeError""")

P['z6641'] = (ZOD, """z.record skips an own __proto__ key without running the key schema

.strict() reports an own __proto__ key. The z.record path still skips it silently: with a key schema such as a refinement, z.record never runs the key schema on an own __proto__ key. It drops the key silently. Every other key that fails the key schema is reported as invalid_key.

import { z } from 'zod'; // 4.6.5

const locale = z.string().refine((l) => ['fr', 'de'].includes(l));
const record = z.record(locale, z.string());

record.safeParse(JSON.parse('{"xx": "x", "fr": "y"}'));
// fails: invalid_key at ["xx"]

record.safeParse(JSON.parse('{"__proto__": "x", "fr": "y"}'));
// succeeds with { fr: "y" }; the "__proto__" entry is dropped without an issue

JSON.parse creates "__proto__" as an own property, so this is what any JSON body can carry. The pollution defense works: the output prototype is untouched. The issue is only that an invalid key is accepted instead of reported.

Expected: run the key schema on __proto__ like any other key and report invalid_key when it fails. Keep not writing it to the output.""")

P['z6659'] = (ZOD, """v4.6.6: a union whose array option exceeds .max() now reports invalid_union instead of too_big

Since 4.6.6, an array that exceeds .max() inside a union is reported as invalid_union rather than the array's too_big. In 4.6.5 it was too_big.

import { z } from 'zod';

const schema = z.union([z.array(z.string()).max(2), z.string()]);
const result = schema.safeParse(['a', 'b', 'c']);
console.log(result.error?.issues.map(({ code, origin, path }) => ({ code, origin, path })));
// 4.6.5: [{ code: 'too_big', origin: 'array', path: [] }]
// 4.6.6: [{ code: 'invalid_union', path: [] }] (errors holds the array's too_big and the string's invalid_type)

.min() is not affected.

Impact: code that maps issues to messages, for instance a "too many items" form error, gets a generic "Invalid input" after a patch upgrade. A common shape this hits is "a list, or a single value coerced to a list", written as a union.

Expected: keep reporting too_big from the array option when it is the only option whose type matched, as before.""")

P['pm1668'] = (PM, """Unmatched backtick runs swallow text in 3.11 (inline code)

Since 3.11, a backtick string that has no closing string of the same length causes the text that follows it to be dropped. In 3.10.3 the backticks are output literally and no text is lost.

Input:
a ``` b ````` c

Actual output (3.11, 3.11.1, 3.11.2 and current master):
<p>a <code></code> c</p>

Expected output (3.10.3):
<p>a ``` b ````` c</p>

Two more inputs that show the same behavior (input, then 3.11.2 output, then 3.10.3 output):

`a`` b
<p><code></code> b</p>
<p>`a`` b</p>

```abc`````
<p><code>c</code></p>
<p>```abc`````</p>

In each case the text after the opening backticks is lost, so the rendered document no longer contains content that is in the source.

According to the syntax rules a code span is opened and closed by backtick strings of equal length; a backtick string that is not matched should be output literally, as 3.10.3 did.

To reproduce, run markdown.markdown("a ``` b ````` c") with no extensions.""")

P['fy7073'] = (FY, """An error with statusCode >= 600 becomes an unhandled rejection when a tracing:fastify.request.handler subscriber exists (5.12.5)

Versions: fastify 5.12.5, Node 24.

With a subscriber on the handler-error diagnostics channel, an async handler or an async preHandler hook that throws Object.assign(new Error('x'), { statusCode: 600 }) ends the process with an unhandled rejection; the request is never answered. Without a subscriber the same request is answered.

Separately, with the default error handler, 600 is sent on the wire as the response status, and 1000 or more ends the process with ERR_HTTP_INVALID_STATUS_CODE even with no subscriber at all.

Reproduction:

const { subscribe } = require('node:diagnostics_channel')
const fastify = require('fastify')()
subscribe('tracing:fastify.request.handler:error', () => {})
fastify.get('/', async () => { throw Object.assign(new Error('x'), { statusCode: 600 }) })
fastify.listen({ port: 0 }).then((address) => fetch(address))

Expected: a 500 reply and a running process.""")

P['pq256'] = (PQ, """Abort during task setup is missed before the running listener is registered

With p-queue 9.3.4 / Node 24.14.1, cancellation is missed if the task aborts its signal synchronously before returning a pending operation:

import PQueue from 'p-queue';
import {setImmediate} from 'node:timers/promises';

const queue = new PQueue({concurrency: 1});
const controller = new AbortController();
let release;
const gate = new Promise(resolve => { release = resolve; });
let outcome = 'pending';
let nextStarted = false;
const task = queue.add(() => {
  controller.abort(new Error('cancelled'));
  return gate;
}, {signal: controller.signal});
const handled = task.then(() => { outcome = 'fulfilled'; }, () => { outcome = 'rejected'; });
const next = queue.add(() => { nextStarted = true; });
await setImmediate();
console.log({outcome, nextStarted, pending: queue.pending});
release();
await Promise.all([handled, next]);

Actual before releasing the operation: {outcome: 'pending', nextStarted: false, pending: 1}.
Expected: the .add() promise rejects and releases its slot, as it does if the same abort is scheduled in a microtask. This does not require stopping the operation itself; the example releases it explicitly.""")

P['pq255'] = (PQ, """Adding tasks from an active listener exceeds the concurrency limit

With p-queue 9.3.3 and Node 24.14.1, adding a task from an active listener can start two task bodies despite concurrency: 1.

import PQueue from 'p-queue';

const queue = new PQueue({concurrency: 1});
let release;
const gate = new Promise(resolve => { release = resolve; });
let running = 0;
let peak = 0;
const work = async () => {
  running++;
  peak = Math.max(peak, running);
  await gate;
  running--;
};
let nested;
queue.once('active', () => { nested = queue.add(work); });
const first = queue.add(work);
console.log(JSON.stringify({peak, pending: queue.pending, concurrency: queue.concurrency}));
release();
await Promise.all([first, nested]);
await queue.onIdle();

Expected: peak and pending stay at 1. Actual: {"peak":2,"pending":2,"concurrency":1}. Both tasks are held on the same gate, so this is simultaneous execution, not just an event count.""")

P['ct437'] = (CT, """cachedmethod super() lookups bypass overrides or recurse

A @cachedmethod method reached through super() from an overriding method misbehaves. It can either bypass an undecorated override after its first call or, with a decorated override, recurse.

Expected result: both calls to Child().get(3) on the same instance return 7. A decorated override can also call the cached base implementation without recursion. Parent and child wrappers keep their own cache statistics and condition state.

Actual result: the undecorated override returns 7, then 6. The decorated override raises RecursionError.

from cachetools import cachedmethod

class Base:
    def __init__(self):
        self.base_cache = {}
        self.child_cache = {}

    @cachedmethod(lambda self: self.base_cache)
    def get(self, value):
        return value * 2

class Child(Base):
    def get(self, value):
        return super().get(value) + 1

child = Child()
print(child.get(3))  # 7
print(child.get(3))  # 6; expected 7

class DecoratedChild(Base):
    @cachedmethod(lambda self: self.child_cache)
    def get(self, value):
        return super().get(value) + 1

DecoratedChild().get(3)  # RecursionError; expected 7""")

P['any1273'] = (ANY, """concurrent anyio.aclose_forcefully fails to block until socket is closed on asyncio

When two tasks call aclose_forcefully() on the same TCP stream at the same time, one of them returns before the socket is actually closed. This test fails on asyncio:

    async def test_concurrent_aclose_forcefully_returns_before_socket_closes(
        self, server_addr: tuple[str, int]
    ) -> None:
        stream = await connect_tcp(*server_addr)
        raw_socket = stream.extra(SocketAttribute.raw_socket)
        fds: list[int] = []

        async def do_aclose() -> None:
            await aclose_forcefully(stream)
            fds.append(raw_socket.fileno())

        async with create_task_group() as tg:
            tg.start_soon(do_aclose)
            tg.start_soon(do_aclose)

        assert fds == [-1, -1]

(added to class TestTCPStream in tests/test_sockets.py, with aclose_forcefully imported from anyio)

It gets:
FAILED tests/test_sockets.py::TestTCPStream::test_concurrent_aclose_forcefully_returns_before_socket_closes[asyncio-ipv4] - assert [15, -1] == [-1, -1]
FAILED tests/test_sockets.py::TestTCPStream::test_concurrent_aclose_forcefully_returns_before_socket_closes[asyncio-ipv6] - assert [15, -1] == [-1, -1]
(same for the asyncio+eager variants)""")

P['du1369'] = (DU, """pickling & deepcopy of rruleset and rrule with cache

If an rruleset or rrule is created with cache=True, it cannot be pickled, and copy.deepcopy() of it does not work either. Without cache=True both work.

from dateutil.rrule import rrule, rruleset, DAILY
import pickle, copy, datetime

r = rrule(DAILY, count=3, dtstart=datetime.datetime(2026, 1, 1), cache=True)
pickle.dumps(r)      # fails
copy.deepcopy(r)     # fails

rs = rruleset(cache=True)
rs.rrule(rrule(DAILY, count=3, dtstart=datetime.datetime(2026, 1, 1)))
pickle.dumps(rs)     # fails

I currently work around it by registering copyreg reducers that rebuild the objects from their options. It would be much nicer if rrule and rruleset with cache=True could simply be pickled and deep-copied.

Context: icalendar stores recurrence rules this way and needs to pickle and copy them.""")

P['un5981'] = (UN, """Pool loses caller's AsyncLocalStorage context for queued HTTPS requests (Undici 8)

Reproduction:

import { AsyncLocalStorage } from 'node:async_hooks'
import { subscribe } from 'node:diagnostics_channel'

const storage = new AsyncLocalStorage()

subscribe('undici:request:create', ({ request }) => {
  console.log(request.path, '->', storage.getStore())
})

await Promise.all(
  ['a', 'b', 'c'].map((name) =>
    storage.run(name, () => fetch(`https://example.com/${name}`)),
  ),
)

Expected:
/a -> a
/b -> b
/c -> c
Every request dispatches in the async context of its own fetch() / request() caller, whether it was sent immediately or queued.

Actual:
/a -> a
/b -> a
/c -> a

Same with request() from the undici package. Only https: origins are affected. http://example.com prints a, b, c correctly on the same version.

Discovered in a test failure in MSW after Undici changes in Node.js v26 (passes in v22 and v24).""")

P['any1364'] = (ANY, """connect_tcp() leaks a connected socket when an enclosing scope is cancelled after the connect succeeds

anyio.connect_tcp() can leak a connected socket when an enclosing cancel scope expires after a connection attempt has succeeded but before connect_tcp returns. The caller sees TimeoutError/cancellation, while a fully connected socket stays open and registered with the event loop. The peer sees an idle connection that never sends a request and never closes.

This is reachable through httpx/httpcore, whose anyio backend wraps the call as with anyio.fail_after(connect_timeout): await anyio.connect_tcp(...). We hit it in CI under CPU starvation: an asyncio test server's wait_closed() then hung because the orphaned client socket was never closed.

The window is narrow, so this widens it deterministically: the backend's connect_tcp completes and then blocks the loop past the caller's deadline.

import asyncio
import time

import anyio
from anyio._core import _sockets


async def main() -> None:
    open_server_side = 0

    async def serve(reader, writer):
        nonlocal open_server_side
        open_server_side += 1
        await reader.read()  # returns only once the client closes its socket
        open_server_side -= 1
        writer.close()

    server = await asyncio.start_server(serve, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]

    backend = _sockets.get_async_backend()
    real = backend.connect_tcp

    async def connect_then_stall(*args, **kwargs):
        stream = await real(*args, **kwargs)
        time.sleep(0.3)  # the connect succeeded; the caller's deadline passes meanwhile
        return stream

    backend.connect_tcp = connect_then_stall
    try:
        with anyio.fail_after(0.1):
            await anyio.connect_tcp("127.0.0.1", port)
    except TimeoutError:
        print("connect_tcp raised TimeoutError")
    finally:
        backend.connect_tcp = real

    await anyio.sleep(1)
    print("server-side connections still open:", open_server_side)  # 1: nobody holds the client socket
    server.close()
    try:
        await asyncio.wait_for(server.wait_closed(), 2)
    except TimeoutError:
        print("server.wait_closed() hangs on the orphaned connection")


asyncio.run(main())

Output on 4.15.1 and 4.14.2:
connect_tcp raised TimeoutError
server-side connections still open: 1
server.wait_closed() hangs on the orphaned connection

Expected: the connected socket is closed when connect_tcp is cancelled.""")

GROUP = {'ct443': 'N', 'ct446': 'N', 'ct440': 'N', 'z6641': 'N', 'z6659': 'N', 'pm1668': 'N', 'fy7073': 'N', 'pq256': 'N',
         'pq255': 'H', 'ct437': 'H', 'any1273': 'H', 'du1369': 'H', 'un5981': 'H', 'any1364': 'H'}

if __name__ == '__main__':
    out = {k: {'group': GROUP[k], 'prompt': TPL.format(report=r, **t)} for k, (t, r) in P.items()}
    json.dump(out, open(os.path.join(os.path.dirname(__file__), 'prompts_ds26.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(out), 'prompts')
