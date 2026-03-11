#!/usr/bin/env bash

set -euo pipefail

source ./load_environment.sh

# ==========================
# Configuration
# ==========================
CF_API_TOKEN="${CF_API_TOKEN}"
ZONE_ID="${CF_ZONE_ID}"
RECORD_ID="${CF_RECORD_ID}"
RECORD_NAME="${CF_RECORD_NAME}"

# ==========================
# Validation
# ==========================
if [[ -z "$CF_API_TOKEN" || -z "$ZONE_ID" || -z "$RECORD_ID" || -z "$RECORD_NAME" ]]; then
  echo "Missing required environment variables."
  echo "Required: CF_API_TOKEN, ZONE_ID, RECORD_ID, RECORD_NAME"
  exit 1
fi

IP_ADDRESS=$(curl -4 ifconfig.me)

# ==========================
# Update DNS Record
# ==========================
echo "Updating $RECORD_NAME to $IP_ADDRESS..."


response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{
    \"type\": \"A\",
    \"name\": \"${RECORD_NAME}\",
    \"content\": \"${IP_ADDRESS}\",
    \"ttl\": 1,
    \"proxied\": false
  }")

success=$(echo "$response" | grep -o '"success":[^,]*' | cut -d: -f2)

if [[ "$success" == "true" ]]; then
  echo "DNS record updated successfully."
else
  echo "Failed to update DNS record:"
  echo "$response"
  exit 1
fi
