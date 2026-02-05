#!/usr/bin/env bash
set -euo pipefail

# Generate PR description from template and data
# Usage: ./generate-pr-description.sh <phase> <spec-file> <data-json>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/../templates"

PHASE="$1"
SPEC_FILE="$2"
DATA_JSON="$3"

# Validate phase
case "$PHASE" in
  planning|execution|verification|complete)
    ;;
  *)
    echo "Error: Invalid phase '$PHASE'. Must be one of: planning, execution, verification, complete" >&2
    exit 1
    ;;
esac

# Read template
template=$(cat "$TEMPLATES_DIR/${PHASE}.md")

# Extract data from JSON
spec_id=$(echo "$DATA_JSON" | jq -r '.specId')
spec_title=$(echo "$DATA_JSON" | jq -r '.specTitle')
status=$(echo "$DATA_JSON" | jq -r '.status')
priority=$(echo "$DATA_JSON" | jq -r '.priority')
task_count=$(echo "$DATA_JSON" | jq -r '.taskCount')
analyzed_at=$(echo "$DATA_JSON" | jq -r '.analyzedAt // (now | strftime("%Y-%m-%dT%H:%M:%SZ"))')
compliance_met=$(echo "$DATA_JSON" | jq -r '.complianceMet // 0')
compliance_total=$(echo "$DATA_JSON" | jq -r '.complianceTotal // .taskCount')

# Calculate progress percentage
if [ "$compliance_total" -eq 0 ]; then
  progress_percentage=0
else
  progress_percentage=$((compliance_met * 100 / compliance_total))
fi

# Generate acceptance criteria list
acceptance_criteria=$(echo "$DATA_JSON" | jq -r '
  .acceptanceCriteria[] |
  "- [\(if .met then "x" else " " end)] **\(.id)** (\(.priority)): \(.description)"
' | sed 's/^//')

# Generate manual testing checklist
manual_testing=$(echo "$DATA_JSON" | jq -r '
  .manualTestingChecklist[] |
  "- [ ] **\(.id)**: \(.description)"
' | sed 's/^//')

# Generate E2E test section
requires_e2e=$(echo "$DATA_JSON" | jq -r 'if (.e2eTestFeatures | length) > 0 then "true" else "false" end')
if [ "$requires_e2e" = "true" ]; then
  e2e_reasons=$(echo "$DATA_JSON" | jq -r '.e2eTestFeatures | join(", ")')
  e2e_features=$(echo "$DATA_JSON" | jq -r '.e2eTestFeatures[] | "- \(.)"' | sed 's/^//')
  e2e_section="This feature requires E2E tests due to:
$e2e_reasons

E2E test features identified:
$e2e_features"
  e2e_test_gates="- [ ] All E2E tests passing
- [ ] User flows verified
- [ ] Edge cases tested"
else
  e2e_section="No E2E tests required for this feature."
  e2e_test_gates="- [x] No E2E tests required"
fi

# Generate tasks list (for execution/complete phases)
if [ -n "${DATA_JSON}" ]; then
  tasks=$(echo "$DATA_JSON" | jq -r '
    if .tasks then
      .tasks[] |
      "- [\(if .status == "closed" then "x" else " " end)] **\(.id)**: \(.title)"
    else
      empty
    end
  ' | sed 's/^//')
else
  tasks=""
fi

# Generate blockers section (for verification phase)
if [ "$progress_percentage" -eq 100 ]; then
  blockers_section="No blockers. Ready to publish."
else
  unmet_criteria=$(echo "$DATA_JSON" | jq -r '
    .acceptanceCriteria[] |
    select(.met == false) |
    "- **\(.id)** (\(.priority)): \(.description)"
  ' | sed 's/^//')
  blockers_section="**Unmet Criteria:**
$unmet_criteria"
fi

# Substitute variables in template
result="$template"
result="${result//\{\{SPEC_ID\}\}/$spec_id}"
result="${result//\{\{SPEC_TITLE\}\}/$spec_title}"
result="${result//\{\{STATUS\}\}/$status}"
result="${result//\{\{PRIORITY\}\}/$priority}"
result="${result//\{\{TASK_COUNT\}\}/$task_count}"
result="${result//\{\{ANALYZED_AT\}\}/$analyzed_at}"
result="${result//\{\{COMPLIANCE_MET\}\}/$compliance_met}"
result="${result//\{\{COMPLIANCE_TOTAL\}\}/$compliance_total}"
result="${result//\{\{PROGRESS_PERCENTAGE\}\}/$progress_percentage}"
result="${result//\{\{ACCEPTANCE_CRITERIA\}\}/$acceptance_criteria}"
result="${result//\{\{MANUAL_TESTING_CHECKLIST\}\}/$manual_testing}"
result="${result//\{\{E2E_TEST_SECTION\}\}/$e2e_section}"
result="${result//\{\{E2E_TEST_GATES\}\}/$e2e_test_gates}"
result="${result//\{\{TASKS\}\}/$tasks}"
result="${result//\{\{BLOCKERS_SECTION\}\}/$blockers_section}"

echo "$result"
