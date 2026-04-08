# Mellow

Autonomous software engineer — a monorepo of interdependent TypeScript packages built with Bun, Turborepo, and Biome.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3.10
- [Docker](https://www.docker.com/) (for PostgreSQL, Redis, OpenSandbox)

### Setup

```bash
# Install dependencies
bun install

# Start infrastructure
docker compose up -d

# Generate database schemas and run migrations
bun run db:generate
bun run db:migrate

# Start all services in watch mode
bun run dev
```

## Scripts

```bash
bun run dev            # Start all services (watch mode)
bun run build          # Build all packages
bun run check-types    # Type-check all workspaces
bun run test           # Run tests across all packages
bun run lint           # Biome lint
bun run lint:fix       # Biome format + lint fix
bun run db:generate    # Generate Drizzle schemas
bun run db:migrate     # Run Drizzle migrations
bun run db:studio      # Open Drizzle Studio
```

## Infrastructure

Docker Compose provides three services:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL 18 | 5433 | Primary database |
| Redis 8.6 | 6380 | Caching and pub/sub |
| OpenSandbox | 8080 | Isolated code execution |

## License

[MIT](LICENSE)
