#!/usr/bin/env bash
# Smoke test for the deployed Supabase Edge Functions.
#
# Runs after deploy to confirm the auth boundary holds. Does not require a real
# Shopify session token; we only assert that unauthenticated and malformed
# requests are rejected. Authenticated paths must be tested in the running
# extension because session tokens are short-lived and shop-bound.
#
# Usage:
#   FUNCTIONS_BASE=https://<project>.supabase.co/functions/v1 ./scripts/smoke-test.sh
#
# Optional:
#   SHOPIFY_TOKEN=<jwt>           run a sanity check against /order-history
#   ORDER_ID=<numeric>            order id to fetch when SHOPIFY_TOKEN is set

set -euo pipefail

: "${FUNCTIONS_BASE:?Set FUNCTIONS_BASE to the deployed functions URL}"

pass=0
fail=0

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '  \033[32m✓\033[0m %-55s [%s]\n' "$label" "$actual"
    pass=$((pass + 1))
  else
    printf '  \033[31m✗\033[0m %-55s expected %s, got %s\n' "$label" "$expected" "$actual"
    fail=$((fail + 1))
  fi
}

http_status() {
  curl -sS -o /dev/null -w '%{http_code}' "$@"
}

echo "Smoke testing $FUNCTIONS_BASE"
echo

echo "1. Unauthenticated requests must be rejected (401)"
assert_status "GET  /order-history (no auth)" 401 \
  "$(http_status "$FUNCTIONS_BASE/order-history?order_id=123")"
assert_status "POST /reship          (no auth)" 401 \
  "$(http_status -X POST -H 'Content-Type: application/json' -d '{"item_id":"x"}' "$FUNCTIONS_BASE/reship")"
assert_status "GET  /statuses       (no auth)" 401 \
  "$(http_status "$FUNCTIONS_BASE/statuses")"

echo
echo "2. Malformed bearer tokens must be rejected (401)"
assert_status "GET  /order-history (garbage token)" 401 \
  "$(http_status -H 'Authorization: Bearer not-a-jwt' "$FUNCTIONS_BASE/order-history?order_id=123")"
assert_status "POST /reship         (garbage token)" 401 \
  "$(http_status -X POST -H 'Authorization: Bearer not-a-jwt' -H 'Content-Type: application/json' -d '{"item_id":"x"}' "$FUNCTIONS_BASE/reship")"

echo
echo "3. Wrong-secret HS256 token must be rejected (401)"
# Hand-built JWT signed with a bogus secret. Should fail signature verification.
header_b64=$(printf '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')
payload_b64=$(printf '{"iss":"https://x.myshopify.com","dest":"https://x.myshopify.com","aud":"x","exp":9999999999,"nbf":0}' | base64 | tr -d '=' | tr '/+' '_-')
signing_input="${header_b64}.${payload_b64}"
sig_b64=$(printf '%s' "$signing_input" | openssl dgst -sha256 -hmac 'wrong-secret' -binary | base64 | tr -d '=' | tr '/+' '_-')
fake_token="${signing_input}.${sig_b64}"

assert_status "GET  /order-history (wrong-signature jwt)" 401 \
  "$(http_status -H "Authorization: Bearer $fake_token" "$FUNCTIONS_BASE/order-history?order_id=123")"

echo
if [[ -n "${SHOPIFY_TOKEN:-}" && -n "${ORDER_ID:-}" ]]; then
  echo "4. Authenticated sanity check"
  status=$(http_status -H "Authorization: Bearer $SHOPIFY_TOKEN" \
    "$FUNCTIONS_BASE/order-history?order_id=$ORDER_ID")
  case "$status" in
    200) printf '  \033[32m✓\033[0m %-55s [200]\n' "GET /order-history with real token"; pass=$((pass+1)) ;;
    403) printf '  \033[33m!\033[0m %-55s [403]  shop not provisioned in accounts.shop_domain\n' "GET /order-history with real token"; pass=$((pass+1)) ;;
    *)   printf '  \033[31m✗\033[0m %-55s got %s\n' "GET /order-history with real token" "$status"; fail=$((fail+1)) ;;
  esac
  echo
fi

echo "Results: $pass passed, $fail failed"
[[ $fail -eq 0 ]]
