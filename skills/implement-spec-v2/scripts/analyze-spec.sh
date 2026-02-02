#!/usr/bin/env bash
set -euo pipefail

# Extract acceptance criteria and generate analysis from spec file
# Usage: ./analyze-spec.sh <spec-file>

SPEC_FILE="$1"

if [ ! -f "$SPEC_FILE" ]; then
  echo "Error: Spec file not found: $SPEC_FILE" >&2
  exit 1
fi

# Extract acceptance criteria from spec
# Format: - AC-001: Description
extract_acceptance_criteria() {
  local spec_file="$1"
  local current_section=""
  local current_priority="must"
  local criteria_json="[]"
  local counter=0

  while IFS= read -r line; do
    # Track current section (FR-001, NFR-001, etc.)
    if [[ "$line" =~ ^#+[[:space:]]+(FR-[0-9]{3}|NFR-[0-9]{3}) ]]; then
      current_section="${BASH_REMATCH[1]}"
      continue
    fi

    # Track priority
    if [[ "$line" =~ \*\*Priority:\*\*[[:space:]]*(MUST\ HAVE|SHOULD\ HAVE|NICE\ TO\ HAVE) ]]; then
      priority_text="${BASH_REMATCH[1]}"
      case "${priority_text^^}" in
        *MUST*)
          current_priority="must"
          ;;
        *SHOULD*)
          current_priority="should"
          ;;
        *NICE*)
          current_priority="nice"
          ;;
      esac
      continue
    fi

    # Extract acceptance criteria (format: "- AC-001: Description")
    if [[ "$line" =~ ^-[[:space:]]+(AC-[0-9]{3}):[[:space:]]+(.+)$ ]]; then
      id="${BASH_REMATCH[1]}"
      description="${BASH_REMATCH[2]}"

      # Add to JSON array
      criteria_json=$(echo "$criteria_json" | jq \
        --arg id "$id" \
        --arg desc "$description" \
        --arg section "$current_section" \
        --arg priority "$current_priority" \
        '. += [{
          id: $id,
          description: $desc,
          section: $section,
          priority: $priority,
          met: false
        }]')
      ((counter++))
    fi
  done < "$spec_file"

  echo "$criteria_json"
}

# Identify E2E test features
# Looks for keywords: "user can", "UI displays", "clicking", etc.
identify_e2e_features() {
  local criteria_json="$1"
  local e2e_features="[]"

  # E2E keywords
  local keywords=(
    "user can"
    "user must"
    "ui displays"
    "ui display"
    "click"
    "clicking"
    "clicks"
    "navigate"
    "page transition"
    "routing"
    "display"
    "render"
  )

  # Check each criterion for E2E triggers
  local count=$(echo "$criteria_json" | jq 'length')
  for ((i=0; i<count; i++)); do
    local criterion=$(echo "$criteria_json" | jq -r ".[$i]")
    local id=$(echo "$criterion" | jq -r '.id')
    local description=$(echo "$criterion" | jq -r '.description')
    local desc_lower="${description,,}"

    for keyword in "${keywords[@]}"; do
      if [[ "$desc_lower" == *"$keyword"* ]]; then
        e2e_features=$(echo "$e2e_features" | jq \
          --arg feature "$id: $description" \
          '. += [$feature]')
        break
      fi
    done
  done

  echo "$e2e_features"
}

# Generate manual testing checklist
generate_manual_checklist() {
  local criteria_json="$1"
  local checklist="[]"
  local counter=1

  # Add setup steps
  checklist=$(echo "$checklist" | jq \
    --arg id "MT-$(printf "%03d" $counter)" \
    --arg desc "Start the application and verify it loads without errors" \
    '. += [{id: $id, description: $desc}]')
  ((counter++))

  checklist=$(echo "$checklist" | jq \
    --arg id "MT-$(printf "%03d" $counter)" \
    --arg desc "Open browser DevTools and check for console errors" \
    '. += [{id: $id, description: $desc}]')
  ((counter++))

  # Generate testing steps from acceptance criteria
  local count=$(echo "$criteria_json" | jq 'length')
  for ((i=0; i<count; i++)); do
    local criterion=$(echo "$criteria_json" | jq -r ".[$i]")
    local description=$(echo "$criterion" | jq -r '.description')
    local desc_lower="${description,,}"
    local test_step=""

    # Convert criterion to test step
    if [[ "$desc_lower" == *"can log in"* ]] || [[ "$desc_lower" == *"can login"* ]]; then
      test_step="Attempt to log in with valid credentials and verify success"
    elif [[ "$desc_lower" == *"can log out"* ]] || [[ "$desc_lower" == *"can logout"* ]]; then
      test_step="Log out and verify user is redirected to login page"
    elif [[ "$desc_lower" == *"session persists"* ]]; then
      test_step="Refresh the page and verify user session is maintained"
    elif [[ "$desc_lower" == *"dashboard"* ]]; then
      test_step="Navigate to dashboard and verify it displays correctly"
    elif [[ "$desc_lower" == *"click"* ]]; then
      test_step="Verify: $description"
    else
      test_step="Test: $description"
    fi

    checklist=$(echo "$checklist" | jq \
      --arg id "MT-$(printf "%03d" $counter)" \
      --arg desc "$test_step" \
      '. += [{id: $id, description: $desc}]')
    ((counter++))
  done

  # Add verification step
  checklist=$(echo "$checklist" | jq \
    --arg id "MT-$(printf "%03d" $counter)" \
    --arg desc "Verify no errors in browser console after all tests" \
    '. += [{id: $id, description: $desc}]')

  echo "$checklist"
}

# Main analysis
criteria=$(extract_acceptance_criteria "$SPEC_FILE")
e2e_features=$(identify_e2e_features "$criteria")
manual_checklist=$(generate_manual_checklist "$criteria")
total_criteria=$(echo "$criteria" | jq 'length')

# Output JSON result
jq -n \
  --argjson criteria "$criteria" \
  --argjson e2e "$e2e_features" \
  --argjson checklist "$manual_checklist" \
  --argjson total "$total_criteria" \
  '{
    acceptanceCriteria: $criteria,
    e2eTestFeatures: $e2e,
    manualTestingChecklist: $checklist,
    totalCriteria: $total
  }'
