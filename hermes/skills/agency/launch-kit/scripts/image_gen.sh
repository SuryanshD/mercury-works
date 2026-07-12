#!/usr/bin/env bash
# image_gen.sh <prompt> <out.png> [size] — generate site imagery via OpenAI gpt-image-1.
# size: 1536x1024 (default — hero/landscape) | 1024x1024 (square — product/showcase) | 1024x1536 (portrait)
# Reads OPENAI_API_KEY. Fire-safe: on ANY error prints "IMAGE_UNAVAILABLE" and exits 0 (pipeline degrades).
set -uo pipefail
PROMPT="${1:?usage: image_gen.sh <prompt> <out.png> [size]}"
OUT="${2:?usage: image_gen.sh <prompt> <out.png> [size]}"
SIZE="${3:-1536x1024}"
case "$SIZE" in 1024x1024|1536x1024|1024x1536) ;; *) SIZE="1536x1024" ;; esac
[ -n "${OPENAI_API_KEY:-}" ] || { echo "IMAGE_UNAVAILABLE"; exit 0; }

BODY=$(python3 -c 'import json,sys; print(json.dumps({"model":"gpt-image-1","prompt":sys.argv[1],"size":sys.argv[2],"n":1,"quality":"medium"}))' "$PROMPT" "$SIZE")
RESP=$(curl -s -m 120 https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $OPENAI_API_KEY" -H 'Content-Type: application/json' -d "$BODY")

printf '%s' "$RESP" | OUT="$OUT" python3 -c '
import json,sys,base64,os
try: d=json.load(sys.stdin)
except Exception: print("IMAGE_UNAVAILABLE"); sys.exit(0)
b=(d.get("data") or [{}])[0].get("b64_json")
if b:
    open(os.environ["OUT"],"wb").write(base64.b64decode(b))
    print("IMAGE", os.environ["OUT"], os.path.getsize(os.environ["OUT"]), "bytes")
else:
    print("IMAGE_UNAVAILABLE"); print(str(d)[:200])
'
exit 0
