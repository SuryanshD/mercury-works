#!/usr/bin/env bash
# logo_gen.sh <prompt> <out.png> — generate a brand logo via OpenAI gpt-image-1.
# Reads OPENAI_API_KEY. Fire-safe: on error prints "LOGO_UNAVAILABLE" and exits 0 (pipeline degrades).
set -uo pipefail
PROMPT="${1:?usage: logo_gen.sh <prompt> <out.png>}"
OUT="${2:?usage: logo_gen.sh <prompt> <out.png>}"
: "${OPENAI_API_KEY:?set OPENAI_API_KEY in ~/.hermes/.env}"

BODY=$(python3 -c 'import json,sys; print(json.dumps({"model":"gpt-image-1","prompt":sys.argv[1],"size":"1024x1024","n":1,"quality":"medium"}))' "$PROMPT")
RESP=$(curl -s -m 90 https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $OPENAI_API_KEY" -H 'Content-Type: application/json' -d "$BODY")

printf '%s' "$RESP" | OUT="$OUT" python3 -c '
import json,sys,base64,os
try: d=json.load(sys.stdin)
except Exception: print("LOGO_UNAVAILABLE"); sys.exit(0)
b=(d.get("data") or [{}])[0].get("b64_json")
if b:
    open(os.environ["OUT"],"wb").write(base64.b64decode(b))
    print("LOGO", os.environ["OUT"], os.path.getsize(os.environ["OUT"]), "bytes")
else:
    print("LOGO_UNAVAILABLE"); print(str(d)[:200])
'
