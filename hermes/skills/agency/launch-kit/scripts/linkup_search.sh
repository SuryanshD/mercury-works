#!/usr/bin/env bash
# linkup_search.sh <query> [standard|deep] — cited web search via Linkup.
# Prints a sourced answer followed by up to 5 SOURCES. Reads LINKUP_API_KEY from env.
# Fire-safe: on any error it prints "LINKUP_UNAVAILABLE" and exits 0 so the pipeline degrades, never fails.
set -uo pipefail

Q="${1:?usage: linkup_search.sh <query> [standard|deep]}"
DEPTH="${2:-standard}"
: "${LINKUP_API_KEY:?set LINKUP_API_KEY in ~/.hermes/.env}"

BODY=$(python3 -c 'import json,sys; print(json.dumps({"q":sys.argv[1],"depth":sys.argv[2],"outputType":"sourcedAnswer"}))' "$Q" "$DEPTH")
RESP=$(curl -s -m 25 -X POST https://api.linkup.so/v1/search \
  -H "Authorization: Bearer $LINKUP_API_KEY" -H "Content-Type: application/json" \
  -d "$BODY")

printf '%s' "$RESP" | python3 -c '
import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    print("LINKUP_UNAVAILABLE"); sys.exit(0)
ans=(d.get("answer") or "").strip()
if not ans:
    print("LINKUP_UNAVAILABLE"); sys.exit(0)
print(ans)
srcs=d.get("sources") or []
if srcs:
    print("\nSOURCES:")
    for s in srcs[:5]:
        name=(s.get("name") or s.get("title") or "").strip()
        print("- %s — %s" % (name, s.get("url","")))
'
