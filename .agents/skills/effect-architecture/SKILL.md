---
name: effect-architecture
description: >
  Architectural guidance for TypeScript applications built with the Effect library ecosystem.
  Use this skill whenever the user is designing, building, refactoring, or reviewing code that
  uses the Effect library (effect, @effect/schema, @effect/platform, etc.). Triggers include:
  mentions of Effect, Context.Tag, Layer, Data.TaggedError, Effect.gen, Schema, Stream, Fiber,
  Ref, Queue, PubSub, Semaphore, Schedule, Scope, or any Effect-idiomatic pattern. Also trigger
  when the user asks how to structure a TypeScript project with dependency injection, typed errors,
  composable services, or functional architecture — even if they don't mention Effect by name, if
  their code or context suggests they're using it. Trigger when a user asks about converting
  classical design patterns (Factory, Strategy, Repository, Observer, etc.) to Effect-style code.
  Do NOT trigger for general TypeScript questions unrelated to Effect, or for projects using
  fp-ts, neverthrow, or other FP libraries unless the user is migrating to Effect.
---

# Effect Architecture Skill

Guidance for making sound architectural decisions when building TypeScript applications with Effect.

## When to read reference files

This skill has reference files in `references/`. Read them based on the user's question:

| User is asking about... | Read this file |
|---|---|
| Service design, Layer composition, dependency injection, Context.Tag, wiring | `references/service-design.md` |
| Error modeling, tagged errors, error recovery, retry, timeout, Cause | `references/error-and-resilience.md` |
| Concurrency, Fibers, Streams, Queue, PubSub, Semaphore, Schedule, Scope | `references/concurrency-and-streams.md` |
| Classical patterns → Effect (Factory, Strategy, Observer, Repository, etc.) | `references/patterns-to-effect.md` |
| Schema, validation, branded types, API contracts | `references/schema-and-data.md` |

For broad architectural questions ("help me structure my Effect app"), read `references/service-design.md` first, then others as needed.

---

## Core Mental Model

Effect architecture revolves around one type:

```
Effect<Success, Error, Requirements>
         A        E         R
```

Every design decision maps to one of these three channels:

- **A** — What the computation produces. Design the success path with precise domain types.
- **E** — What can go wrong. Model errors as tagged unions with `Data.TaggedError`. Errors are values, not exceptions.
- **R** — What the computation needs. Declare dependencies via `Context.Tag`. Provide them via `Layer`. The compiler tracks all of this.

An Effect is lazy and does nothing until run. This is what makes everything composable — you build descriptions of programs, then execute them at the edge.

---

## The Five Architectural Pillars

### 1. Services: `Context.Tag` + `Layer`

Services are the primary unit of modularity. A service is an interface (declared with `Context.Tag`) paired with one or more implementations (provided as `Layer` values).

```typescript
// Declare WHAT you need (the interface)
class UserRepo extends Context.Tag("UserRepo")<
  UserRepo,
  {
    readonly findById: (id: UserId) => Effect.Effect<User, NotFoundError>
    readonly save: (user: User) => Effect.Effect<void, DatabaseError>
  }
>() {}

// Declare HOW to build it (the implementation)
const UserRepoLive = Layer.effect(
  UserRepo,
  Effect.gen(function* () {
    const db = yield* Database  // depend on another service
    return {
      findById: (id) => db.query(`SELECT * FROM users WHERE id = $1`, [id]),
      save: (user) => db.execute(`INSERT INTO users ...`, [user]),
    }
  }),
)
```

**Key principles:**
- Services should be narrow. Prefer many small services over few large ones.
- The tag string identifier (e.g., `"UserRepo"`) must be unique across the application. Use a namespace prefix for large apps: `"@myapp/UserRepo"`.
- Layer construction is where side effects happen — connecting to databases, reading config, setting up clients. Business logic stays in Effect pipelines.
- Layers are memoized by default. A service shared by multiple consumers is constructed once.

### 2. Errors: `Data.TaggedError` + the `E` channel

Model every expected error as a tagged class. The `E` channel accumulates error types through composition — the compiler tells you exactly what can go wrong.

```typescript
class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly entity: string
  readonly id: string
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string
  readonly message: string
}> {}
```

**Key principles:**
- Use `Data.TaggedError` — the `_tag` discriminant enables `Effect.catchTag` for precise recovery.
- Separate expected errors (domain errors in `E`) from unexpected errors (defects — bugs, crashes, out-of-memory). Use `Effect.die` or `Effect.orDie` for defects.
- Transform infrastructure errors into domain errors at service boundaries. Don't let `HttpClientError` leak into business logic.
- Error channels compose automatically: if `a: Effect<X, E1, R1>` and `b: Effect<Y, E2, R2>`, then `a.pipe(Effect.flatMap(() => b))` has error type `E1 | E2`.

### 3. Composition: `pipe` + `Effect.gen`

Use `pipe` for linear transformations. Use `Effect.gen` (generator syntax) for complex control flow with bindings.

```typescript
// pipe — clean for linear chains
const result = pipe(
  fetchUser(id),
  Effect.flatMap(validateUser),
  Effect.map(toResponse),
  Effect.catchTag("NotFound", () => Effect.succeed(fallback)),
)

// gen — clean when you need intermediate bindings
const result = Effect.gen(function* () {
  const user = yield* fetchUser(id)
  const validated = yield* validateUser(user)
  const enriched = yield* enrichWithProfile(validated)
  return toResponse(enriched)
})
```

**Key principles:**
- Both styles are idiomatic. Pick whichever reads better for the specific case.
- `Effect.gen` is usually clearer when you have 3+ steps that each depend on prior results.
- `pipe` is usually cleaner for transformations, error recovery, and adding cross-cutting behavior.
- You can mix them: use `Effect.gen` for the main logic, wrap it in `pipe` for retry/timeout/tracing.

### 4. Resources: `Scope` + `Effect.acquireRelease`

Any resource that needs cleanup (connections, file handles, subscriptions) must be acquired within a `Scope`. Effect guarantees cleanup even under interruption.

```typescript
const managedPool = Effect.acquireRelease(
  Effect.sync(() => new Pool(config)),      // acquire
  (pool) => Effect.promise(() => pool.end()), // release
)

// Scoped layer — cleanup happens when the application shuts down
const DbPoolLive = Layer.scoped(DbPool, managedPool)
```

**Key principles:**
- Never use `try/finally` for resource cleanup. Use `Effect.acquireRelease` or `Effect.ensuring`.
- `Layer.scoped` ties a resource's lifetime to the layer scope — the resource lives as long as the application.
- For shorter-lived resources, use `Effect.scoped` to create a narrower scope.
- Cleanup runs in reverse acquisition order, even when fibers are interrupted.

### 5. Observability: Logging, Tracing, Metrics

Effect has built-in observability. Use it from the start — don't bolt it on later.

```typescript
const processOrder = (orderId: string) =>
  Effect.gen(function* () {
    yield* Effect.log("Processing order")
    yield* Effect.annotateCurrentSpan("orderId", orderId)
    const order = yield* fetchOrder(orderId)
    yield* Metric.counter("orders.processed").pipe(Metric.increment)
    return order
  }).pipe(Effect.withSpan("processOrder"))
```

**Key principles:**
- Use `Effect.log` instead of `console.log`. It's structured, pluggable, and respects log levels.
- Wrap meaningful operations in `Effect.withSpan` for distributed tracing.
- Add `Effect.annotateCurrentSpan` for context that helps debugging.
- Metrics are declared once, used everywhere. `Metric.counter`, `Metric.gauge`, `Metric.histogram`.

---

## Project Structure

A well-structured Effect application separates concerns by layer:

```
src/
  domain/              # Pure types, tagged errors, business rules
    user.ts            # User type, UserId branded type
    errors.ts          # Domain errors (NotFoundError, ValidationError, etc.)
  services/            # Service interfaces (Context.Tag declarations)
    user-repo.ts       # UserRepo tag + interface
    mailer.ts          # Mailer tag + interface
  implementations/     # Layer implementations
    postgres-user-repo.ts
    sendgrid-mailer.ts
    in-memory-user-repo.ts  # for tests
  use-cases/           # Application-level orchestration (Effect.gen programs)
    place-order.ts
    register-user.ts
  infrastructure/      # HTTP routes, CLI entry points, external adapters
    api/
      routes.ts
    config.ts          # Config module definitions
  layers.ts            # Top-level Layer composition (the "wiring")
  main.ts              # Entry point: Effect.runMain(program.pipe(Effect.provide(AppLive)))
```

**Key principles:**
- `domain/` has zero Effect imports if possible. Pure TypeScript types and functions.
- `services/` only declares tags and interfaces — no implementations.
- `implementations/` provides `Layer` values. Each file exports a `*Live` layer.
- `use-cases/` contains the business logic as Effect programs. They depend on service tags (in `R`), never on implementations.
- `layers.ts` composes all `*Live` layers into an `AppLive` layer. This is the only place that knows about concrete implementations.
- `main.ts` calls `Effect.runMain` with the program and the composed layer. This is the application's edge.

---

## Common Mistakes

### Escaping the Effect world too early
Don't call `Effect.runPromise` inside business logic. Keep everything as `Effect` values until the very edge of your application. Calling `runPromise` mid-pipeline loses error tracking, interruption safety, and composability.

### Over-granular services
Not everything needs to be a `Context.Tag`. If a function is pure and has no dependencies, just make it a regular function. Services are for things that have implementations that vary (database, external APIs, config-driven behavior).

### Ignoring the error channel
If you find yourself using `Effect.orDie` everywhere, you're converting expected errors into defects. This defeats the purpose of typed errors. Reserve `orDie` for things that genuinely should crash the program (invariant violations, corrupted state).

### Not using `Schema` for boundaries
At every boundary (HTTP request/response, config loading, message queue payloads, file parsing), use `@effect/schema` to validate and transform. Raw `JSON.parse` with a type assertion (`as MyType`) is a runtime bomb.

### Providing layers too deep
Don't call `Effect.provide` inside services. Provide layers at the top level (`main.ts` or `layers.ts`). Services should declare their dependencies in `R`, not resolve them internally.

---

## Decision Heuristics

When unsure which Effect primitive to use, follow these heuristics:

| Situation | Reach for |
|---|---|
| I need to swap implementations (test vs prod) | `Context.Tag` + `Layer` |
| I need to validate external data | `Schema.decodeUnknown` |
| I need to retry on failure | `Effect.retry` + `Schedule` |
| I need to limit concurrency | `Semaphore` or `{ concurrency: N }` option |
| I need a lazy, potentially infinite sequence | `Stream` |
| I need one-to-many event broadcast | `PubSub` |
| I need a work queue (one consumer per item) | `Queue` |
| I need mutable state shared across fibers | `Ref` or `SynchronizedRef` |
| I need reactive state that notifies on change | `SubscriptionRef` |
| I need to batch N+1 queries | `Request` + `RequestResolver` |
| I need a resource with cleanup | `Effect.acquireRelease` + `Scope` |
| I need to run something in the background | `Effect.fork` (fiber) |
| I need to wait for a value from another fiber | `Deferred` |
| I need config from env vars | `Config` module |
| I need timed/scheduled execution | `Schedule` combinators |

---

## Testing

Effect has first-class testing support:

```typescript
import { Effect, Layer, TestClock } from "effect"

// Replace services with test implementations via layers
const TestLayer = Layer.mergeAll(
  InMemoryUserRepoLive,
  MockMailerLive,
)

// Run tests with test layers
const result = await Effect.runPromise(
  myUseCase(input).pipe(Effect.provide(TestLayer)),
)

// Test time-dependent code with TestClock
const timedTest = Effect.gen(function* () {
  const fiber = yield* Effect.fork(
    Effect.sleep("1 hour").pipe(Effect.andThen(doSomething)),
  )
  yield* TestClock.adjust("1 hour") // instantly advances time
  return yield* Fiber.join(fiber)
})
```

**Key principles:**
- Use `Layer` to swap implementations. In-memory repos, mock mailers, stub APIs.
- Use `TestClock` to test time-dependent logic (schedules, timeouts, debounce) without real waiting.
- Use `Effect.runPromiseExit` when you need to assert on error types: `expect(exit).toEqual(Exit.fail(new NotFoundError(...)))`.
- Test services in isolation. Test use-cases with composed test layers.

---

## When NOT to use Effect

Not everything needs to be an Effect. Use plain TypeScript for:

- Pure data transformations with no I/O or error recovery
- Simple utility functions (string formatting, math, array helpers)
- Type definitions and interfaces
- Constants and configuration shapes

Effect shines when you need: typed errors, dependency injection, concurrency, resource management, retries, timeouts, observability, or streaming. If none of these apply, plain TypeScript is simpler.
