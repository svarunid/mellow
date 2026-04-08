# Sandbox Architecture

## Overview

Mellow uses [OpenSandbox](https://github.com/alibaba/OpenSandbox) to provide isolated environments for agents to clone projects, build, and run them. The `@mellow/sandbox` package communicates directly with the OpenSandbox server REST API (lifecycle management) and the execd HTTP daemon (command execution, file operations) inside each sandbox — no SDK dependency. The sandbox image is maintained by Mellow and includes common language runtimes with an on-demand installer for less common ones.

## Package Structure

```
packages/sandbox/
├── src/
│   ├── errors.ts         # Operation-specific tagged errors
│   ├── schemas.ts        # Effect Schema for API boundary validation
│   ├── sse.ts            # SSE stream parser (Stream.mapAccum, event-type aware)
│   ├── server.ts         # SandboxServer — singleton lifecycle API service
│   ├── execd.ts          # SandboxExecd — singleton execd API service + ExecdClient
│   ├── sandbox.ts        # Sandbox — scoped agent-facing service + re-exports
│   └── analyze.ts        # Repository cloning for stack analysis
└── dockerfiles/
    ├── sandbox/
    │   ├── Dockerfile    # Main sandbox image (Ubuntu 24.04)
    │   └── install-runtime  # On-demand runtime installer
    └── analysis/
        └── Dockerfile    # Lightweight analysis image (Alpine 3.20 + git)
```

## Service Architecture

Two singleton services (`SandboxServer`, `SandboxExecd`) defined with `Effect.Service` provide exhaustive API coverage. A scoped `Sandbox` service composes them for agent use.

```
SandboxServer (singleton)     SandboxExecd (singleton)
  lifecycle HTTP client         execd HTTP client factory
         ↑                             ↑
         └──────── Sandbox ────────────┘
                   (scoped per-sandbox)
                   provision/teardown in acquireRelease
```

All services use `HttpClient` from `@effect/platform`, `Config` for env vars, `Schema` for response validation, and `FetchHttpClient.layer` for the HTTP implementation.

### SandboxServer

Singleton service wrapping the OpenSandbox lifecycle API (port 8080). Provides: `create`, `list`, `get`, `destroy`, `pause`, `resume`, `renewExpiration`, `getEndpoint`, `logs`, `inspect`, `events`, `summary`.

### SandboxExecd

Singleton service with a `connect(conn: ExecdConnection)` factory that returns a bound `ExecdClient`. The ExecdClient provides exhaustive operations against the execd daemon (port 44772):

- **Commands:** `exec`, `execStream`, `execBackground`, `commandStatus`, `commandLogs`, `killCommand`
- **Sessions:** `createSession`, `sessionExec`, `deleteSession`
- **Code execution:** `createCodeContext`, `listCodeContexts`, `getCodeContext`, `deleteCodeContext`, `deleteCodeContexts`, `executeCode`, `interruptCode`
- **Files:** `readFile`, `readTextFile`, `writeFile`, `fileInfo`, `deleteFiles`, `moveFiles`, `searchFiles`, `replaceInFiles`, `setPermissions`
- **Directories:** `createDirectories`, `deleteDirectories`
- **Metrics:** `metrics`, `watchMetrics`
- **Health:** `ping`

### Sandbox (Agent-Facing)

Scoped per-sandbox service. `Sandbox.make(ref)` creates a Layer via `acquireRelease`. Exposes namespaced sub-objects grouping all ExecdClient methods + lifecycle methods bound to the sandbox's ID.

### SandboxService Interface

| Namespace | Methods | Description |
|---|---|---|
| `commands` | `exec`, `execStream`, `execBackground`, `status`, `logs`, `kill` | Command execution |
| `files` | `read`, `readText`, `write`, `info`, `delete`, `move`, `search`, `replace`, `setPermissions` | File operations |
| `directories` | `create`, `delete` | Directory operations |
| `sessions` | `create`, `exec`, `delete` | Persistent sessions |
| `code` | `createContext`, `listContexts`, `getContext`, `deleteContext`, `deleteContexts`, `execute`, `interrupt` | Code execution contexts |
| `metrics` | `get`, `watch` | System metrics |
| `health` | `ping` | Execd health check |
| `lifecycle` | `pause`, `resume`, `destroy`, `renewExpiration`, `logs`, `inspect`, `events`, `summary`, `getPreviewUrl` | Sandbox lifecycle (pre-bound to ID) |

Sub-interfaces use `ExecdClient["methodName"]` indexed access types — zero signature duplication, always in sync with the source interface.

### Lifecycle

| Function | Description |
|---|---|
| `Sandbox.make({ projectId })` | Create a new sandbox. Returns a scoped Layer. Defaults to `mellow/sandbox:latest`, 2 CPUs, 4 GB memory, no timeout. |
| `Sandbox.make({ sandboxId })` | Resume an existing sandbox. Falls back gracefully if already running (409). |

Lifecycle is managed via Effect's `acquireRelease` pattern:
- **Acquire:** Create or resume sandbox via lifecycle API, then resolve execd endpoint
- **Release:** Pause sandbox (errors ignored)

### Usage

```typescript
import { Sandbox } from "@mellow/sandbox";

// In an Effect.gen block:
const sbx = yield* Sandbox;
const result = yield* sbx.commands.exec("npm run build", { timeoutSeconds: 120 });
console.log(result.stdout);

const content = yield* sbx.files.readText("/workspace/package.json");
yield* sbx.files.write("/workspace/output.txt", "hello");
yield* sbx.directories.create(["/workspace/src/components"]);

const previewUrl = yield* sbx.lifecycle.getPreviewUrl(3000);
```

### Error Types

All errors use `Data.TaggedError` for precise `catchTag` recovery:

**Lifecycle errors:**

| Error | Fields | When |
|---|---|---|
| `SandboxProvisionError` | `sandboxId?`, `message` | Create or resume failed |
| `SandboxNotFoundError` | `sandboxId` | 404 from lifecycle API |
| `SandboxStateConflictError` | `sandboxId`, `message` | 409 — wrong state for operation |
| `EndpointResolveError` | `sandboxId`, `port`, `message` | Failed to resolve execd endpoint |

**Execd errors:**

| Error | Fields | When |
|---|---|---|
| `CommandTimeoutError` | `command`, `timeoutSeconds` | Command exceeded timeout |
| `CommandStreamError` | `message` | SSE stream parsing failure |
| `SessionError` | `sessionId`, `message` | Session operations failed |
| `CodeContextError` | `contextId?`, `message` | Code execution context failed |
| `FileReadError` | `path`, `message` | File download failed / not found |
| `FileWriteError` | `path`, `message` | File upload failed |
| `FilePermissionError` | `path`, `message` | Permission change failed |
| `DirectoryCreateError` | `paths`, `message` | Directory creation failed |
| `DiagnosticsError` | `sandboxId`, `message` | Diagnostics retrieval failed |

**Transport errors:**

| Error | Fields | When |
|---|---|---|
| `SandboxHttpError` | `url`, `statusCode`, `body` | Unexpected HTTP error |
| `SandboxNetworkError` | `url`, `message` | Network failure (DNS, connection refused) |

### Connection Config

Configured via environment variables:

| Variable | Default | Description |
|---|---|---|
| `OPENSANDBOX_DOMAIN` | `localhost:8080` | OpenSandbox server host:port |
| `OPENSANDBOX_API_KEY` | — | API key for authentication |
| `OPENSANDBOX_PROTOCOL` | `http` | `http` or `https` |
| `SANDBOX_IMAGE` | `mellow/sandbox:latest` | Default Docker image for new sandboxes |

## HTTP Architecture

The package communicates with two separate HTTP APIs:

### Lifecycle API (OpenSandbox Server)

Base URL: `${OPENSANDBOX_PROTOCOL}://${OPENSANDBOX_DOMAIN}/v1`

| Method | Path | Purpose |
|---|---|---|
| `POST /sandboxes` | Create sandbox | Image, resources, env, timeout |
| `POST /sandboxes/{id}/pause` | Pause sandbox | Suspend execution |
| `POST /sandboxes/{id}/resume` | Resume sandbox | Restore from pause |
| `DELETE /sandboxes/{id}` | Destroy sandbox | Kill and remove |
| `GET /sandboxes/{id}/endpoints/{port}` | Resolve endpoint | Get address + auth headers |

Auth: `OPEN-SANDBOX-API-KEY` header.

### Execd API (Daemon Inside Sandbox)

Each sandbox runs an execd daemon on port 44772. After creating a sandbox, the endpoint is resolved via the lifecycle API: `GET /sandboxes/{id}/endpoints/44772` returns `{ endpoint, headers }`.

| Method | Path | Purpose |
|---|---|---|
| `POST /command` | Execute command | SSE stream of stdout/stderr/exit_code |
| `GET /files/download?path=...` | Read file | Binary content |
| `POST /files/upload` | Write file | Multipart: metadata JSON + file blob |
| `POST /directories` | Create directories | JSON body with path keys |

Auth: `X-EXECD-ACCESS-TOKEN` header (obtained from endpoint resolution).

Command execution uses Server-Sent Events (SSE) for streaming output. Event types: `stdout`, `stderr`, `error`, `execution_complete`.

## Repository Analysis

The `cloneForAnalysis` function in `src/analyze.ts` clones a repository into a temporary directory using the lightweight `mellow/analysis:latest` Docker image (Alpine 3.20 + git). This keeps the host clean during stack detection.

```typescript
import { cloneForAnalysis } from "@mellow/sandbox/analyze";

const { repoDir, cleanup } = await cloneForAnalysis("https://github.com/user/repo");
// repoDir → /tmp/mellow-analysis-<uuid>/repo (shallow clone)
// cleanup() → removes the temp directory
```

## Sandbox Image

### Base Image (always available)

The base image (Ubuntu 24.04) includes runtimes that cover ~90% of agent tasks:

- **Python** — system Python 3 + uv (version/env/package management) + poetry + ruff
- **Node.js 22 LTS** — via NodeSource + corepack (yarn/pnpm) + Bun
- **Go 1.23.5** — with goimports + staticcheck
- **Rust** — minimal profile + rustfmt + clippy + cargo-binstall
- **C/C++** — clang + GCC (build-essential) + clang-format + llvm + lldb
- **JS/TS tooling** — typescript (tsc) + biome

The image also includes: ripgrep, fd-find, fzf, jq, vim, nano, cmake, ninja-build, openssh-client, htop. A `developer` user runs with passwordless sudo for on-demand installs.

### On-demand Runtimes (`install-runtime`)

Less common runtimes are installed on-demand by the agent after detecting the project stack. This keeps the base image at ~3-4 GB instead of ~10+ GB.

```bash
install-runtime <runtime> [runtime...]
```

| Runtime | What it installs |
|---|---|
| `java` | OpenJDK 21 + Maven + Gradle 8.12 + Kotlin 2.1.0 |
| `ruby` | rbenv + Ruby 3.4.1 + Bundler |
| `php` | PHP 8.3 + Composer |
| `dotnet` | .NET SDK 9.0 |
| `swift` | Swift 6.0.3 |
| `dart` | Dart SDK |
| `lua` | Lua 5.4 + LuaRocks |
| `deno` | Deno runtime |
| `chromium` | Google Chrome Stable (CDP-compatible) |

Version overrides via env vars:

```bash
RUBY_VERSION=3.3.0 install-runtime ruby
SWIFT_VERSION=5.10 KOTLIN_VERSION=2.0.0 install-runtime java swift
```

### Why No LSPs?

Agents don't use LSP servers. They read code directly with grep/read and use the LLM as the intelligence layer. Formatters and linters (ruff, biome, clippy, rustfmt, goimports, staticcheck, clang-format) are kept because agents run them as CLI tools.

## Networking

### Docker Compose Setup

All services run on the same Docker network (`mellow`). OpenSandbox creates sandbox containers on this network via the mounted Docker socket.

```
mellow network
├── mellow-server
├── postgres
├── redis
├── opensandbox-server
└── sandbox-<id>        ← created at runtime, same network
```

Since all services share the `mellow` Docker network, the mellow server connects to OpenSandbox using its container service name:

```
OPENSANDBOX_DOMAIN=opensandbox-server:8080
OPENSANDBOX_PROTOCOL=http
```

Key config in `sandbox.toml`:

```toml
[docker]
network = "sandbox"
host_ip = "host.docker.internal"
```

### Accessing Sandbox Ports

OpenSandbox provides endpoint resolution for any port inside a sandbox via `GET /v1/sandboxes/{id}/endpoints/{port}`. Returns `{ endpoint, headers }` where `endpoint` is `host:port`.

```typescript
// Using the Mellow wrapper
const sbx = yield* Sandbox;
const url = yield* sbx.getPreviewUrl(3000);
```

### Chrome / CDP Access

For browser automation via chrome-devtools-mcp:

```typescript
const sbx = yield* Sandbox;
yield* sbx.exec("install-runtime chromium");
yield* sbx.exec("google-chrome-stable --headless=new --no-sandbox --remote-debugging-port=9222 &");

const cdpUrl = yield* sbx.getPreviewUrl(9222);
// point chrome-devtools-mcp at this URL
```

## User Preview (Production)

When deployed on a cloud VM (AWS/Azure/etc.), users need to access web apps running inside sandboxes from their browsers.

### Network Path

```
User's browser (laptop)
  → Internet
    → Cloud VM public IP
      → Reverse proxy (Traefik/Caddy/Nginx) — TLS termination
        → OpenSandbox ingress
          → Sandbox container port
```

### Routing Strategies

**Subdomain routing (recommended)**

```
https://<sandbox-id>-<port>.sandbox.mellow.dev → sandbox container:port
```

Requires:
- Wildcard DNS: `*.sandbox.mellow.dev → VM public IP`
- Wildcard TLS cert (Let's Encrypt)
- OpenSandbox ingress configured in wildcard mode

**Path-based routing (simpler DNS)**

```
https://mellow.dev/sandbox/<sandbox-id>/<port>/ → sandbox container:port
```

No wildcard DNS needed, but can break apps that use absolute paths.

### OpenSandbox Ingress Config

```toml
[ingress]
# Wildcard mode
mode = "wildcard"
domain = "sandbox.mellow.dev"

# OR URI-based mode
# mode = "uri"
# domain = "mellow.dev"
```

### Infrastructure Requirements

| Piece | Purpose |
|---|---|
| Wildcard DNS | `*.sandbox.mellow.dev → VM IP` |
| Wildcard TLS | Let's Encrypt cert for `*.sandbox.mellow.dev` |
| Reverse proxy | TLS termination + subdomain routing to OpenSandbox |
| OpenSandbox ingress | Routes to the correct sandbox container + port |
| Mellow server | Constructs public preview URL and sends it to the UI |

### User Experience

The Mellow web UI renders a preview panel with the proxied URL:

```
┌─ Mellow UI ───────────────────────────────────┐
│                                               │
│  Task: Build landing page                     │
│  Status: Dev server running                   │
│                                               │
│  ┌─ Preview ───────────────────────────────┐  │
│  │ https://abc123-3000.sandbox.mellow.dev  │  │
│  │                                         │  │
│  │   [Live preview of the web app]         │  │
│  │                                         │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```
