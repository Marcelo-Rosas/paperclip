---
name: deploy
description: Deploy Paperclip to Cloudflare (Pages, Worker, or both). Use when you need to deploy changes to Cloudflare after editing ui/ or worker/ files.
user_invocable: true
---

# Deploy to Cloudflare

Deploy the Paperclip frontend (Cloudflare Pages) and/or edge worker (Cloudflare Workers).

## Arguments

- `pages` — deploy only the frontend UI
- `worker` — deploy only the edge worker
- `all` (default) — deploy both worker + pages
- Append `staging` or `production` (default: `production`) for the environment

Examples: `/deploy`, `/deploy pages staging`, `/deploy worker production`, `/deploy all staging`

## Instructions

1. Parse the arguments. Defaults: target=`all`, env=`production`.
2. Confirm with the user before deploying to **production**. For staging, proceed directly.
3. Run the deploy script from the project root:

```bash
bash scripts/deploy-cloudflare.sh <target> <env>
```

4. Stream the full output to the user.
5. If the deploy **fails**:
   - Check if `wrangler` is installed (`npx wrangler --version`)
   - Check if the user is authenticated (`npx wrangler whoami`)
   - Suggest fixes based on the error output
6. On success, report the deployed target and environment.
