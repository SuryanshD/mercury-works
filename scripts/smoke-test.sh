#!/usr/bin/env bash
# Mercury Works — provider smoke test.
# Run after pasting any new credentials (esp. on event day): `bash scripts/smoke-test.sh`
# Read-only checks only — never mutates anything. Prints ✅ / ❌ per provider.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
[ -f .env ] && set -a && . ./.env && set +a

ok(){ printf "  ✅ %s\n" "$1"; }
bad(){ printf "  ❌ %s — %s\n" "$1" "$2"; FAIL=1; }
FAIL=0
echo "── Mercury Works smoke test ──"

# LLM (whichever provider is selected)
if [ "${LLM_PROVIDER:-}" = "openai-api" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' https://api.openai.com/v1/models -H "Authorization: Bearer ${OPENAI_API_KEY:-}")
  [ "$code" = "200" ] && ok "OpenAI (gpt: ${LLM_MODEL:-?})" || bad "OpenAI" "HTTP $code — key/credits?"
else
  # NOTE: this only confirms the AI Studio key is valid at Google. The agent runs the model
  # THROUGH Hermes, where on a fresh free key only the "-latest" aliases work
  # (gemini-flash-latest / gemini-flash-lite-latest); gemini-2.5-pro is 429 quota-0 and the
  # pinned 2.5/2.0 flash versions 404 for new users.
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY:-}")
  [ "$code" = "200" ] && ok "Gemini (${LLM_MODEL:-?})" || bad "Gemini" "HTTP $code — AI Studio key?"
fi

# Linkup
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST https://api.linkup.so/v1/search \
  -H "Authorization: Bearer ${LINKUP_API_KEY:-}" -H 'Content-Type: application/json' \
  -d '{"q":"hello","depth":"standard","outputType":"searchResults"}')
[ "$code" = "200" ] && ok "Linkup" || bad "Linkup" "HTTP $code"

# ElevenLabs
code=$(curl -s -o /dev/null -w '%{http_code}' https://api.elevenlabs.io/v1/user -H "xi-api-key: ${ELEVENLABS_API_KEY:-}")
[ "$code" = "200" ] && ok "ElevenLabs" || bad "ElevenLabs" "HTTP $code"

# Razorpay (test keys) — list payment links (read-only)
code=$(curl -s -o /dev/null -w '%{http_code}' -u "${RAZORPAY_KEY_ID:-}:${RAZORPAY_KEY_SECRET:-}" https://api.razorpay.com/v1/payment_links)
[ "$code" = "200" ] && ok "Razorpay (test mode)" || bad "Razorpay" "HTTP $code — rzp_test_* keys?"

# Convex deployment reachable
if [ -n "${CONVEX_URL:-}" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' "${CONVEX_URL}")
  [ "$code" != "000" ] && ok "Convex reachable" || bad "Convex" "unreachable — check CONVEX_URL"
else bad "Convex" "CONVEX_URL not set"; fi

# Cloudflare wrangler auth
if command -v wrangler >/dev/null 2>&1 && npx --no-install wrangler whoami >/dev/null 2>&1; then
  ok "Cloudflare (wrangler)"
else bad "Cloudflare" "run: npx wrangler login"; fi

# Hermes agent container (personal laptop only) — driven via `docker exec`, no HTTP API
if docker exec hermes hermes skills list >/dev/null 2>&1; then
  ok "Hermes agent (container up; invoked via: docker exec hermes hermes -z \"<job>\" --yolo)"
else
  printf "  ⚠️  Hermes agent — container not reachable (expected only on the personal laptop with the hermes container running via 'gateway run')\n"
fi

echo "──"
[ "$FAIL" = "0" ] && echo "ALL GREEN ✅" || { echo "SOME RED ❌ — fix before demo"; exit 1; }
