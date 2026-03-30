#!/usr/bin/env bash
# deploy-reminder.sh — checks if ui/ or worker/ files were modified
# Used as a Claude Code post-edit hook to remind about deploys

changed=$(git diff --name-only 2>/dev/null || true)

has_ui=false
has_worker=false

while IFS= read -r file; do
  case "$file" in
    ui/*) has_ui=true ;;
    worker/*) has_worker=true ;;
  esac
done <<< "$changed"

if $has_ui && $has_worker; then
  echo "[deploy-hint] ui/ and worker/ changed — run /deploy when ready"
elif $has_ui; then
  echo "[deploy-hint] ui/ changed — run /deploy pages when ready"
elif $has_worker; then
  echo "[deploy-hint] worker/ changed — run /deploy worker when ready"
fi
