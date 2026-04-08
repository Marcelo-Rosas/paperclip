# CLAUDE.md

Project memory for Claude Code sessions working in the Paperclip repository.

## What is Paperclip

Paperclip is the control plane for autonomous AI companies. It orchestrates AI agents as employees within company structures — managing task assignment, budget/cost tracking, org charts, goal hierarchies, and governance. One Paperclip instance can run multiple companies.

Paperclip is NOT an agent runtime. It orchestrates agents that run externally and phone home via adapters.

## Repo Structure

- `server/` — Express REST API and orchestration services
- `ui/` — React + Vite board UI
- `packages/db/` — Drizzle schema, migrations, DB clients (PGlite for dev, Postgres for prod)
- `packages/shared/` — shared types, constants, validators, API path constants
- `packages/adapters/` — agent adapter implementations (Claude, Codex, Cursor, Gemini, HTTP, process, etc.)
- `packages/adapter-utils/` — shared adapter utilities
- `packages/plugins/` — plugin system packages
- `cli/` — CLI tool (`pnpm paperclipai`)
- `doc/` — operational and product docs
- `docs/` — public-facing documentation
- `.agents/skills/` — bundled agent skills (company-creator, doc-maintenance, release, etc.)
- `.claude/skills/` — Claude Code skills (deploy, design-guide)

## Key Docs (read order)

1. `doc/GOAL.md` — vision and purpose
2. `doc/PRODUCT.md` — product definition and core concepts
3. `doc/SPEC-implementation.md` — V1 build contract (the concrete spec)
4. `doc/DEVELOPING.md` — dev setup and workflow
5. `doc/DATABASE.md` — database conventions

`doc/SPEC.md` is long-horizon product context. `doc/SPEC-implementation.md` is the concrete V1 build contract.

## Dev Setup

```sh
pnpm install
pnpm dev
```

- API + UI: `http://localhost:3100` (UI served by API server in dev middleware mode)
- Leave `DATABASE_URL` unset for embedded PGlite (zero-config dev DB)
- Reset dev DB: `rm -rf data/pglite && pnpm dev`
- Prerequisites: Node.js 20+, pnpm 9+

## Verification Commands

```sh
pnpm -r typecheck    # type checking across all packages
pnpm test:run        # run tests
pnpm build           # full build
```

Always run all three before claiming a change is done.

## Database Changes

1. Edit `packages/db/src/schema/*.ts`
2. Export new tables from `packages/db/src/schema/index.ts`
3. `pnpm db:generate` (generates migration — compiles packages/db first)
4. `pnpm -r typecheck` to validate

## Core Engineering Rules

1. **Company-scoped** — every domain entity is scoped to a company; enforce company boundaries in routes/services
2. **Keep contracts synchronized** — changes to schema/API must update all layers: `packages/db` → `packages/shared` → `server` → `ui`
3. **Preserve control-plane invariants** — single-assignee tasks, atomic issue checkout, approval gates, budget hard-stop, activity logging
4. **Additive doc updates** — don't replace strategic docs wholesale
5. **Plan docs** — new plans go in `doc/plans/` with `YYYY-MM-DD-slug.md` naming

## API and Auth

- Base path: `/api`
- Board access = full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- All endpoints need: company access checks, actor permissions, activity log entries for mutations, consistent HTTP errors

## Lockfile Policy

Do NOT commit `pnpm-lock.yaml` in pull requests. GitHub Actions owns the lockfile.

## Architecture Principles

- Control plane, not execution plane — Paperclip orchestrates, agents run externally
- Adapter config defines the agent — each agent has an adapter type + config
- All work traces to the company goal through hierarchical task parentage
- Unopinionated about agent runtime — Claude Code, Codex, scripts, HTTP, anything callable
