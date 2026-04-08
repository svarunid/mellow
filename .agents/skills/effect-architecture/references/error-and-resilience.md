# Error Modeling and Resilience with Effect

## Table of Contents
1. [The Two Error Types](#the-two-error-types)
2. [Modeling Expected Errors](#modeling-expected-errors)
3. [Error Recovery Patterns](#error-recovery-patterns)
4. [Transforming Errors at Boundaries](#transforming-errors-at-boundaries)
5. [Retry and Schedule](#retry-and-schedule)
6. [Timeout](#timeout)
7. [Error Accumulation](#error-accumulation)
8. [Cause and Defects](#cause-and-defects)

---

## The Two Error Types

Effect distinguishes between **expected errors** and **defects**.

**Expected errors** live in the `E` channel. They represent things that *can* go wrong in normal operation — network timeouts, validation failures, missing records, permission denied. They are values, tracked by the type system, and must be handled.

**Defects** are unexpected — bugs, invariant violations, null pointer dereferences, out-of-memory. They bypass the `E` channel and are captured in `Cause.Die`. The program is not expected to recover from them gracefully.

```typescript
// Expected error — tracked in E
const findUser = (id: string): Effect.Effect<User, NotFoundError> =>
  Effect.fail(new NotFoundError({ id }))

// Defect — bypasses E, goes to Cause.Die
const assertPositive = (n: number): Effect.Effect<number> => {
  if (n <= 0) return Effect.die(new Error("Invariant: n must be positive"))
  return Effect.succeed(n)
}
```

The rule: if a caller should reasonably handle it, make it an expected error. If it indicates a programming mistake, make it a defect.

---

## Modeling Expected Errors

### Data.TaggedError

Always use `Data.TaggedError` for expected errors. The `_tag` field enables `Effect.catchTag` — the primary mechanism for selective error recovery.

```typescript
import { Data } from "effect"

class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly entity: string
  readonly id: string
}> {}

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string
  readonly message: string
}> {}

class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly retryAfter: number
}> {}
```

**Why tagged errors over plain classes:**
- `Data.TaggedError` gives you structural equality for free (`Equal.equals`)
- The `_tag` field enables exhaustive pattern matching with `Effect.catchTag` and `Match`
- They work with `Schema` for serialization across process boundaries
- They're immutable by default

### Error type composition

When you compose effects, error types accumulate automatically:

```typescript
const a: Effect.Effect<User, NotFoundError> = getUser(id)
const b: Effect.Effect<void, ValidationError> = validateUser(user)
const c: Effect.Effect<Receipt, PaymentError> = chargeUser(user)

const program = Effect.gen(function* () {
  const user = yield* a
  yield* b
  return yield* c
})
// program: Effect<Receipt, NotFoundError | ValidationError | PaymentError>
// Compiler accumulated ALL error types through the pipeline
```

---

## Error Recovery Patterns

### `Effect.catchTag` — Handle specific errors by tag

The workhorse of error recovery. Handles one error variant and removes it from the error channel.

```typescript
const program = getUser(id).pipe(
  Effect.catchTag("NotFoundError", (e) =>
    Effect.succeed(createDefaultUser(e.id)),
  ),
)
// Error type narrowed: NotFoundError removed, others remain
```

### `Effect.catchTags` — Handle multiple specific errors

```typescript
const handled = program.pipe(
  Effect.catchTags({
    NotFoundError: (e) => Effect.succeed(fallbackUser),
    ValidationError: (e) => Effect.fail(new UserFacingError({ message: e.message })),
    // RateLimitError is NOT handled — remains in E
  }),
)
```

### `Effect.catchAll` — Handle all expected errors

```typescript
const safe = program.pipe(
  Effect.catchAll((error) => {
    // error: NotFoundError | ValidationError | RateLimitError
    return Effect.succeed(defaultValue)
  }),
)
// E is now `never` — all errors handled
```

### `Effect.tapError` — Observe errors without handling

Useful for logging or metrics without changing the error flow.

```typescript
const observed = program.pipe(
  Effect.tapError((e) => Effect.log(`Error: ${e._tag}`, e)),
)
// Error type unchanged — tapError doesn't recover
```

### Fallback chains

```typescript
const resilient = primarySource.pipe(
  Effect.catchTag("Unavailable", () => secondarySource),
  Effect.catchTag("Unavailable", () => cachedSource),
  Effect.catchTag("Unavailable", () => Effect.succeed(hardcodedDefault)),
)
```

---

## Transforming Errors at Boundaries

At service boundaries, transform infrastructure errors into domain errors. This keeps implementation details from leaking upward.

```typescript
// INSIDE the repository implementation
const findById = (id: UserId): Effect.Effect<User, NotFoundError | DatabaseError> =>
  db.query("SELECT * FROM users WHERE id = $1", [id]).pipe(
    Effect.mapError((e) => {
      // Transform Postgres-specific errors to domain errors
      if (e instanceof PgNotFoundError) return new NotFoundError({ entity: "User", id })
      return new DatabaseError({ cause: e })
    }),
  )

// Or use catchTag for more granular control
const findById2 = (id: UserId) =>
  db.query("SELECT * FROM users WHERE id = $1", [id]).pipe(
    Effect.catchTag("PgConnectionError", () =>
      Effect.fail(new DatabaseError({ message: "Connection lost" })),
    ),
    Effect.catchTag("PgNotFoundError", () =>
      Effect.fail(new NotFoundError({ entity: "User", id })),
    ),
  )
```

The pattern: infrastructure-specific errors are caught and re-raised as domain errors at the service boundary. Consumers of `UserRepo` never see `PgConnectionError`.

---

## Retry and Schedule

### Basic retry

```typescript
const resilient = httpCall.pipe(
  Effect.retry(Schedule.recurs(3)),
)
```

### Exponential backoff with jitter

```typescript
const resilient = httpCall.pipe(
  Effect.retry(
    Schedule.exponential("500 millis").pipe(
      Schedule.jittered,
      Schedule.compose(Schedule.recurs(5)), // max 5 retries
    ),
  ),
)
```

### Conditional retry (only on certain errors)

```typescript
const resilient = httpCall.pipe(
  Effect.retry(
    Schedule.exponential("1 second").pipe(
      Schedule.compose(Schedule.recurs(3)),
      // Only retry on transient errors
      Schedule.whileInput((error: ApiError) =>
        error._tag === "RateLimitError" || error._tag === "TimeoutError"
      ),
    ),
  ),
)
```

### Schedule combinators reference

| Combinator | Meaning |
|---|---|
| `Schedule.recurs(n)` | Stop after n repetitions |
| `Schedule.spaced(d)` | Fixed delay between attempts |
| `Schedule.exponential(base)` | Exponentially increasing delay |
| `Schedule.fibonacci(base)` | Fibonacci-sequence delays |
| `Schedule.jittered` | Add random jitter to prevent thundering herd |
| `Schedule.compose(a, b)` | Both must allow (intersection) |
| `Schedule.either(a, b)` | Either can allow (union) |
| `Schedule.whileInput(pred)` | Continue while predicate on input holds |
| `Schedule.whileOutput(pred)` | Continue while predicate on output holds |
| `Schedule.elapsed` | Outputs elapsed time since start |
| `Schedule.fixed(d)` | Fixed interval from start of each attempt |
| `Schedule.windowed(d)` | Fixed interval from end of each attempt |

### Complex schedule example

```typescript
// Retry with exponential backoff + jitter, max 5 times, max 30 seconds total, only on retryable errors
const policy = Schedule.exponential("200 millis").pipe(
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(5)),
  Schedule.compose(
    Schedule.elapsed.pipe(
      Schedule.whileOutput(Duration.lessThanOrEqualTo(Duration.seconds(30))),
    ),
  ),
  Schedule.whileInput((e: ApiError) => e._tag !== "AuthError"), // don't retry auth failures
)
```

---

## Timeout

### Basic timeout

```typescript
const bounded = longOperation.pipe(
  Effect.timeout("5 seconds"),
)
// Returns Option<A> — None if timed out
```

### Timeout with specific error

```typescript
const bounded = longOperation.pipe(
  Effect.timeoutFail({
    duration: "5 seconds",
    onTimeout: () => new TimeoutError({ operation: "fetchData" }),
  }),
)
// Fails with TimeoutError on timeout
```

### Timeout with fallback

```typescript
const bounded = longOperation.pipe(
  Effect.timeoutTo({
    duration: "5 seconds",
    onTimeout: Effect.succeed(cachedValue), // use cache on timeout
    onSuccess: (result) => Effect.succeed(result),
  }),
)
```

---

## Error Accumulation

When validating multiple fields, you often want ALL errors, not just the first one.

```typescript
// Effect.all with { mode: "validate" } accumulates errors
const validateUser = (input: unknown) =>
  Effect.all(
    [
      validateName(input.name),
      validateEmail(input.email),
      validateAge(input.age),
    ],
    { mode: "validate" },
  )
// If name and email fail: E = [NameError, EmailError] (array of all failures)
// Default behavior (without mode: "validate") would short-circuit on first failure
```

---

## Cause and Defects

`Cause<E>` is Effect's full error model. It captures not just the error value, but the entire causal history — sequential failures, parallel failures, interruptions, and stack traces.

```typescript
type Cause<E> =
  | Empty         // no error
  | Fail<E>       // expected error (value in E channel)
  | Die           // defect (unexpected error)
  | Interrupt     // fiber was interrupted
  | Sequential    // first error caused second
  | Parallel      // errors happened concurrently
```

### Accessing the Cause

```typescript
// Effect.sandbox exposes the full Cause in the E channel
const program = myEffect.pipe(
  Effect.sandbox,
  Effect.catchAll((cause) => {
    // cause: Cause<MyError>
    if (Cause.isInterruptedOnly(cause)) {
      return Effect.log("Was interrupted")
    }
    return Effect.log(`Failed: ${Cause.pretty(cause)}`)
  }),
)
```

### When to use `Effect.orDie` vs keeping errors in E

```typescript
// orDie: convert E to a defect. The error is no longer tracked.
// Use when: the error indicates a bug that callers shouldn't handle.
const configValue = Effect.config(Config.string("REQUIRED_VAR")).pipe(
  Effect.orDie, // if this env var is missing, the app should crash
)

// Keep in E: the error is recoverable and callers should handle it.
const user = getUser(id) // NotFoundError stays in E — callers decide what to do
```
