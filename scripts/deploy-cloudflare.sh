#!/usr/bin/env bash
set -euo pipefail

# ─── Paperclip — Cloudflare Deploy Script ───────────
# Usage:
#   ./scripts/deploy-cloudflare.sh [pages|worker|all] [staging|production]
#
# Examples:
#   ./scripts/deploy-cloudflare.sh pages production
#   ./scripts/deploy-cloudflare.sh worker staging
#   ./scripts/deploy-cloudflare.sh all production

TARGET="${1:-all}"
ENV="${2:-production}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

is_wsl() {
  # WSL1/WSL2 expose "microsoft" in the kernel release
  uname -r 2>/dev/null | tr '[:upper:]' '[:lower:]' | grep -q microsoft
}

to_windows_path() {
  local p="$1"
  if command -v wslpath &>/dev/null; then
    wslpath -w "$p"
  else
    echo "$p"
  fi
}

run_powershell() {
  # Prefer PowerShell (Windows) when available (e.g. from WSL)
  if command -v powershell.exe &>/dev/null; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$1"
    return $?
  fi
  echo "❌ powershell.exe not found; cannot run Windows-side deploy."
  return 1
}

echo "══════════════════════════════════════════"
echo "  Paperclip Cloudflare Deploy"
echo "  Target: $TARGET | Env: $ENV"
echo "══════════════════════════════════════════"

# ─── Validate wrangler is available ──────────────────
if ! command -v wrangler &>/dev/null && ! npx wrangler --version &>/dev/null; then
  echo "❌ wrangler not found. Install: npm i -g wrangler"
  exit 1
fi

# ─── Deploy Pages (frontend) ────────────────────────
deploy_pages() {
  echo ""
  echo "▸ Building frontend..."
  cd "$ROOT_DIR"
  if ! command -v node &>/dev/null && is_wsl; then
    # WSL without Node: run the frontend build on Windows
    ROOT_DIR_WIN="$(to_windows_path "$ROOT_DIR")"
    run_powershell "cd '$ROOT_DIR_WIN'; pnpm --filter @paperclipai/ui build"
  else
    pnpm --filter @paperclipai/ui build
  fi

  echo "▸ Deploying to Cloudflare Pages..."
  if ! command -v node &>/dev/null && is_wsl; then
    # WSL without Node: run the Pages deploy on Windows (needs npx + wrangler on PATH)
    UI_DIR_WIN="$(to_windows_path "$ROOT_DIR/ui")"
    if [ "$ENV" = "production" ]; then
      run_powershell "cd '$UI_DIR_WIN'; npx wrangler pages deploy dist --project-name=paperclip-ui --branch=main"
    else
      run_powershell "cd '$UI_DIR_WIN'; npx wrangler pages deploy dist --project-name=paperclip-ui --branch=staging"
    fi
  else
    cd "$ROOT_DIR/ui"
    if [ "$ENV" = "production" ]; then
      npx wrangler pages deploy dist --project-name=paperclip-ui --branch=main
    else
      npx wrangler pages deploy dist --project-name=paperclip-ui --branch=staging
    fi
  fi

  echo "✅ Pages deployed ($ENV)"
}

# ─── Deploy Worker (edge proxy) ─────────────────────
deploy_worker() {
  echo ""
  echo "▸ Deploying Worker..."
  cd "$ROOT_DIR/worker"

  # Install worker dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo "  Installing worker dependencies..."
    npm install
  fi

  if [ "$ENV" = "production" ]; then
    npx wrangler deploy --env production
  elif [ "$ENV" = "staging" ]; then
    npx wrangler deploy --env staging
  else
    npx wrangler deploy
  fi

  echo "✅ Worker deployed ($ENV)"
}

# ─── Execute ─────────────────────────────────────────
case "$TARGET" in
  pages)
    deploy_pages
    ;;
  worker)
    deploy_worker
    ;;
  all)
    deploy_worker
    deploy_pages
    ;;
  *)
    echo "❌ Unknown target: $TARGET (use: pages, worker, or all)"
    exit 1
    ;;
esac

echo ""
echo "══════════════════════════════════════════"
echo "  Deploy complete!"
echo "══════════════════════════════════════════"
