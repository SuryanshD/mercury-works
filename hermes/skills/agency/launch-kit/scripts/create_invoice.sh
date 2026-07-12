#!/usr/bin/env bash
# create_invoice.sh <job_id> [email] [name] — build a Dodo (test) checkout link for the launch kit.
# Uses a STATIC product link (checkout.dodopayments.com/buy/<product>) which does NOT expire —
# a dynamic /payments link expires ~15 min, which broke "show me a site from earlier in the demo".
# metadata_job_id rides along so the /dodo-webhook still flips the right job to PAID.
# Fire-safe: always prints a CHECKOUT line; never blocks the pipeline.
set -uo pipefail
JOB="${1:?usage: create_invoice.sh <job_id> [email] [name]}"
PRODUCT="${DODO_PRODUCT_ID:-pdt_0Nj0WeJ3tKqMX4IhsgpwW}"
RETURN="https://mercury-mission-control.pages.dev/"
URL="https://test.checkout.dodopayments.com/buy/${PRODUCT}?quantity=1&redirect_url=${RETURN}&metadata_job_id=${JOB}"
echo "CHECKOUT $URL"
echo "PAYMENT_ID static-${PRODUCT}"
