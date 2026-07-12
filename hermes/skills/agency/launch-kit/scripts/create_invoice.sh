#!/usr/bin/env bash
# create_invoice.sh <job_id> [customer_email] [customer_name] — create a Dodo Payments (test) checkout link.
# Reads DODO_PAYMENTS_API_KEY + DODO_PRODUCT_ID from env (~/.hermes/.env). Prints "CHECKOUT <url>" + "PAYMENT_ID <id>".
# Fire-safe: on any error prints "INVOICE_UNAVAILABLE" and exits 0 so the pipeline degrades, never fails.
set -uo pipefail

JOB="${1:?usage: create_invoice.sh <job_id> [email] [name]}"
EMAIL="${2:-buyer@example.com}"
NAME="${3:-Mercury Client}"
: "${DODO_PAYMENTS_API_KEY:?set DODO_PAYMENTS_API_KEY in ~/.hermes/.env}"
PRODUCT="${DODO_PRODUCT_ID:-pdt_0Nj0PkVJGcQPZlHGVHfj4}"
BASE="https://test.dodopayments.com"

BODY=$(python3 -c 'import json,sys
print(json.dumps({
  "payment_link": True,
  "product_cart": [{"product_id": sys.argv[1], "quantity": 1}],
  "customer": {"email": sys.argv[2], "name": sys.argv[3]},
  "billing": {"city":"Bengaluru","country":"IN","state":"KA","street":"1 MG Road","zipcode":"560001"},
  "return_url": "https://mw-mercury-works.pages.dev/thanks",
  "metadata": {"job_id": sys.argv[4]}
}))' "$PRODUCT" "$EMAIL" "$NAME" "$JOB")

RESP=$(curl -s -m 20 -X POST "$BASE/payments" \
  -H "Authorization: Bearer $DODO_PAYMENTS_API_KEY" -H "Content-Type: application/json" -d "$BODY")

printf '%s' "$RESP" | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: print("INVOICE_UNAVAILABLE"); sys.exit(0)
url=d.get("payment_link") or d.get("checkout_url")
pid=d.get("payment_id") or d.get("id")
if url:
    print("CHECKOUT", url)
    print("PAYMENT_ID", pid)
else:
    print("INVOICE_UNAVAILABLE")
    print(json.dumps(d)[:300])
'
