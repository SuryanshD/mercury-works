#!/usr/bin/env bash
# create_invoice.sh <job_id> [email] [name] — build a Dodo (test) checkout link for the launch kit.
# STATIC product link (checkout.dodopayments.com/buy/<product>) → never expires (dynamic links die ~15m).
# Forces USD + US country so the standard 4242 test card succeeds — an India billing address routes
# through an INR rail that the test merchant doesn't have enabled ("mode not enabled for merchant").
# metadata_job_id rides along so /dodo-webhook still flips the right job to PAID. Never blocks the pipeline.
set -uo pipefail
JOB="${1:?usage: create_invoice.sh <job_id> [email] [name]}"
PRODUCT="${DODO_PRODUCT_ID:-pdt_0Nj0WeJ3tKqMX4IhsgpwW}"
RETURN="https://mercury-mission-control.pages.dev/"
URL="https://test.checkout.dodopayments.com/buy/${PRODUCT}?quantity=1&paymentCurrency=USD&showCurrencySelector=false&country=US&redirect_url=${RETURN}&metadata_job_id=${JOB}"
echo "CHECKOUT $URL"
echo "PAYMENT_ID static-${PRODUCT}"
