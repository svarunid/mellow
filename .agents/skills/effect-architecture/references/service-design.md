# Service Design with Effect

## Table of Contents
1. [Defining Services](#defining-services)
2. [Layer Construction Patterns](#layer-construction-patterns)
3. [Layer Composition and the Dependency Graph](#layer-composition)
4. [Service Granularity](#service-granularity)
5. [Optional and Default Services](#optional-and-default-services)
6. [Layers with Dependencies](#layers-with-dependencies)
7. [Configuration as a Service](#configuration-as-a-service)
8. [The `layers.ts` Pattern](#the-layersts-pattern)
9. [Anti-Patterns](#anti-patterns)

---

## Defining Services

A service in Effect has two parts: a **tag** (identity + interface) and one or more **layers** (implementations).

### The Tag Pattern

```typescript
import { Context, Effect } from "effect"

// The tag declares: "there exists a service with these capabilities"
class HttpClient extends Context.Tag("@myapp/HttpClient")<
  HttpClient,
  {
    readonly get: (url: string) => Effect.Effect<Response, HttpError>
    readonly post: (url: string, body: unknown) => Effect.Effect<Response, HttpError>
  }
>() {}
```

The string `"@myapp/HttpClient"` is the **identifier**. It must be globally unique. Use namespace prefixes for large applications.

The second type parameter defines the **service shape** — the methods and properties available to consumers. Every method should return an `Effect` (not a `Promise`) so errors and dependencies compose correctly.

### Extracting the Service Type

If you need the service type elsewhere (for tests, for documentation):

```typescript
type HttpClientService = Context.Tag.Service<typeof HttpClient>
// { readonly get: ...; readonly post: ...; }
```

### Static members on tags

Tags can carry static layer definitions, which is a clean pattern for co-locating a service with its default implementation:

```typescript
class Logger extends Context.Tag("@myapp/Logger")<
  Logger,
  { readonly log: (msg: string) => Effect.Effect<void> }
>() {
  static Live = Layer.succeed(this, {
    log: (msg) => Effect.log(msg),
  })

  static Test = Layer.succeed(this, {
    log: (_msg) => Effect.void,
  })
}
```

---

## Layer Construction Patterns

Layers are constructed differently depending on what they need.

### `Layer.succeed` — No dependencies, no effects

Use when the implementation is a plain object with no setup, no config, no side effects.

```typescript
const InMemoryRepoLive = Layer.succeed(UserRepo, {
  findById: (id) => Effect.succeed(users.get(id)),
  save: (user) => Effect.sync(() => users.set(user.id, user)),
})
```

### `Layer.effect` — Needs other services or effectful setup

Use when construction depends on other services from the context.

```typescript
const PostgresRepoLive = Layer.effect(
  UserRepo,
  Effect.gen(function* () {
    const db = yield* Database       // pull Database from context
    const logger = yield* Logger     // pull Logger from context
    return {
      findById: (id) =>
        db.query("SELECT * FROM users WHERE id = $1", [id]).pipe(
          Effect.tap(() => logger.log(`Fetched user ${id}`)),
        ),
      save: (user) => db.execute("INSERT INTO users ...", [user]),
    }
  }),
)
// Type: Layer<UserRepo, never, Database | Logger>
//       produces UserRepo, requires Database + Logger
```

### `Layer.scoped` — Needs resource cleanup

Use when the service manages a resource with a lifecycle (connection pool, file handle, subscription).

```typescript
const DbPoolLive = Layer.scoped(
  DbPool,
  Effect.acquireRelease(
    Effect.sync(() => new Pool({ connectionString: process.env.DATABASE_URL })),
    (pool) => Effect.promise(() => pool.end()),
  ),
)
// The pool is created when the layer is built and closed when the scope ends.
```

### `Layer.effectDiscard` — Setup only, no service value

Use for layers that perform side effects (migrations, warmup) but don't produce a service.

```typescript
const MigrationLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const db = yield* Database
    yield* db.runMigrations()
    yield* Effect.log("Migrations complete")
  }),
)
```

---

## Layer Composition

Layers compose into a dependency graph. The graph is resolved when you `Effect.provide` it.

### `Layer.merge` — Combine independent layers

```typescript
const InfraLive = Layer.mergeAll(
  DbPoolLive,
  RedisLive,
  LoggerLive,
)
// Provides: DbPool | Redis | Logger
```

### `Layer.provide` — Wire a layer's dependencies

```typescript
// PostgresRepoLive needs Database
// DatabaseLive provides Database but needs DbPool
// DbPoolLive provides DbPool

const RepoLive = PostgresRepoLive.pipe(
  Layer.provide(DatabaseLive),
  Layer.provide(DbPoolLive),
)
// RepoLive: Layer<UserRepo, never, never>
// All dependencies satisfied — ready to use
```

### Full composition example

```typescript
// layers.ts — the wiring file
const AppLive = Layer.mergeAll(
  // Use cases just need service tags — they don't know about Postgres or Sendgrid
  PostgresRepoLive,
  SendgridMailerLive,
  StripePaymentLive,
).pipe(
  // Provide shared infrastructure
  Layer.provide(Layer.mergeAll(
    DbPoolLive,
    RedisLive,
    HttpClientLive,
  )),
  // Provide config
  Layer.provide(AppConfigLive),
)

// main.ts
Effect.runMain(
  program.pipe(Effect.provide(AppLive)),
)
```

### Layer memoization

Layers are memoized by default within a single `provide` call. If both `PostgresRepoLive` and `OrderRepoLive` depend on `DbPoolLive`, the pool is constructed once and shared.

To create a fresh instance each time (rare), use `Layer.fresh`:

```typescript
const FreshPool = Layer.fresh(DbPoolLive)
```

---

## Service Granularity

### When to create a service (use Context.Tag)

- The implementation varies between environments (production Postgres vs test in-memory)
- The functionality wraps an external system (API client, database, message queue)
- Multiple consumers need to share a stateful resource (connection pool, cache)
- You want to decouple a module so it can evolve independently

### When NOT to create a service

- The function is pure (no I/O, no state, no config-dependent behavior)
- There's only one reasonable implementation and it will never change
- The function is a simple utility (string formatting, data transformation)
- Creating a service would add ceremony without flexibility

```typescript
// DON'T make this a service — it's a pure function
const formatCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)

// DO make this a service — it wraps an external system
class ExchangeRates extends Context.Tag("ExchangeRates")<
  ExchangeRates,
  { readonly getRate: (from: string, to: string) => Effect.Effect<number, RateError> }
>() {}
```

---

## Optional and Default Services

Sometimes a service is optional — if available, use it; otherwise, proceed without it.

```typescript
// Effect.serviceOption returns Option<Service>
const program = Effect.gen(function* () {
  const maybeAnalytics = yield* Effect.serviceOption(Analytics)
  // Use Option.match or Option.map to conditionally call it
  yield* Option.match(maybeAnalytics, {
    onNone: () => Effect.void,
    onSome: (analytics) => analytics.track("page_view"),
  })
})
```

Effect also provides **Default Services** that are always available without explicit provision: `Clock`, `Console`, `Random`, `Tracer`. These are part of the default runtime.

---

## Layers with Dependencies

When a service depends on another service, use `Layer.effect` and pull dependencies from the context. The compiler tracks everything — you cannot forget a dependency.

```typescript
// OrderService depends on UserRepo, PaymentGateway, and Mailer
const OrderServiceLive = Layer.effect(
  OrderService,
  Effect.gen(function* () {
    const users = yield* UserRepo
    const payments = yield* PaymentGateway
    const mailer = yield* Mailer
    return {
      placeOrder: (input) =>
        Effect.gen(function* () {
          const user = yield* users.findById(input.userId)
          yield* payments.charge(user, input.amount)
          yield* mailer.send(user.email, "Order confirmed")
          return { orderId: generateId(), status: "placed" }
        }),
    }
  }),
)
// Type: Layer<OrderService, never, UserRepo | PaymentGateway | Mailer>
```

If you forget to provide `Mailer`, the compiler error is:

```
Type 'Layer<..., never, UserRepo | PaymentGateway | Mailer>' is not assignable to ...
Property 'Mailer' is missing
```

---

## Configuration as a Service

Use the `Config` module for application configuration. Configs are declarative, validated at startup, and composable.

```typescript
import { Config, Effect, Layer, Redacted } from "effect"

const dbConfig = Config.all({
  host: Config.string("DB_HOST"),
  port: Config.integer("DB_PORT").pipe(Config.withDefault(5432)),
  name: Config.string("DB_NAME"),
  password: Config.redacted("DB_PASSWORD"), // masked in logs
})

// Use Config in a layer
const DbPoolLive = Layer.scoped(
  DbPool,
  Effect.gen(function* () {
    const config = yield* Effect.config(dbConfig)
    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => new Pool({
        host: config.host,
        port: config.port,
        database: config.name,
        password: Redacted.value(config.password),
      })),
      (pool) => Effect.promise(() => pool.end()),
    )
    return pool
  }),
)
```

**Key principle:** Never read `process.env` directly in service code. Use `Config` so that:
1. Missing vars produce structured startup errors (not runtime `undefined`)
2. Sensitive values are automatically redacted in logs
3. Config can be provided from any source (env, files, remote) via `ConfigProvider`

---

## Anti-Patterns

### Calling `Effect.provide` inside a service

```typescript
// BAD — don't provide layers inside service methods
const bad = {
  doWork: () =>
    someEffect.pipe(Effect.provide(SomeDependencyLive)), // NO
}

// GOOD — declare the dependency in R, provide at the top
const good = {
  doWork: () => someEffect, // SomeDependency stays in R
}
```

### Services that are just functions with no interface

```typescript
// BAD — this is a function pretending to be a service
class MyHelper extends Context.Tag("MyHelper")<
  MyHelper,
  { readonly format: (s: string) => string }
>() {}

// GOOD — just make it a function
const format = (s: string): string => s.toUpperCase()
```

### Circular layer dependencies

If `A` depends on `B` and `B` depends on `A`, you have a circular dependency. Effect will not resolve this. Refactor by extracting the shared behavior into a third service `C` that both `A` and `B` depend on.

### Leaking implementation types through service interfaces

```typescript
// BAD — Prisma client leaks into the service interface
class UserRepo extends Context.Tag("UserRepo")<
  UserRepo,
  { readonly client: PrismaClient } // implementation detail exposed
>() {}

// GOOD — expose domain operations, not implementation
class UserRepo extends Context.Tag("UserRepo")<
  UserRepo,
  { readonly findById: (id: UserId) => Effect.Effect<User, NotFoundError> }
>() {}
```
