# Classical Design Patterns → Effect Primitives

## Table of Contents
1. [Creational Patterns](#creational-patterns)
2. [Structural Patterns](#structural-patterns)
3. [Behavioral Patterns](#behavioral-patterns)
4. [Architectural Patterns](#architectural-patterns)
5. [Concurrency & Resilience Patterns](#concurrency-and-resilience-patterns)

This reference maps every classical GoF and enterprise pattern to its Effect equivalent, with code showing the before/after transformation.

---

## Creational Patterns

### Factory / Abstract Factory → `Context.Tag` + `Layer`

The factory pattern family is subsumed by `Context.Tag` (declaring what you need) and `Layer` (declaring how to build it).

```typescript
// Classical factory
function createPaymentProcessor(type: "stripe" | "paypal"): PaymentProcessor {
  if (type === "stripe") return new StripeProcessor()
  return new PayPalProcessor()
}

// Effect: no factory needed. Declare the service, swap the Layer.
class PaymentProcessor extends Context.Tag("PaymentProcessor")<
  PaymentProcessor,
  { readonly charge: (amount: number) => Effect.Effect<Receipt, ChargeError> }
>() {}

const StripeLive = Layer.succeed(PaymentProcessor, { charge: stripeCharge })
const PayPalLive = Layer.succeed(PaymentProcessor, { charge: paypalCharge })

// Abstract Factory: a family of related layers that must be provided together
const ProductionInfra = Layer.mergeAll(StripeLive, PostgresLive, SendgridLive)
const TestInfra = Layer.mergeAll(MockPaymentLive, InMemoryDbLive, NoopMailLive)
```

### Builder → `Schema` + `pipe`

Schema enforces all invariants at construction. No half-built intermediate states.

```typescript
// Classical builder
const config = new ConfigBuilder()
  .setHost("localhost")
  .setPort(5432)
  .setDatabase("myapp")
  .build() // validates at the end

// Effect: Schema IS the builder + validator
class DatabaseConfig extends Schema.Class<DatabaseConfig>("DatabaseConfig")({
  host: Schema.NonEmptyString,
  port: Schema.Int.pipe(Schema.between(1, 65535)),
  database: Schema.NonEmptyString,
  maxConnections: Schema.optionalWith(Schema.Int, { default: () => 10 }),
}) {}

const config = Schema.decodeUnknownSync(DatabaseConfig)({
  host: "localhost", port: 5432, database: "myapp",
})
// Valid DatabaseConfig or structured ParseError. Nothing in between.
```

### Singleton → Module scope + Layer memoization

Layers are memoized by default. Shared dependencies are constructed once.

```typescript
// Classical singleton
class Database {
  private static instance: Database
  static getInstance() {
    if (!this.instance) this.instance = new Database()
    return this.instance
  }
}

// Effect: Layer memoization handles this. No ceremony needed.
const DbPoolLive = Layer.scoped(
  DbPool,
  Effect.acquireRelease(createPool, closePool),
)
// Even if 10 services depend on DbPool, it's created once.
```

---

## Structural Patterns

### Adapter → Layer that maps one service to another

```typescript
// Classical adapter
class StripeAdapter implements PaymentGateway {
  constructor(private stripe: Stripe) {}
  charge(amount: number) { return this.stripe.paymentIntents.create({ amount }) }
}

// Effect: the adapter IS a Layer
const StripeAdapterLive = Layer.succeed(PaymentGateway, {
  charge: (amount) =>
    Effect.tryPromise({
      try: () => stripe.paymentIntents.create({ amount }),
      catch: () => new ChargeError(),
    }),
})
```

### Facade → Composed service via `Layer.effect`

```typescript
// Effect: a facade is a service that depends on other services
const AuthFacadeLive = Layer.effect(
  AuthFacade,
  Effect.gen(function* () {
    const tokens = yield* TokenService
    const users = yield* UserService
    const sessions = yield* SessionStore
    return {
      login: (email, password) =>
        Effect.gen(function* () {
          const user = yield* users.verify(email, password)
          const token = yield* tokens.issue(user.id)
          return yield* sessions.create(user, token)
        }),
    }
  }),
)
```

### Decorator → Pipeline operators

```typescript
// Classical decorator
class LoggingService implements Service {
  constructor(private inner: Service) {}
  doWork(input: string) {
    console.log("Starting")
    const result = this.inner.doWork(input)
    console.log("Done")
    return result
  }
}

// Effect: decorate with pipe operators — no wrapper class
const decorated = myEffect.pipe(
  Effect.tap(() => Effect.log("Starting")),
  Effect.withSpan("doWork"),           // tracing
  Effect.retry(Schedule.recurs(3)),    // retry
  Effect.timeout("5 seconds"),         // timeout
)
```

### Proxy → Purpose-built primitives

| Proxy use case | Effect primitive |
|---|---|
| Lazy loading | `Effect.cached` or `Effect.cachedWithTTL` |
| Access control | `Semaphore.withPermits` |
| Change tracking | `SubscriptionRef` |
| Virtual proxy | `Deferred` (one-shot) or `Ref` (mutable) |

---

## Behavioral Patterns

### Strategy → Service with swappable Layers

The strategy pattern is literally what `Context.Tag` + `Layer` does.

```typescript
class CompressionStrategy extends Context.Tag("CompressionStrategy")<
  CompressionStrategy,
  {
    readonly compress: (data: Uint8Array) => Effect.Effect<Uint8Array>
    readonly decompress: (data: Uint8Array) => Effect.Effect<Uint8Array>
  }
>() {}

// Strategy implementations are Layers
const GzipLive = Layer.succeed(CompressionStrategy, { /* gzip */ })
const BrotliLive = Layer.succeed(CompressionStrategy, { /* brotli */ })
const ZstdLive = Layer.succeed(CompressionStrategy, { /* zstd */ })
```

### Observer → `PubSub`, `Queue`, `SubscriptionRef`

| Observer variant | Effect primitive |
|---|---|
| Broadcast (all listeners get all events) | `PubSub` |
| Work distribution (each event handled once) | `Queue` |
| Reactive state (notify on change) | `SubscriptionRef` |

All are typed, backpressured, and fiber-scoped. No memory leaks from forgotten `removeListener`.

### Command → `Effect` values

An `Effect` IS a command — a lazy, composable, reifiable description of a computation.

```typescript
// Classical command
class TransferCommand {
  constructor(private from: string, private to: string, private amount: number) {}
  execute() { /* ... */ }
  undo() { /* ... */ }
}

// Effect: the Effect value IS the command
const transfer = (from: string, to: string, amount: number) =>
  Effect.gen(function* () {
    yield* debit(from, amount)
    yield* credit(to, amount)
  })

// Store it, queue it, retry it, trace it
const cmd = transfer("a", "b", 100) // nothing happens — it's a description
yield* cmd.pipe(Effect.retry(Schedule.recurs(2)), Effect.withSpan("transfer"))
```

### Chain of Responsibility → `pipe` + `Effect.catchTag`

```typescript
// Error recovery chain
const resilient = primaryCall.pipe(
  Effect.catchTag("Timeout", () => fallbackCall),
  Effect.catchTag("RateLimit", (e) =>
    Effect.sleep(Duration.seconds(e.retryAfter)).pipe(Effect.andThen(primaryCall)),
  ),
  Effect.catchTag("NotFound", () => Effect.succeed(defaultValue)),
)
```

### State Machine → Discriminated unions + `Ref`

```typescript
type State =
  | { _tag: "Idle" }
  | { _tag: "Loading"; startedAt: Date }
  | { _tag: "Success"; data: Data }
  | { _tag: "Error"; error: AppError; retries: number }

type Event =
  | { _tag: "Fetch" }
  | { _tag: "Succeed"; data: Data }
  | { _tag: "Fail"; error: AppError }
  | { _tag: "Retry" }

// Pure transition function — no effects, fully testable
const transition = (state: State, event: Event): State => {
  switch (state._tag) {
    case "Idle":
      if (event._tag === "Fetch") return { _tag: "Loading", startedAt: new Date() }
      return state
    case "Loading":
      if (event._tag === "Succeed") return { _tag: "Success", data: event.data }
      if (event._tag === "Fail") return { _tag: "Error", error: event.error, retries: 0 }
      return state
    case "Error":
      if (event._tag === "Retry") return { _tag: "Loading", startedAt: new Date() }
      return state
    default: return state
  }
}

// Effectful driver
const machine = Effect.gen(function* () {
  const stateRef = yield* Ref.make<State>({ _tag: "Idle" })
  const dispatch = (event: Event) => Ref.update(stateRef, (s) => transition(s, event))
  return { dispatch, getState: Ref.get(stateRef) }
})
```

### Iterator → `Stream`

```typescript
// Classical async generator
async function* paginate(url: string) {
  let cursor: string | undefined
  do {
    const page = await fetch(`${url}?cursor=${cursor}`).then(r => r.json())
    for (const item of page.items) yield item
    cursor = page.nextCursor
  } while (cursor)
}

// Effect: Stream with typed errors, backpressure, resource safety
const paginate = (url: string) =>
  Stream.paginateChunkEffect(undefined as string | undefined, (cursor) =>
    httpClient.get(`${url}?cursor=${cursor}`).pipe(
      Effect.map((page) => [
        Chunk.fromIterable(page.items),
        Option.fromNullable(page.nextCursor),
      ]),
    ),
  )
```

### Mediator → `PubSub` or composed service

A mediator centralizing multi-object communication is just a `PubSub` or a dedicated service tag that encapsulates the coordination logic.

---

## Architectural Patterns

### Repository → Service (naturally)

A repository is just a service with data access methods. No special pattern needed.

### Dependency Injection → The `R` parameter + `Layer`

This IS Effect. The `R` type parameter tracks dependencies at compile time. `Layer` resolves them. You cannot forget a dependency.

### CQRS → Separate service tags

```typescript
// Command side
class OrderCommands extends Context.Tag("OrderCommands")<OrderCommands, {
  readonly placeOrder: (input: OrderInput) => Effect.Effect<OrderId, OrderError>
}>() {}

// Query side — potentially different data source
class OrderQueries extends Context.Tag("OrderQueries")<OrderQueries, {
  readonly getSummary: (id: OrderId) => Effect.Effect<OrderSummary, NotFoundError>
}>() {}
```

### Configuration → `Config` module

```typescript
const appConfig = Config.all({
  port: Config.integer("PORT").pipe(Config.withDefault(3000)),
  dbUrl: Config.string("DATABASE_URL").pipe(Config.redacted),
})
// Fails at startup with structured error if config is invalid
```

---

## Concurrency and Resilience Patterns

### Retry with Backoff → `Effect.retry` + `Schedule`

```typescript
// One line replaces 30+ lines of manual retry logic
const resilient = apiCall.pipe(
  Effect.retry(
    Schedule.exponential("500 millis").pipe(
      Schedule.jittered,
      Schedule.compose(Schedule.recurs(5)),
    ),
  ),
)
```

### Circuit Breaker → `Ref` + `Schedule`

No built-in primitive, but trivially composed from a `Ref<CircuitState>`, `Schedule` for reset timing, and `Effect.catchAll` for failure tracking.

### Bulkhead → `Semaphore`

```typescript
const bulkhead = yield* Effect.makeSemaphore(5) // max 5 concurrent
yield* bulkhead.withPermits(1)(apiCall)
```

### Timeout → `Effect.timeout` / `Effect.timeoutFail`

```typescript
const bounded = longOp.pipe(
  Effect.timeoutFail({
    duration: "5 seconds",
    onTimeout: () => new TimeoutError(),
  }),
)
```

---

## Summary: The Core Transformation

When migrating from classical patterns to Effect:

1. **Factory / Strategy / Adapter / Repository** → All become `Context.Tag` + `Layer`. The pattern distinction dissolves — they're all dependency injection.
2. **Decorator** → Becomes `pipe` operators. No wrapper classes.
3. **Observer** → Becomes `PubSub` / `Queue` / `SubscriptionRef`. Typed, backpressured, leak-free.
4. **Command** → Becomes `Effect` values. Lazy, composable, retryable.
5. **Builder** → Becomes `Schema`. Validation at construction.
6. **Iterator** → Becomes `Stream`. Typed, resourceful, concurrent.
7. **State Machine** → Becomes discriminated unions + `Ref`. Pure transitions, effectful driver.
8. **All resilience patterns** → Become one-line `Schedule`/`Semaphore`/`timeout` calls.

The meta-pattern: **Effect replaces *recipes* with *primitives***. You stop implementing patterns and start composing building blocks.
