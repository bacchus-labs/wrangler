#!/usr/bin/env bash
set -euo pipefail

# Audit spec compliance by comparing criteria vs implementation
# Usage: ./audit-spec-compliance.sh <analysis-json>

ANALYSIS_JSON="$1"

if [ -z "$ANALYSIS_JSON" ]; then
  echo "Error: Analysis JSON required" >&2
  exit 1
fi

# Count total and met criteria
total=$(echo "$ANALYSIS_JSON" | jq '.acceptanceCriteria | length')
met=$(echo "$ANALYSIS_JSON" | jq '[.acceptanceCriteria[] | select(.met == true)] | length')

# Calculate percentage
if [ "$total" -eq 0 ]; then
  percentage=0
else
  percentage=$((met * 100 / total))
fi

# Determine status
if [ "$percentage" -eq 100 ]; then
  status="complete"
else
  status="incomplete"
fi

# Generate report
jq -n \
  --argjson total "$total" \
  --argjson met "$met" \
  --argjson percentage "$percentage" \
  --arg status "$status" \
  '{
    total: $total,
    completed: $met,
    percentage: $percentage,
    status: $status
  }'
