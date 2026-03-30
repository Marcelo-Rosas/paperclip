# Paperclip — Cloudflare Deployment Guide

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Cloudflare Edge                      │
│                                                       │
│  ┌────────────────┐     ┌──────────────────────────┐  │
│  │ Cloudflare      │     │ Cloudflare Worker         │  │
│  │ Pages (SPA)     │────▸│ (edge proxy)              │  │
│  │ ui/dist/*       │     │ - CORS / security headers │  │
│  │                 │     │ - Rate limiting            │  │
│  └────────────────┘     │ - Proxy to origin          │  │
│                          └────────────┬─────────────┘  │
└───────────────────────────────────────┼────────────────┘
                                        │
                          ┌─────────────▼──────────────┐
                          │  Origin Server              │
                          │  Express 5 + PostgreSQL     │
                          │  WebSocket + Agents         │
                          │  (Docker on Railway/Fly/VM) │
                          └────────────────────────────┘
```

| Layer | Tech | What it serves |
|-------|------|---------------|
| **Pages** | Cloudflare Pages | Static SPA (React/Vite build) |
| **Worker** | Cloudflare Worker + Hono | Edge proxy, rate limiting, security headers |
| **Origin** | Express 5 + Node.js | Full API, WebSocket, agents, plugins, DB |

### Why the Express server can't run on Workers

The server uses embedded PostgreSQL, WebSocket (ws), file system, child processes (agent adapters), and worker threads (plugins). These are incompatible with the Workers runtime. The origin server must run on a platform that supports Node.js (Docker recommended).

---

## Prerequisites

- Node.js >= 20
- pnpm 9.15+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`
- Origin server deployed and accessible (Docker on Railway, Fly.io, Render, VPS, etc.)

---

## Local Development

```bash
# 1. Start the Express server (origin)
pnpm dev

# 2. In another terminal — start the edge Worker
cd worker
npm install
npx wrangler dev

# 3. Frontend dev server (already proxies /api to localhost:3100)
pnpm dev:ui
```

The Vite dev server at `http://localhost:5173` proxies `/api/*` directly to `localhost:3100`. The Worker is optional during local dev but useful for testing edge behavior.

---

## Environment Variables

### Frontend (Cloudflare Pages)

No secrets in the frontend. All API calls go to `/api/*` which is proxied by the Worker.

If you need public config (e.g., feature flags), use Vite's `VITE_` prefix in the Pages dashboard:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_NAME` | App display name (optional) | `Paperclip` |

### Worker Secrets

Set via `wrangler secret put` (never commit these):

| Secret | Description | Required |
|--------|-------------|----------|
| `RATE_LIMIT_BYPASS_TOKEN` | Token to bypass rate limiting (CI/monitoring) | No |

### Worker Variables (non-secret)

Set in `wrangler.toml` per environment:

| Variable | Description |
|----------|-------------|
| `ORIGIN_URL` | Full URL of the origin Express server |
| `ENVIRONMENT` | `development`, `staging`, or `production` |

### Origin Server

Same as current `.env` — `DATABASE_URL`, `PORT`, `PAPERCLIP_*` variables. No changes needed.

---

## Deployment — Step by Step

### 1. Login to Cloudflare

```bash
wrangler login
```

### 2. Create the Pages project (first time only)

```bash
cd ui
npx wrangler pages project create paperclip-ui
```

### 3. Deploy the Worker

```bash
cd worker
npm install

# Set the origin URL for production
# Edit wrangler.toml [env.production] ORIGIN_URL to your actual origin

# Deploy
npx wrangler deploy --env production
```

### 4. Set Worker secrets (first time only)

```bash
cd worker

# Optional rate limit bypass token
npx wrangler secret put RATE_LIMIT_BYPASS_TOKEN --env production
```

### 5. Update Pages _redirects

After deploying the Worker, you'll get a URL like `https://paperclip-edge-production.YOUR_SUBDOMAIN.workers.dev`.

Edit `ui/_redirects` and replace the placeholder URLs:

```
/api/*  https://paperclip-edge-production.YOUR_SUBDOMAIN.workers.dev/api/:splat  200
/edge/* https://paperclip-edge-production.YOUR_SUBDOMAIN.workers.dev/edge/:splat 200
/*  /index.html  200
```

### 6. Build and deploy Pages

```bash
# From project root
pnpm --filter @paperclipai/ui build

# Deploy
cd ui
npx wrangler pages deploy dist --project-name=paperclip-ui --branch=main
```

### 7. Quick deploy script (after initial setup)

```bash
# Deploy everything to production
./scripts/deploy-cloudflare.sh all production

# Deploy only frontend
./scripts/deploy-cloudflare.sh pages production

# Deploy only worker
./scripts/deploy-cloudflare.sh worker staging
```

---

## Custom Domain (optional)

1. In the Cloudflare dashboard, go to **Pages > paperclip-ui > Custom Domains**
2. Add your domain (e.g., `app.paperclip.com`)
3. Update the Worker CORS origins in `worker/src/index.ts` to include your domain
4. If using a custom domain for the Worker too, add it via **Workers > paperclip-edge > Triggers > Custom Domains**

---

## Staging vs Production

| | Staging | Production |
|---|---------|-----------|
| **Pages branch** | `staging` | `main` |
| **Worker env** | `--env staging` | `--env production` |
| **Worker name** | `paperclip-edge-staging` | `paperclip-edge-production` |
| **Origin** | Your staging server | Your production server |

```bash
# Deploy to staging
./scripts/deploy-cloudflare.sh all staging

# Deploy to production
./scripts/deploy-cloudflare.sh all production
```

---

## Monitoring

```bash
# Tail Worker logs in real-time
cd worker
npx wrangler tail --env production

# Check edge health
curl https://paperclip-edge-production.YOUR_SUBDOMAIN.workers.dev/edge/health
```
