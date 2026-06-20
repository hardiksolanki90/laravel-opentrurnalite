# OpenTrurnalite

Open-source reverse tunnel platform inspired by Cloudflare Tunnel. Securely exposes local and private applications to the internet — no port forwarding, no inbound firewall changes required.

---

## What It Does

OpenTrurnalite acts as a bridge between your private local server and the public internet. A lightweight agent runs beside your app, opens an outbound WebSocket connection to the tunnel server, and the server forwards all public traffic back through that connection.

```
Browser → tunnel-server.opentrurnalite.io → [WebSocket] → tunnel-agent → localhost:8080
```

**Supported traffic:**
- Web apps (Laravel, React, Next.js, WordPress)
- REST APIs
- WebSockets
- Static sites
- Custom domains with TLS/HTTPS

---

## Monorepo Structure

```
opentrurnalite/
├── apps/
│   ├── api/              # Fastify REST API (auth, tunnel management)
│   ├── dashboard/        # React web dashboard
│   ├── tunnel-server/    # (Phase 2) WebSocket proxy server
│   └── tunnel-agent/     # (Phase 2) Agent that runs beside your app
├── packages/
│   ├── auth/             # bcrypt hashing + JWT signing/verification
│   ├── shared/           # Error classes shared across all packages
│   ├── proxy/            # (Phase 2) HTTP proxy logic
│   ├── protocol/         # (Phase 2) Tunnel wire protocol
│   ├── tunnel-core/      # (Phase 2) Core tunnel session logic
│   ├── metrics/          # (Phase 3) Prometheus metrics
│   └── logging/          # (Phase 3) Structured logging
├── sdk/
│   ├── laravel-opentrurnalite/   # (Phase 4) Laravel Composer package
│   └── js-sdk/                   # (Phase 4) JavaScript SDK
├── infra/
│   ├── docker/           # Dockerfile + Docker Compose
│   ├── k8s/              # (Phase 5) Kubernetes manifests
│   ├── monitoring/       # (Phase 5) Prometheus + Grafana configs
│   └── nginx/            # Reverse proxy config
└── prisma/
    └── schema.prisma     # Database schema
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24+ |
| Language | TypeScript 5 (strict, NodeNext modules) |
| API framework | Fastify 5 |
| ORM | Prisma 7 with `@prisma/adapter-pg` driver |
| Database | PostgreSQL 16 |
| Cache / pub-sub | Redis 7 |
| Password hashing | bcryptjs (cost factor 12) |
| JWT | jsonwebtoken (7-day expiry) |
| Validation | Zod |
| Monorepo | Turborepo 2 + pnpm 11 workspaces |
| Dashboard | React 18, Vite 5, TailwindCSS 3 |
| State | Zustand with localStorage persistence |
| Data fetching | TanStack Query v5 + axios |
| Tests | Vitest (in-memory mocks, no Docker required) |
| Container | Docker + Docker Compose |

---

## Prerequisites

- Node.js 24+
- pnpm 11 (`npm install -g pnpm@11.8.0`)
- Docker Desktop (for PostgreSQL + Redis)

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/opentrurnalite
cd opentrurnalite
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/opentrurnalite"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-minimum-32-characters-long"
PORT=3000
NODE_ENV=development
```

`JWT_SECRET` must be at least 32 characters. The API will refuse to start if it's shorter.

### 3. Start infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
```

### 4. Run database migration

```bash
pnpm db:migrate
# prompts for migration name, enter: init_users
```

### 5. Start development servers

```bash
pnpm dev
# Starts API on :3000 and Dashboard on :5173 in parallel via Turborepo
```

---

## Docker (Full Stack)

Run everything — Postgres, Redis, and API — in containers:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

API available at `http://localhost:3000`.

The `api` service waits for both `postgres` and `redis` to pass healthchecks before starting.

---

## API Reference

Base URL: `http://localhost:3000`

### Health

```
GET /health
```

Response:
```json
{ "status": "ok" }
```

### Register

```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "minimum8chars",
  "name": "Jane Doe"
}
```

Response `201`:
```json
{
  "token": "<jwt>",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "Jane Doe",
    "createdAt": "2026-06-20T00:00:00.000Z"
  }
}
```

Errors:
- `400` — validation failed (invalid email, password < 8 chars, missing name)
- `409` — email already registered

### Login

```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "minimum8chars"
}
```

Response `200`:
```json
{
  "token": "<jwt>",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "Jane Doe",
    "createdAt": "2026-06-20T00:00:00.000Z"
  }
}
```

Errors:
- `400` — validation failed
- `401` — invalid credentials (same message whether email unknown or password wrong — prevents user enumeration)

### Authenticated requests

Include the JWT as a Bearer token:

```
Authorization: Bearer <token>
```

Token expires after 7 days.

---

## Dashboard

React SPA served at `http://localhost:5173` in development.

**Routes:**
- `/login` — sign in with email + password
- `/register` — create a new account
- All other routes redirect to `/login`

After login, the JWT is stored in `localStorage` and attached automatically to every API request via an axios interceptor.

---

## Packages

### `packages/shared`

Error classes shared across API, agent, and SDK.

```typescript
import { AppError, NotFoundError, UnauthorizedError, ConflictError } from '@opentrurnalite/shared'

throw new NotFoundError('Tunnel')        // 404, code: NOT_FOUND
throw new UnauthorizedError()            // 401, code: UNAUTHORIZED
throw new ConflictError('Name in use')   // 409, code: CONFLICT
```

All extend `AppError` which carries `code` (machine-readable string) and `statusCode` (HTTP status).

### `packages/auth`

Password hashing and JWT operations.

```typescript
import { hashPassword, verifyPassword, signToken, verifyToken } from '@opentrurnalite/auth'

// Hash a password (bcrypt, cost 12, ~250ms)
const hash = await hashPassword('plaintext')

// Verify
const ok = await verifyPassword('plaintext', hash)  // true

// Sign a JWT (7-day expiry)
const token = signToken({ sub: userId, email }, secret)

// Verify — throws UnauthorizedError if invalid/expired
const payload = verifyToken(token, secret)
// payload.sub = userId, payload.email = email
```

---

## How It Works

### Authentication flow

```
Client                    API                         Database
  |                        |                              |
  |-- POST /auth/register ->|                              |
  |                        |-- findUnique(email) -------->|
  |                        |<- null (not found) ----------|
  |                        |-- bcrypt.hash(password) ---> (cpu)
  |                        |-- user.create() ------------>|
  |                        |<- user row ------------------|
  |                        |-- jwt.sign(userId, email) -->|
  |<-- 201 {token, user} --|                              |
```

**Security design:**
- bcrypt cost factor 12: each hash takes ~250ms, making brute-force impractical
- Login always runs bcrypt even for unknown emails (timing-safe — prevents measuring whether an email exists)
- P2002 (duplicate email) caught from database as a fallback to prevent TOCTOU race between check and insert
- JWT secret validated at startup — must be 32+ chars, server exits if missing

### Plugin architecture (Fastify)

The API uses Fastify's plugin system with `fastify-plugin` (`fp`) for dependency injection:

```
app
├── prisma plugin      → app.prisma (PrismaClient)
├── redis plugin       → app.redis (IORedis)
└── routes
    ├── GET  /health
    ├── POST /auth/register
    └── POST /auth/login
```

Each plugin decorates the Fastify instance. Routes access `app.prisma` and `app.redis` directly. `onClose` hooks disconnect both cleanly on shutdown.

### Prisma 7 configuration

Prisma 7 removed the `url` field from `schema.prisma`. Connection is configured via `prisma.config.ts` using a driver adapter:

```typescript
// prisma.config.ts
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
export default defineConfig({ adapter })
```

This same pattern is used at runtime in `apps/api/src/plugins/prisma.ts`.

### Dashboard state

```
Zustand store (auth.ts)
├── token: string | null
├── user: User | null
├── setAuth(token, user)   → writes to store + localStorage
└── clearAuth()            → clears store + localStorage

axios interceptor (api.ts)
└── reads localStorage.token → adds Authorization: Bearer <token>
```

---

## Running Tests

Tests use Vitest with in-memory mock Prisma — no database connection needed.

```bash
# All packages
pnpm test

# API only
pnpm --filter=@opentrurnalite/api test

# Watch mode
pnpm --filter=@opentrurnalite/api test -- --watch
```

**Test coverage (Phase 1):**
- `GET /health` → returns `{ status: 'ok' }`
- `POST /auth/register` → creates user, returns token; rejects duplicate email
- `POST /auth/login` → returns token on valid credentials; rejects unknown email; rejects wrong password

---

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode (Turborepo parallel) |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all test suites |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:generate` | Regenerate Prisma client |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Min 32 chars. Used to sign/verify JWTs |
| `PORT` | No | API port (default: `3000`) |
| `NODE_ENV` | No | `development` / `production` / `test` |

The API validates all variables on startup via Zod and exits with a descriptive error if any are invalid.

---

## Roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| Phase 1 | Done | Monorepo, API auth, Dashboard, Docker |
| Phase 2 | Planned | WebSocket tunnel protocol, agent, HTTP proxy, HTTPS |
| Phase 3 | Planned | Dashboard features, domains, logs, metrics, API keys |
| Phase 4 | Planned | Laravel SDK, JS SDK, Artisan commands |
| Phase 5 | Planned | HA tunnel servers, Redis cluster, Kubernetes, TLS automation |

---

## Branding

| Item | Value |
|------|-------|
| Project | OpenTrurnalite |
| CLI | `opentrurnalite` |
| Dashboard | dashboard.opentrurnalite.io |
| API | api.opentrurnalite.io |
| Docs | docs.opentrurnalite.io |
| Laravel package | `laravel-opentrurnalite` |
| Tunnel domain | `*.opentrurnalite.io` |

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Follow TDD — write failing test first, then implementation
4. Run `pnpm test` — all tests must pass
5. Run `pnpm build` — no TypeScript errors
6. Open a pull request

---

## License

MIT
