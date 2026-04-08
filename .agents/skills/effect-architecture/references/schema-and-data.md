# Schema, Validation, and Data Types

## Table of Contents
1. [Why Schema at Every Boundary](#why-schema-at-every-boundary)
2. [Basic Schema Usage](#basic-schema-usage)
3. [Schema Classes](#schema-classes)
4. [Transformations](#transformations)
5. [Branded Types](#branded-types)
6. [Integrating Schema with Services](#integrating-schema-with-services)
7. [Data Types Reference](#data-types-reference)
8. [Pattern Matching with Match](#pattern-matching)

---

## Why Schema at Every Boundary

Every point where data enters or leaves your application is a trust boundary. Raw `JSON.parse` with a type assertion (`as MyType`) is a runtime bomb — the type system silently lies.

Use `@effect/schema` at these boundaries:
- HTTP request/response bodies
- Environment variables and configuration
- Message queue payloads (BullMQ jobs, Kafka messages)
- File parsing (JSON, CSV, YAML)
- Database query results (when not using a typed ORM)
- WebSocket messages
- External API responses

Schema gives you: parsing, validation, type inference, error messages, JSON Schema generation, and arbitrary data generation — all from a single declaration.

---

## Basic Schema Usage

### Defining schemas

```typescript
import { Schema } from "effect"

// Primitive schemas
const Name = Schema.String
const Age = Schema.Number
const Active = Schema.Boolean

// Object schemas
const User = Schema.Struct({
  id: Schema.String,
  name: Schema.NonEmptyString,
  email: Schema.String,
  age: Schema.Int.pipe(Schema.between(0, 150)),
  role: Schema.Literal("admin", "user", "guest"),
  createdAt: Schema.DateFromString, // parses ISO string to Date
})

// Infer the TypeScript type from the schema
type User = typeof User.Type
// { id: string; name: string; email: string; age: number; role: "admin" | "user" | "guest"; createdAt: Date }
```

### Parsing and validation

```typescript
// Sync parsing — throws on invalid input
const user = Schema.decodeUnknownSync(User)(rawData)

// Effect-based parsing — returns Effect<User, ParseError>
const userEffect = Schema.decodeUnknown(User)(rawData)

// Use in an Effect pipeline
const program = Effect.gen(function* () {
  const body = yield* getRequestBody()
  const user = yield* Schema.decodeUnknown(User)(body)
  // user is fully validated and typed
  return yield* saveUser(user)
})
```

### Optional and default fields

```typescript
const Config = Schema.Struct({
  host: Schema.String,
  port: Schema.optionalWith(Schema.Int, { default: () => 3000 }),
  debug: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  apiKey: Schema.optional(Schema.String), // genuinely optional, may not exist
})
```

### Arrays and unions

```typescript
const Tags = Schema.Array(Schema.NonEmptyString)

const Shape = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal("circle"), radius: Schema.Number }),
  Schema.Struct({ _tag: Schema.Literal("rect"), width: Schema.Number, height: Schema.Number }),
)
type Shape = typeof Shape.Type
// { _tag: "circle"; radius: number } | { _tag: "rect"; width: number; height: number }
```

---

## Schema Classes

For domain entities, `Schema.Class` combines schema validation with a class definition:

```typescript
class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.NonEmptyString,
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/)),
  role: Schema.Literal("admin", "user"),
}) {
  // You can add methods to the class
  get isAdmin() {
    return this.role === "admin"
  }
}

// Construction validates
const user = new User({ id: "1", name: "Arun", email: "a@b.com", role: "admin" })
// Throws ParseError if invalid

// Or use decode for Effect-based validation
const userEffect = Schema.decodeUnknown(User)(rawData)
```

### TaggedError with Schema

Domain errors can also be schema-validated:

```typescript
class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  { entity: Schema.String, id: Schema.String },
) {}

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  { field: Schema.String, message: Schema.String },
) {}
```

---

## Transformations

Schemas can transform data between an "encoded" form (what you receive) and a "decoded" form (what your code uses).

```typescript
// String ↔ Date
const DateFromISO = Schema.DateFromString
// Encoded: "2024-01-15T10:30:00Z" (string)
// Decoded: Date object

// String ↔ Number
const NumberFromString = Schema.NumberFromString
// Encoded: "42" (string)
// Decoded: 42 (number)

// Custom transformation
const Cents = Schema.transform(
  Schema.Number,  // from
  Schema.Number,  // to
  {
    decode: (dollars) => Math.round(dollars * 100),  // dollars → cents
    encode: (cents) => cents / 100,                   // cents → dollars
  },
)
```

### `parseJson` for stringified JSON fields

When a field contains JSON as a string (common in message queues):

```typescript
const MessagePayload = Schema.Struct({
  id: Schema.String,
  data: Schema.parseJson(Schema.Struct({
    userId: Schema.String,
    action: Schema.String,
  })),
})
// data field: parses from JSON string to typed object
```

---

## Branded Types

Branded types prevent mixing semantically different values that share the same underlying type.

### With `Schema.brand`

```typescript
const UserId = Schema.String.pipe(
  Schema.pattern(/^usr_[a-z0-9]+$/),
  Schema.brand("UserId"),
)
type UserId = typeof UserId.Type
// string & Brand<"UserId"> — can't pass a random string where UserId is expected

const Email = Schema.String.pipe(
  Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/),
  Schema.brand("Email"),
)
type Email = typeof Email.Type

// This is a compile error:
const sendEmail = (to: Email) => { /* ... */ }
const userId: UserId = Schema.decodeUnknownSync(UserId)("usr_abc123")
sendEmail(userId) // TS Error: UserId is not assignable to Email
```

### With `Brand.nominal` (no validation, just type branding)

```typescript
import { Brand } from "effect"

type OrderId = string & Brand.Brand<"OrderId">
const OrderId = Brand.nominal<OrderId>()

const id = OrderId("ord_123") // brands without validation
```

Use `Schema.brand` when you want validation + branding. Use `Brand.nominal` when you only need compile-time distinction without runtime checks.

---

## Integrating Schema with Services

### Validating at service boundaries

```typescript
const CreateUserInput = Schema.Struct({
  name: Schema.NonEmptyString,
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+$/)),
  age: Schema.Int.pipe(Schema.greaterThan(0)),
})

class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly create: (
      input: typeof CreateUserInput.Type,
    ) => Effect.Effect<User, ValidationError | DatabaseError>
  }
>() {}

// In the HTTP handler — parse BEFORE passing to service
const handler = Effect.gen(function* () {
  const raw = yield* getRequestBody()
  const input = yield* Schema.decodeUnknown(CreateUserInput)(raw).pipe(
    Effect.mapError((e) => new ValidationError({ message: TreeFormatter.formatErrorSync(e) })),
  )
  const userService = yield* UserService
  return yield* userService.create(input)
})
```

### Schema for API contracts

```typescript
// Define request/response schemas for each endpoint
const GetUserParams = Schema.Struct({
  id: UserId,
})

const GetUserResponse = Schema.Struct({
  id: UserId,
  name: Schema.String,
  email: Email,
  createdAt: Schema.DateFromString,
})

// Validate incoming params AND outgoing response
const getUserHandler = Effect.gen(function* () {
  const params = yield* Schema.decodeUnknown(GetUserParams)(rawParams)
  const user = yield* userService.findById(params.id)
  // Encode the response (Date → string, etc.)
  return yield* Schema.encode(GetUserResponse)(user)
})
```

---

## Data Types Reference

Effect provides immutable, structurally-comparable data types.

### `Data.TaggedEnum`

For discriminated unions with associated methods:

```typescript
type Shape = Data.TaggedEnum<{
  Circle: { radius: number }
  Rectangle: { width: number; height: number }
  Triangle: { base: number; height: number }
}>

const { Circle, Rectangle, Triangle } = Data.taggedEnum<Shape>()

const s = Circle({ radius: 5 })
// s._tag === "Circle"
```

### `Option<A>`

Replaces `null | undefined` with a typed container.

```typescript
import { Option } from "effect"

const findUser = (id: string): Option.Option<User> =>
  users.has(id) ? Option.some(users.get(id)!) : Option.none()

const name = pipe(
  findUser("123"),
  Option.map((u) => u.name),
  Option.getOrElse(() => "Unknown"),
)
```

### `Either<R, L>`

Right-biased either type for computations that don't need the full Effect machinery.

### `Chunk<A>`

An immutable, array-like collection optimized for concatenation and slicing. Used heavily by `Stream`.

### `Redacted<A>`

Wraps a sensitive value so it's masked in logs and `toString`:

```typescript
const secret = Redacted.make("my-api-key")
console.log(secret) // Redacted(<redacted>)
const value = Redacted.value(secret) // "my-api-key" — explicit unwrap
```

---

## Pattern Matching

The `Match` module provides compositional, exhaustive pattern matching.

```typescript
import { Match } from "effect"

const describeShape = Match.type<Shape>().pipe(
  Match.tag("Circle", (s) => `Circle with radius ${s.radius}`),
  Match.tag("Rectangle", (s) => `${s.width}x${s.height} rectangle`),
  Match.tag("Triangle", (s) => `Triangle with base ${s.base}`),
  Match.exhaustive, // compile error if a variant is unhandled
)

// With effects
const processEvent = Match.type<DomainEvent>().pipe(
  Match.tag("OrderPlaced", (e) => saveOrder(e.order)),
  Match.tag("OrderShipped", (e) => notifyCustomer(e.orderId, e.trackingId)),
  Match.tag("OrderCancelled", (e) => issueRefund(e.orderId)),
  Match.exhaustive,
)
```

### Match vs switch

Use `Match` when:
- You want exhaustiveness guaranteed by the compiler
- You want to compose matchers (partial matching, piping)
- You're working with Effect's tagged types

Use `switch` when:
- The logic is trivial (2-3 cases, no composition)
- You're in a pure function context without Effect
- Performance is critical (switch is marginally faster)
