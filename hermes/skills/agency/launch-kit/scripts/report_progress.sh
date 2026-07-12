#!/usr/bin/env bash
# Reusable plumbing — reports one pipeline stage to Convex so Mission Control animates.
# usage: report_progress.sh <job_id> <node> <started|done|failed|skipped> [note] [cost_usd] [tokens]
# Reads CONVEX_REPORT_URL and LLM_MODEL from the environment (set in ~/.hermes/.env).
JOB="$1"; NODE="$2"; STATUS="$3"; NOTE="${4:-}"; COST="${5:-null}"; TOK="${6:-null}"
URL="${CONVEX_REPORT_URL:?set CONVEX_REPORT_URL in ~/.hermes/.env}"
NOTE="${NOTE//\"/\'}"   # strip double-quotes so the JSON stays valid
curl -s -m 2 -X POST "$URL" -H 'Content-Type: application/json' -d \
"{\"job_id\":\"$JOB\",\"node\":\"$NODE\",\"status\":\"$STATUS\",\"note\":\"$NOTE\",\"model\":\"${LLM_MODEL:-}\",\"cost_usd\":$COST,\"tokens\":$TOK}" \
>/dev/null 2>&1 || true   # fire-and-forget: reporting must never slow or crash the pipeline
