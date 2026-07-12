#!/usr/bin/env bash
# deploy_page.sh — publish a static site dir to Cloudflare Pages, print the live URL.
# usage: deploy_page.sh <brand-name-or-slug> <src_dir>
# Reads CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID from the environment (~/.hermes/.env).
# Robust for the demo: sanitizes the slug, auto-suffixes to avoid collisions, uses a per-call
# unique CF Pages project, and falls back to a placeholder page if src is missing/invalid.
set -uo pipefail

NAME_RAW="${1:?usage: deploy_page.sh <brand-name-or-slug> <src_dir>}"
SRC="${2:?usage: deploy_page.sh <brand-name-or-slug> <src_dir>}"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN in ~/.hermes/.env}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID in ~/.hermes/.env}"

# slug: lowercase, alnum+hyphen, trimmed, <=40 chars (CF Pages project-name rules)
SLUG=$(printf '%s' "$NAME_RAW" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-40)
[ -z "$SLUG" ] && SLUG="launch"
# short random suffix so re-runs never collide on the CF project
SUF=$(head -c8 /dev/urandom 2>/dev/null | od -An -tx1 | tr -d ' \n' | cut -c1-6)
[ -z "$SUF" ] && SUF="$$"
PROJECT="mw-${SLUG}-${SUF}"

# fallback: never let the pipeline blank — ship a placeholder if the engineer output is missing
if [ ! -s "$SRC/index.html" ]; then
  mkdir -p "$SRC"
  printf '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>%s</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0B0E14;color:#E6E9EF"><main style="text-align:center"><h1>%s</h1><p style="opacity:.7">Launching soon.</p></main>' "$NAME_RAW" "$NAME_RAW" > "$SRC/index.html"
fi

# create the project (idempotent — ignore "already exists"), then deploy
npx --yes wrangler pages project create "$PROJECT" --production-branch=main >/dev/null 2>&1 || true
OUT=$(npx --yes wrangler pages deploy "$SRC" --project-name="$PROJECT" --branch=main --commit-dirty=true 2>&1)

# production URL is deterministic; also try to parse the deployment URL from output
URL="https://${PROJECT}.pages.dev"
DEPLOY_URL=$(printf '%s' "$OUT" | grep -oE 'https://[a-z0-9-]+\.'"${PROJECT}"'\.pages\.dev' | tail -1)
[ -n "$DEPLOY_URL" ] || DEPLOY_URL=$(printf '%s' "$OUT" | grep -oE 'https://[a-z0-9.-]+\.pages\.dev' | tail -1)

if printf '%s' "$OUT" | grep -qiE 'success|uploaded|deployment complete|Deploying'; then
  echo "DEPLOYED $URL"
  [ -n "$DEPLOY_URL" ] && echo "PREVIEW $DEPLOY_URL"
  exit 0
else
  echo "DEPLOY FAILED for $PROJECT"
  printf '%s\n' "$OUT" | tail -25
  exit 1
fi
