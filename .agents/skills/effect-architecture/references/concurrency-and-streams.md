# Concurrency, Streams, and Resource Management

## Table of Contents
1. [Fibers: Lightweight Concurrency](#fibers)
2. [Basic Concurrency Operators](#basic-concurrency-operators)
3. [Semaphore: Limiting Concurrency](#semaphore)
4. [Queue: Work Distribution](#queue)
5. [PubSub: Event Broadcasting](#pubsub)
6. [Deferred: One-Shot Synchronization](#deferred)
7. [Ref and SynchronizedRef: Shared State](#ref)
8. [SubscriptionRef: Reactive State](#subscriptionref)
9. [Stream: Lazy Sequences](#stream)
10. [Sink: Stream Consumers](#sink)
11. [Scope and Resource Management](#scope)
12. [Request Batching](#request-batching)

---

## Fibers

Fibers are Effect's lightweight concurrency primitive. They are cooperatively scheduled, much cheaper than OS threads, and have structured lifetimes — a child fiber cannot outlive its parent.

### Forking a fiber

```typescript
const program = Effect.gen(function* () {
  // Fork runs the effect in a separate fiber
  const fiber = yield* Effect.fork(longRunningTask)

  // Do other work while the fiber runs...
  yield* doOtherWork()

  // Join waits for the fiber to complete and returns its result
  const result = yield* Fiber.join(fiber)
  return result
})
```

### Structured concurrency guarantees

When the parent fiber completes or is interrupted, ALL child fibers are automatically interrupted. This prevents goroutine leaks and orphaned async work.

```typescript
const program = Effect.gen(function* () {
  yield* Effect.fork(backgroundJob1) // automatically cleaned up
  yield* Effect.fork(backgroundJob2) // automatically cleaned up
  yield* mainWork()
  // When mainWork completes, both background fibers are interrupted
})
```

### Daemon fibers

To fork a fiber that outlives its parent (rare, use with caution):

```typescript
const daemon = yield* Effect.forkDaemon(longLivedProcess)
// This fiber lives until the entire application exits
```

### Interruption

```typescript
const fiber = yield* Effect.fork(longTask)
// Later:
yield* Fiber.interrupt(fiber) // signal the fiber to stop
// The fiber's finalizers (acquireRelease) still run on interruption
```

---

## Basic Concurrency Operators

### Run effects in parallel

```typescript
// All — run all, collect all results (fails fast on first error)
const [user, orders, settings] = yield* Effect.all(
  [getUser(id), getOrders(id), getSettings(id)],
  { concurrency: "unbounded" },
)

// forEach — map over items with concurrency control
yield* Effect.forEach(
  userIds,
  (id) => processUser(id),
  { concurrency: 10 }, // max 10 concurrent
)

// Race — first to succeed wins, others are interrupted
const fastest = yield* Effect.race(fetchFromCDN1, fetchFromCDN2)
```

### Concurrency options

Most concurrent operators accept a `concurrency` option:

| Value | Behavior |
|---|---|
| `1` (default) | Sequential — one at a time |
| `n` (number) | At most n concurrent |
| `"unbounded"` | All at once, no limit |
| `"inherit"` | Use the concurrency from the surrounding scope |

```typescript
// Process 100 items, 5 at a time
yield* Effect.forEach(items, processItem, { concurrency: 5 })
```

---

## Semaphore

A semaphore limits the number of concurrent permits. This is the **bulkhead pattern** as a primitive.

```typescript
const program = Effect.gen(function* () {
  const semaphore = yield* Effect.makeSemaphore(3) // max 3 concurrent

  // Each withPermits acquires before running, releases after
  yield* Effect.forEach(
    requests,
    (req) => semaphore.withPermits(1)(handleRequest(req)),
    { concurrency: "unbounded" },
  )
})
```

Use semaphores when you need to protect a shared resource from overload — database connection pools, rate-limited APIs, CPU-bound operations.

---

## Queue

A typed, backpressured work queue. Each item is consumed by exactly ONE consumer.

### Bounded queue (backpressure)

```typescript
const program = Effect.gen(function* () {
  const queue = yield* Queue.bounded<Job>(100) // max 100 items buffered

  // Producer — blocks if queue is full
  yield* Effect.fork(
    Effect.forever(
      getNextJob().pipe(Effect.flatMap((job) => Queue.offer(queue, job))),
    ),
  )

  // Consumer — blocks if queue is empty
  yield* Effect.fork(
    Effect.forever(
      Queue.take(queue).pipe(Effect.flatMap(processJob)),
    ),
  )
})
```

### Queue variants

| Type | Behavior when full |
|---|---|
| `Queue.bounded(n)` | Producer blocks until space available |
| `Queue.unbounded()` | Never blocks producer (may use unlimited memory) |
| `Queue.dropping(n)` | Newest items are silently dropped |
| `Queue.sliding(n)` | Oldest items are silently dropped |

---

## PubSub

Typed pub/sub for event broadcasting. Every subscriber receives every message.

```typescript
const program = Effect.gen(function* () {
  const bus = yield* PubSub.bounded<DomainEvent>(256)

  // Subscriber 1 — gets ALL events
  yield* Effect.fork(
    PubSub.subscribe(bus).pipe(
      Effect.andThen((sub) =>
        Effect.forEach(
          Queue.takeBetween(sub, 1, 100), // batch reads
          (events) => handleEvents(events),
        ),
      ),
    ),
  )

  // Subscriber 2 — also gets ALL events (independent)
  yield* Effect.fork(
    PubSub.subscribe(bus).pipe(
      Effect.andThen((sub) =>
        Stream.fromQueue(sub).pipe(
          Stream.runForEach((event) => logEvent(event)),
        ),
      ),
    ),
  )

  // Publish
  yield* PubSub.publish(bus, { type: "order.placed", orderId: "123" })
})
```

Key difference from Queue: **Queue** delivers each item to ONE consumer (work distribution). **PubSub** delivers each item to ALL subscribers (event broadcasting).

---

## Deferred

A one-shot synchronization primitive. One fiber can `complete` it, and other fibers `await` it.

```typescript
const program = Effect.gen(function* () {
  const deferred = yield* Deferred.make<string, Error>()

  // Fiber 1: waits for the value
  const waiter = yield* Effect.fork(Deferred.await(deferred))

  // Fiber 2: produces the value
  yield* Effect.fork(
    heavyComputation().pipe(
      Effect.flatMap((result) => Deferred.succeed(deferred, result)),
    ),
  )

  const value = yield* Fiber.join(waiter)
})
```

Think of it as a typed, fiber-safe `Promise.resolve`/`Promise` pair — but integrated into the Effect ecosystem with interruption and error handling.

---

## Ref

`Ref<A>` is mutable state that is safe to share across fibers. All operations are atomic.

```typescript
const program = Effect.gen(function* () {
  const counter = yield* Ref.make(0)

  yield* Effect.forEach(
    items,
    (item) =>
      processItem(item).pipe(
        Effect.tap(() => Ref.update(counter, (n) => n + 1)),
      ),
    { concurrency: 10 },
  )

  const total = yield* Ref.get(counter)
  yield* Effect.log(`Processed ${total} items`)
})
```

### SynchronizedRef

When the update itself is effectful (needs I/O), use `SynchronizedRef`:

```typescript
const cache = yield* SynchronizedRef.make<Map<string, User>>(new Map())

// updateEffect allows effectful updates (e.g., fetching data)
yield* SynchronizedRef.updateEffect(cache, (map) =>
  fetchUser(id).pipe(
    Effect.map((user) => new Map([...map, [id, user]])),
  ),
)
```

---

## SubscriptionRef

`SubscriptionRef` is a `Ref` that also provides a `Stream` of changes. Subscribers are notified every time the value changes.

```typescript
const program = Effect.gen(function* () {
  const state = yield* SubscriptionRef.make({ count: 0, status: "idle" })

  // Subscriber: reacts to every change
  yield* Effect.fork(
    Stream.runForEach(state.changes, (s) =>
      Effect.log(`State changed: count=${s.count}, status=${s.status}`),
    ),
  )

  // Mutations trigger subscriber
  yield* SubscriptionRef.update(state, (s) => ({ ...s, count: s.count + 1 }))
  yield* SubscriptionRef.update(state, (s) => ({ ...s, status: "active" }))
})
```

Use `SubscriptionRef` when other parts of the system need to **observe** state changes — dashboards, derived computations, audit logging.

---

## Stream

`Stream<A, E, R>` is a lazy, potentially infinite, typed, resource-safe sequence. It is to `AsyncGenerator` what `Effect` is to `Promise` — a massive upgrade in safety and composability.

### Creating streams

```typescript
// From values
const s1 = Stream.make(1, 2, 3)

// From an iterable
const s2 = Stream.fromIterable([1, 2, 3])

// From a paginated API
const s3 = Stream.paginateChunkEffect(
  undefined as string | undefined,
  (cursor) =>
    fetchPage(cursor).pipe(
      Effect.map(({ items, nextCursor }) => [
        Chunk.fromIterable(items),
        Option.fromNullable(nextCursor),
      ]),
    ),
)

// From a Queue or PubSub
const s4 = Stream.fromQueue(myQueue)

// Infinite stream
const s5 = Stream.repeat(Effect.sync(() => Math.random()))

// Ticks at intervals
const s6 = Stream.tick("1 second")
```

### Transforming streams

```typescript
const pipeline = myStream.pipe(
  Stream.map((x) => x * 2),
  Stream.filter((x) => x > 10),
  Stream.mapEffect((x) => validate(x)),              // effectful transform
  Stream.mapEffect((x) => process(x), { concurrency: 5 }), // concurrent
  Stream.take(100),                                    // limit
  Stream.grouped(10),                                  // batch into chunks of 10
  Stream.debounce("500 millis"),                       // debounce
  Stream.throttle({ units: 100, duration: "1 second", strategy: "enforce" }), // rate limit
)
```

### Consuming streams

```typescript
// Run for side effects
yield* Stream.runForEach(myStream, (item) => process(item))

// Collect to array
const items = yield* Stream.runCollect(myStream) // returns Chunk<A>

// Fold (reduce)
const sum = yield* Stream.runFold(myStream, 0, (acc, x) => acc + x)

// Drain (ignore values, run for effects)
yield* Stream.runDrain(myStream)
```

### Error handling in streams

```typescript
const resilient = myStream.pipe(
  Stream.catchTag("NetworkError", () => Stream.empty), // swallow and stop
  Stream.retry(Schedule.exponential("1 second")),       // retry the whole stream
  Stream.orElse(() => fallbackStream),                  // switch to fallback on error
)
```

---

## Sink

`Sink<A, In, L, E, R>` consumes a stream. It's the typed, composable dual of `Stream`.

```typescript
// Built-in sinks
const sum = Sink.sum             // sum all numbers
const count = Sink.count         // count elements
const head = Sink.head           // take first element
const last = Sink.last           // take last element
const take = Sink.take(10)       // take first 10

// Fold sink
const collect = Sink.collectAll<number>() // collect into Chunk

// Use a sink to consume a stream
const result = yield* Stream.run(myStream, Sink.sum)
```

---

## Scope

`Scope` is Effect's resource management boundary. Resources acquired within a scope are guaranteed to be released when the scope closes.

```typescript
// acquireRelease: acquire a resource, guarantee cleanup
const managedFile = Effect.acquireRelease(
  Effect.sync(() => fs.openSync(path, "r")),   // acquire
  (fd) => Effect.sync(() => fs.closeSync(fd)),  // release
)

// Effect.scoped creates a scope boundary
const program = Effect.scoped(
  Effect.gen(function* () {
    const fd = yield* managedFile
    const data = yield* readAll(fd)
    return data
    // fd is automatically closed here, even if readAll throws
  }),
)
```

### Scope guarantees
- Finalizers run even on interruption
- Finalizers run in reverse acquisition order
- If a finalizer itself fails, the failure is captured in `Cause`
- `Layer.scoped` ties a resource's lifetime to the layer — released when the app shuts down

---

## Request Batching

The `Request` + `RequestResolver` system allows code that looks like single-item lookups to be automatically batched into bulk operations when run concurrently.

### The pattern

```typescript
// 1. Declare a request type
interface GetUser extends Request.Request<User, NotFoundError> {
  readonly _tag: "GetUser"
  readonly id: UserId
}
const GetUser = Request.tagged<GetUser>("GetUser")

// 2. Define a batched resolver
const GetUserResolver = RequestResolver.makeBatched(
  (requests: ReadonlyArray<GetUser>) =>
    // This runs ONCE with ALL concurrent requests
    db.query(`SELECT * FROM users WHERE id IN (${requests.map(r => r.id).join(",")})`)
      .pipe(
        Effect.andThen((users) =>
          Effect.forEach(requests, (req, i) =>
            Request.completeEffect(req, Effect.succeed(users[i]!)),
          ),
        ),
      ),
)

// 3. Define the query (looks like a single-item lookup)
const getUser = (id: UserId) =>
  Effect.request(GetUser({ id }), GetUserResolver)

// 4. Use it — Effect batches automatically
yield* Effect.forEach(
  orderIds,
  (id) => getUser(id),  // all these calls are batched into 1 SQL query
  { batching: true },
)
```

### When to use batching

- N+1 query patterns: loading related entities in a loop
- External API calls with batch endpoints
- Any scenario where multiple concurrent requests can be grouped for efficiency

### Caching with requests

```typescript
const cachedGetUser = (id: UserId) =>
  Effect.request(GetUser({ id }), GetUserResolver).pipe(
    Effect.withRequestCaching(true),
  )
// Repeated calls with the same id reuse the cached result
```
