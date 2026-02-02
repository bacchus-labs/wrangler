#!/usr/bin/env bats

# Tests for Bash scripts in implement-spec-v2

setup() {
  export TEST_DIR="$(mktemp -d)"
  export SCRIPTS_DIR="$PWD/scripts"
  export TEMPLATES_DIR="$PWD/templates"

  # Create test spec file
  cat > "$TEST_DIR/test-spec.md" <<EOF
# Test Feature

## FR-001: User Authentication

**Priority:** MUST HAVE

- AC-001: User can log in with valid credentials
- AC-002: User session persists across page refreshes
- AC-003: User can log out

## FR-002: Dashboard Display

**Priority:** SHOULD HAVE

- AC-004: Dashboard displays user information
- AC-005: User can navigate to settings page
EOF
}

teardown() {
  rm -rf "$TEST_DIR"
}

@test "analyze-spec.sh: extracts acceptance criteria" {
  run "$SCRIPTS_DIR/analyze-spec.sh" "$TEST_DIR/test-spec.md"

  [ "$status" -eq 0 ]
  [[ "$output" == *"AC-001"* ]]
  [[ "$output" == *"AC-005"* ]]

  # Verify JSON structure
  echo "$output" | jq -e '.acceptanceCriteria' > /dev/null
  echo "$output" | jq -e '.e2eTestFeatures' > /dev/null
  echo "$output" | jq -e '.manualTestingChecklist' > /dev/null
  echo "$output" | jq -e '.totalCriteria' > /dev/null
}

@test "analyze-spec.sh: counts criteria correctly" {
  run "$SCRIPTS_DIR/analyze-spec.sh" "$TEST_DIR/test-spec.md"

  [ "$status" -eq 0 ]

  total=$(echo "$output" | jq -r '.totalCriteria')
  [ "$total" -eq 5 ]
}

@test "analyze-spec.sh: identifies E2E test features" {
  run "$SCRIPTS_DIR/analyze-spec.sh" "$TEST_DIR/test-spec.md"

  [ "$status" -eq 0 ]

  # Should detect "user can" patterns
  e2e_count=$(echo "$output" | jq -r '.e2eTestFeatures | length')
  [ "$e2e_count" -gt 0 ]

  # Should include AC-001 (user can log in)
  [[ "$output" == *"AC-001"* ]]
}

@test "analyze-spec.sh: generates manual testing checklist" {
  run "$SCRIPTS_DIR/analyze-spec.sh" "$TEST_DIR/test-spec.md"

  [ "$status" -eq 0 ]

  # Should have manual test items
  checklist_count=$(echo "$output" | jq -r '.manualTestingChecklist | length')
  [ "$checklist_count" -gt 5 ]

  # Should include setup steps
  [[ "$output" == *"MT-001"* ]]
  [[ "$output" == *"MT-002"* ]]
}

@test "analyze-spec.sh: fails on missing file" {
  run "$SCRIPTS_DIR/analyze-spec.sh" "$TEST_DIR/nonexistent.md"

  [ "$status" -ne 0 ]
  [[ "$output" == *"not found"* ]]
}

@test "audit-spec-compliance.sh: calculates compliance correctly" {
  # Create test analysis with 5 total, 3 met
  analysis=$(cat <<EOF
{
  "acceptanceCriteria": [
    {"id": "AC-001", "met": true},
    {"id": "AC-002", "met": true},
    {"id": "AC-003", "met": true},
    {"id": "AC-004", "met": false},
    {"id": "AC-005", "met": false}
  ]
}
EOF
)

  run "$SCRIPTS_DIR/audit-spec-compliance.sh" "$analysis"

  [ "$status" -eq 0 ]

  total=$(echo "$output" | jq -r '.total')
  met=$(echo "$output" | jq -r '.completed')
  percentage=$(echo "$output" | jq -r '.percentage')
  status_val=$(echo "$output" | jq -r '.status')

  [ "$total" -eq 5 ]
  [ "$met" -eq 3 ]
  [ "$percentage" -eq 60 ]
  [ "$status_val" = "incomplete" ]
}

@test "audit-spec-compliance.sh: reports complete at 100%" {
  analysis=$(cat <<EOF
{
  "acceptanceCriteria": [
    {"id": "AC-001", "met": true},
    {"id": "AC-002", "met": true}
  ]
}
EOF
)

  run "$SCRIPTS_DIR/audit-spec-compliance.sh" "$analysis"

  [ "$status" -eq 0 ]

  percentage=$(echo "$output" | jq -r '.percentage')
  status_val=$(echo "$output" | jq -r '.status')

  [ "$percentage" -eq 100 ]
  [ "$status_val" = "complete" ]
}

@test "generate-pr-description.sh: generates planning phase description" {
  # First analyze the spec
  analysis=$("$SCRIPTS_DIR/analyze-spec.sh" "$TEST_DIR/test-spec.md")

  # Create data JSON
  data=$(jq -n \
    --arg spec_id "SPEC-001" \
    --arg spec_title "Test Feature" \
    --arg status "in_progress" \
    --arg priority "high" \
    --argjson analysis "$analysis" \
    --arg analyzed_at "2024-02-02T12:00:00Z" \
    '{
      specId: $spec_id,
      specTitle: $spec_title,
      status: $status,
      priority: $priority,
      analyzedAt: $analyzed_at,
      taskCount: $analysis.totalCriteria,
      acceptanceCriteria: $analysis.acceptanceCriteria,
      e2eTestFeatures: $analysis.e2eTestFeatures,
      manualTestingChecklist: $analysis.manualTestingChecklist
    }')

  run "$SCRIPTS_DIR/generate-pr-description.sh" "planning" "$TEST_DIR/test-spec.md" "$data"

  [ "$status" -eq 0 ]
  [[ "$output" == *"SPEC-001"* ]]
  [[ "$output" == *"Test Feature"* ]]
  [[ "$output" == *"Planning Phase"* ]]
  [[ "$output" == *"AC-001"* ]]
}

@test "generate-pr-description.sh: fails on invalid phase" {
  data='{"specId":"SPEC-001","specTitle":"Test","status":"open","priority":"high","taskCount":0,"acceptanceCriteria":[],"e2eTestFeatures":[],"manualTestingChecklist":[]}'

  run "$SCRIPTS_DIR/generate-pr-description.sh" "invalid-phase" "$TEST_DIR/test-spec.md" "$data"

  [ "$status" -ne 0 ]
  [[ "$output" == *"Invalid phase"* ]]
}

@test "generate-pr-description.sh: substitutes all placeholders" {
  analysis=$("$SCRIPTS_DIR/analyze-spec.sh" "$TEST_DIR/test-spec.md")

  data=$(jq -n \
    --arg spec_id "SPEC-042" \
    --arg spec_title "Auth System" \
    --arg status "in_progress" \
    --arg priority "high" \
    --argjson analysis "$analysis" \
    --arg analyzed_at "2024-02-02T12:00:00Z" \
    '{
      specId: $spec_id,
      specTitle: $spec_title,
      status: $status,
      priority: $priority,
      analyzedAt: $analyzed_at,
      taskCount: $analysis.totalCriteria,
      acceptanceCriteria: $analysis.acceptanceCriteria,
      e2eTestFeatures: $analysis.e2eTestFeatures,
      manualTestingChecklist: $analysis.manualTestingChecklist,
      complianceMet: 3,
      complianceTotal: 5
    }')

  run "$SCRIPTS_DIR/generate-pr-description.sh" "execution" "$TEST_DIR/test-spec.md" "$data"

  [ "$status" -eq 0 ]

  # Verify no unsubstituted placeholders remain
  [[ "$output" != *"{{SPEC_ID}}"* ]]
  [[ "$output" != *"{{SPEC_TITLE}}"* ]]
  [[ "$output" != *"{{PROGRESS_PERCENTAGE}}"* ]]

  # Verify substituted values
  [[ "$output" == *"SPEC-042"* ]]
  [[ "$output" == *"Auth System"* ]]
  [[ "$output" == *"60%"* ]]
}

@test "github.sh: functions are defined" {
  source "$SCRIPTS_DIR/utils/github.sh"

  # Verify functions exist
  declare -f check_gh_installed > /dev/null
  declare -f check_gh_authenticated > /dev/null
  declare -f create_pr > /dev/null
  declare -f update_pr > /dev/null
  declare -f get_pr > /dev/null
  declare -f add_pr_comment > /dev/null
  declare -f get_current_pr_number > /dev/null
}

@test "update-pr-description.sh: sanitizes sensitive data" {
  skip "Requires gh CLI authentication"

  # This test would require a real PR and gh auth
  # For now, we can test the sanitization function indirectly
}

@test "orchestrator.sh: initializes session" {
  run "$SCRIPTS_DIR/orchestrator.sh" "$TEST_DIR/test-spec.md" "test-session-$$"

  # Should create session directory
  [ -d ".wrangler/sessions/test-session-$$" ]

  # Should create state file
  [ -f ".wrangler/sessions/test-session-$$/state.json" ]

  # Verify state structure
  state=$(cat ".wrangler/sessions/test-session-$$/state.json")
  session_id=$(echo "$state" | jq -r '.sessionId')
  phase=$(echo "$state" | jq -r '.phase')

  [ "$session_id" = "test-session-$$" ]
  [[ "$phase" =~ PLAN|EXECUTE ]]

  # Cleanup
  rm -rf ".wrangler/sessions/test-session-$$"
}
