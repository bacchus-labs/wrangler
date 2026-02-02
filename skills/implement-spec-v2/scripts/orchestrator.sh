#!/usr/bin/env bash
set -euo pipefail

# Main orchestrator for implement-spec-v2 workflow
# Implements five-phase workflow: PLAN → EXECUTE → VERIFY → PUBLISH → COMPLETE
# Usage: ./orchestrator.sh <spec-file> [session-id]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/github.sh"

SPEC_FILE="$1"
SESSION_ID="${2:-$(date +%s)}"
SESSION_DIR=".wrangler/sessions/$SESSION_ID"
STATE_FILE="$SESSION_DIR/state.json"

# Initialize session
init_session() {
  mkdir -p "$SESSION_DIR"

  if [ ! -f "$STATE_FILE" ]; then
    jq -n \
      --arg session_id "$SESSION_ID" \
      --arg spec_file "$SPEC_FILE" \
      --arg phase "PLAN" \
      --arg started "$(date -Iseconds)" \
      '{
        sessionId: $session_id,
        specFile: $spec_file,
        phase: $phase,
        startedAt: $started,
        checkpoints: []
      }' > "$STATE_FILE"
    echo "✅ Initialized session: $SESSION_ID"
  else
    echo "✅ Resuming session: $SESSION_ID"
  fi
}

# Save checkpoint for resumability
save_checkpoint() {
  local phase="$1"
  local action="$2"
  local resume_instructions="$3"

  local checkpoint=$(jq -n \
    --arg phase "$phase" \
    --arg action "$action" \
    --arg resume "$resume_instructions" \
    --arg timestamp "$(date -Iseconds)" \
    '{
      phase: $phase,
      action: $action,
      resumeInstructions: $resume,
      timestamp: $timestamp
    }')

  jq --argjson checkpoint "$checkpoint" \
    '.checkpoints += [$checkpoint] | .lastCheckpoint = $checkpoint' \
    "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

  echo "💾 Checkpoint saved: $phase - $action"
}

# Update phase in state
update_phase() {
  local new_phase="$1"

  jq --arg phase "$new_phase" \
    '.phase = $phase' \
    "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

  echo "📍 Phase updated: $new_phase"
}

# Phase 1: PLAN
phase_plan() {
  echo "📋 PHASE 1: PLAN"

  # Analyze spec
  echo "  → Analyzing spec..."
  analysis=$("$SCRIPT_DIR/analyze-spec.sh" "$SPEC_FILE")
  echo "$analysis" > "$SESSION_DIR/analysis.json"

  save_checkpoint "PLAN" "Spec analyzed" "Continue with PR creation in EXECUTE phase"

  # Extract spec metadata
  spec_id=$(basename "$SPEC_FILE" | sed 's/\.md$//' | cut -d'-' -f1-2)
  spec_title=$(grep -m1 "^# " "$SPEC_FILE" | sed 's/^# //')
  status="in_progress"
  priority="high"

  # Generate planning PR description
  data=$(jq -n \
    --arg spec_id "$spec_id" \
    --arg spec_title "$spec_title" \
    --arg status "$status" \
    --arg priority "$priority" \
    --argjson analysis "$analysis" \
    --arg analyzed_at "$(date -Iseconds)" \
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

  pr_description=$("$SCRIPT_DIR/generate-pr-description.sh" "planning" "$SPEC_FILE" "$data")
  echo "$pr_description" > "$SESSION_DIR/pr_description.md"

  save_checkpoint "PLAN" "PR description generated" "Create draft PR in EXECUTE phase"

  echo "✅ PLAN phase complete"
  update_phase "EXECUTE"
}

# Phase 2: EXECUTE
phase_execute() {
  echo "⚙️  PHASE 2: EXECUTE"

  # Create or update PR
  pr_number=$(get_current_pr_number || echo "")

  if [ -z "$pr_number" ]; then
    echo "  → Creating draft PR..."
    pr_description=$(cat "$SESSION_DIR/pr_description.md")
    spec_id=$(basename "$SPEC_FILE" | sed 's/\.md$//' | cut -d'-' -f1-2)
    spec_title=$(grep -m1 "^# " "$SPEC_FILE" | sed 's/^# //')

    create_pr "$spec_id: $spec_title" "$pr_description" "main" "true"
    pr_number=$(get_current_pr_number)
    echo "  ✅ Created draft PR #$pr_number"
  else
    echo "  → Using existing PR #$pr_number"
  fi

  jq --arg pr_number "$pr_number" \
    '.prNumber = $pr_number' \
    "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

  save_checkpoint "EXECUTE" "PR created/updated" "Implement features, then move to VERIFY"

  echo "✅ EXECUTE phase ready"
  echo "   → Implement acceptance criteria"
  echo "   → Update PR description as you progress"
  echo "   → Run: ./orchestrator.sh verify when ready"

  update_phase "VERIFY"
}

# Phase 3: VERIFY
phase_verify() {
  echo "✅ PHASE 3: VERIFY"

  # Audit compliance
  analysis=$(cat "$SESSION_DIR/analysis.json")
  compliance=$("$SCRIPT_DIR/audit-spec-compliance.sh" "$analysis")
  echo "$compliance" > "$SESSION_DIR/compliance.json"

  percentage=$(echo "$compliance" | jq -r '.percentage')

  if [ "$percentage" -lt 100 ]; then
    echo "⚠️  Not ready to publish: $percentage% complete"
    echo "   → Complete remaining acceptance criteria"
    exit 1
  fi

  save_checkpoint "VERIFY" "All criteria met" "Ready to publish PR"

  echo "✅ VERIFY phase complete - 100% compliance"
  update_phase "PUBLISH"
}

# Phase 4: PUBLISH
phase_publish() {
  echo "🚀 PHASE 4: PUBLISH"

  pr_number=$(jq -r '.prNumber' "$STATE_FILE")

  # Mark PR ready for review
  echo "  → Marking PR #$pr_number ready for review..."
  gh pr ready "$pr_number"

  save_checkpoint "PUBLISH" "PR marked ready" "Wait for review and merge"

  echo "✅ PUBLISH phase complete"
  echo "   → PR #$pr_number is ready for review"

  update_phase "COMPLETE"
}

# Phase 5: COMPLETE
phase_complete() {
  echo "🎉 PHASE 5: COMPLETE"

  pr_number=$(jq -r '.prNumber' "$STATE_FILE")

  # Final summary
  analysis=$(cat "$SESSION_DIR/analysis.json")
  task_count=$(echo "$analysis" | jq -r '.totalCriteria')

  echo "✅ Implementation complete!"
  echo "   → Spec: $SPEC_FILE"
  echo "   → PR: #$pr_number"
  echo "   → Criteria: $task_count/$task_count met"
  echo "   → Session: $SESSION_ID"

  jq --arg completed "$(date -Iseconds)" \
    '.completedAt = $completed | .status = "complete"' \
    "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
}

# Main execution
main() {
  echo "🔧 Wrangler implement-spec-v2 Orchestrator"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  init_session

  # Get current phase
  current_phase=$(jq -r '.phase' "$STATE_FILE")

  case "${current_phase}" in
    PLAN)
      phase_plan
      ;;
    EXECUTE)
      phase_execute
      ;;
    VERIFY)
      phase_verify
      ;;
    PUBLISH)
      phase_publish
      ;;
    COMPLETE)
      phase_complete
      ;;
    *)
      echo "Error: Unknown phase: $current_phase" >&2
      exit 1
      ;;
  esac
}

main "$@"
