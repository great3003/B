# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### Cantex Swap Bot (`/`) — `artifacts/cantex-bot`
A crypto trading dashboard for automated swaps on the Cantex decentralized exchange (Canton blockchain).

**Features:**
- Multi-account management (add/remove accounts with Ed25519 operator key + secp256k1 trading key)
- Live gas fee tracking with configurable threshold per account
- Swap execution: cBTC ↔ USDCx for any/all accounts
- Auto-swap when gas fee is below threshold
- Full swap history log
- Dark terminal UI (Bloomberg-style)

**Routes:**
- `/` — Dashboard: account summary, gas fee, recent activity
- `/accounts` — Account management: add/delete/configure accounts, manual swaps
- `/history` — Full swap history

### API Server (`/api`) — `artifacts/api-server`
Express 5 backend implementing the Cantex SDK in Node.js using @noble/ed25519 and @noble/secp256k1 for crypto signing.

**Routes:**
- `GET /api/accounts` — List all accounts (keys masked)
- `POST /api/accounts` — Add new account
- `DELETE /api/accounts/:id` — Remove account
- `GET /api/accounts/:id/balances` — Fetch live balances from Cantex API
- `POST /api/accounts/:id/swap` — Execute swap
- `POST /api/accounts/:id/swap-quote` — Get swap quote
- `PATCH /api/accounts/:id/settings` — Update account settings
- `GET /api/gas` — Get current gas fee estimate
- `GET /api/swap-history` — Get all swap history

**DB Tables:**
- `accounts` — account name, keys, settings, auto-swap config
- `swap_history` — log of all executed swaps

**Cantex SDK Implementation:**
The Node.js Cantex client is in `artifacts/api-server/src/lib/cantex.ts`. It implements:
- Ed25519 challenge-response authentication
- Pool info and swap quote fetching
- Intent-based swap signing (secp256k1 DER-encoded)

**Environment Variables:**
- `CANTEX_BASE_URL` — defaults to `https://api.cantex.io`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
