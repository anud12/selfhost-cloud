#!/usr/bin/env bash

set -euo pipefail

# ==========================
# Validation
# ==========================
if [[ -z "$CF_API_TOKEN" || -z "$CF_ZONE_ID" || -z "$CF_RECORD_ID" || -z "$CF_RECORD_NAME" ]]; then
  echo "Missing required environment variables."
  echo "Required: CF_API_TOKEN, CF_ZONE_ID, CF_RECORD_ID, CF_RECORD_NAME"
  exit 1
fi

IP_ADDRESS=$(curl -s -4 ifconfig.me)

# ==========================
# Update DNS Record
# ==========================
echo "Updating $CF_RECORD_NAME to $IP_ADDRESS..."

update_dns() {
    local recordId="$1"

    
    recordName=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$recordId" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json"| jq -r '.result.name')

    

    response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${recordId}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{
        \"type\": \"A\",
        \"name\": \"${recordName}\",
        \"content\": \"${IP_ADDRESS}\",
        \"ttl\": 1,
        \"proxied\": false
    }")

    success=$(echo "$response" | grep -o '"success":[^,]*' | cut -d: -f2)

    if [[ "$success" == "true" ]]; then
    echo "DNS record $recordName updated successfully."
    else
    echo "Failed to update DNS record:"
    echo "$response"
    exit 1
    fi
}


