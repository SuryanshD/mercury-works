#!/usr/bin/env bash
# Reusable plumbing — reports one pipeline stage to Convex so Mission Control animates.
# usage: report_progress.sh <job_id> <node> <started|done|failed|skipped> [note] [cost_usd] [tokens]
# Reads CONVEX_REPORT_URL and LLM_MODEL from the environment (set in ~/.hermes/.env).
JOB="$1"; NODE="$2"; STATUS="$3"; NOTE="${4:-}"; COST="${5:-}"; TOK="${6:-}"
URL="${CONVEX_REPORT_URL:?set CONVEX_REPORT_URL in ~/.hermes/.env}"

# If the agent didn't self-report a cost, attribute a DOCUMENTED list-price estimate on 'done' so the
# board shows a real ~$0.28/run instead of $0. These are provider list prices (gpt-5.6-sol tokens,
# gpt-image-1 $0.04/logo folded into engineer, ElevenLabs flash, Linkup). Exact per-step cost is in
# the Langfuse trace — this is a labelled estimate, not a measured total.
if [ -z "$COST" ] && [ "$STATUS" = "done" ]; then
  case "$NODE" in
    research) COST=0.02 ;;
    naming)   COST=0.03 ;;
    review)   COST=0.02 ;;
    copy)     COST=0.06 ;;
    engineer) COST=0.12 ;;
    voice)    COST=0.01 ;;
    learn)    COST=0.02 ;;
  esac
fi

# Build the JSON with python so ANY note (quotes, newlines, backslashes, unicode) stays valid —
# a hand-spliced body silently drops the stage the moment a note contains a double-quote.
BODY=$(python3 -c '
import json, sys
def num(x):
    try:
        return float(x) if "." in x else int(x)
    except Exception:
        return None
job, node, status, note, model, cost, tok = sys.argv[1:8]
print(json.dumps({
    "job_id": job, "node": node, "status": status,
    "note": note, "model": model,
    "cost_usd": num(cost), "tokens": num(tok),
}))
' "$JOB" "$NODE" "$STATUS" "$NOTE" "${LLM_MODEL:-}" "$COST" "$TOK") || exit 0

curl -s -m 5 --retry 2 -X POST "$URL" -H 'Content-Type: application/json' -d "$BODY" \
  >/dev/null 2>&1 || true   # fire-and-forget: reporting must never slow or crash the pipeline
