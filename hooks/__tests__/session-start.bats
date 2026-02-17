#!/usr/bin/env bats
bats_require_minimum_version 1.5.0

# Tests for session-start.sh hook
# Validates the thin bootstrap behavior after refactoring:
#   - Creates only .wrangler/ and .wrangler/issues/ (minimal for MCP)
#   - Does NOT do full schema-driven initialization
#   - Runs every time (no "already initialized" early-return)
#   - Outputs valid JSON context injection

HOOK_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
HOOK_SCRIPT="${HOOK_DIR}/session-start.sh"

setup() {
  # Create a temporary directory simulating a git repo
  export TEST_DIR="$(mktemp -d)"
  mkdir -p "${TEST_DIR}/.git"

  # Create a minimal plugin root structure
  export FAKE_PLUGIN_ROOT="$(mktemp -d)"
  mkdir -p "${FAKE_PLUGIN_ROOT}/mcp/dist"
  touch "${FAKE_PLUGIN_ROOT}/mcp/dist/bundle.cjs"
  mkdir -p "${FAKE_PLUGIN_ROOT}/workflows/engine/dist"
  touch "${FAKE_PLUGIN_ROOT}/workflows/engine/dist/cli.js"

  # Create using-wrangler skill file (required by the hook for context injection)
  mkdir -p "${FAKE_PLUGIN_ROOT}/skills/using-wrangler"
  echo "# Using Wrangler" > "${FAKE_PLUGIN_ROOT}/skills/using-wrangler/SKILL.md"

  # Create hooks directory with the script
  mkdir -p "${FAKE_PLUGIN_ROOT}/hooks"
  cp "${HOOK_SCRIPT}" "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"
  chmod +x "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  # Override git to return our test directory as repo root
  export PATH="${TEST_DIR}/bin:${PATH}"
  mkdir -p "${TEST_DIR}/bin"
  cat > "${TEST_DIR}/bin/git" <<'GITSCRIPT'
#!/usr/bin/env bash
if [[ "$1" == "rev-parse" && "$2" == "--show-toplevel" ]]; then
  echo "${TEST_DIR}"
  exit 0
fi
# Pass through other git commands
command git "$@"
GITSCRIPT
  chmod +x "${TEST_DIR}/bin/git"
}

teardown() {
  rm -rf "$TEST_DIR" "$FAKE_PLUGIN_ROOT"
}

# --- Test: Bootstrap creates .wrangler/ directory ---

@test "bootstrap creates .wrangler/ directory on fresh project" {
  # Precondition: no .wrangler/ exists
  [ ! -d "${TEST_DIR}/.wrangler" ]

  # Run the hook
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  # Assert .wrangler/ was created
  [ -d "${TEST_DIR}/.wrangler" ]
}

@test "bootstrap creates .wrangler/issues/ directory on fresh project" {
  [ ! -d "${TEST_DIR}/.wrangler/issues" ]

  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ -d "${TEST_DIR}/.wrangler/issues" ]
}

# --- Test: Bootstrap does NOT create full directory structure ---

@test "bootstrap does NOT create .wrangler/specifications/ directory" {
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ ! -d "${TEST_DIR}/.wrangler/specifications" ]
}

@test "bootstrap does NOT create .wrangler/ideas/ directory" {
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ ! -d "${TEST_DIR}/.wrangler/ideas" ]
}

@test "bootstrap does NOT create .wrangler/memos/ directory" {
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ ! -d "${TEST_DIR}/.wrangler/memos" ]
}

@test "bootstrap does NOT create .wrangler/plans/ directory" {
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ ! -d "${TEST_DIR}/.wrangler/plans" ]
}

@test "bootstrap does NOT create .wrangler/docs/ directory" {
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ ! -d "${TEST_DIR}/.wrangler/docs" ]
}

@test "bootstrap does NOT create .wrangler/cache/ directory" {
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ ! -d "${TEST_DIR}/.wrangler/cache" ]
}

@test "bootstrap does NOT create .wrangler/.gitignore" {
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ ! -f "${TEST_DIR}/.wrangler/.gitignore" ]
}

# --- Test: No early-return when already initialized ---

@test "bootstrap runs even when .wrangler/issues/ already exists" {
  # Pre-create the directory to simulate existing project
  mkdir -p "${TEST_DIR}/.wrangler/issues"

  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  # Should succeed (exit 0) and not bail early
  [ "$status" -eq 0 ]
  # The key test: it should still produce JSON output (not skip everything)
  echo "$output" | jq -e '.hookSpecificOutput' > /dev/null
}

# --- Test: Non-git directory handling ---

@test "bootstrap skips initialization gracefully when not in git repo" {
  # Override git to fail
  cat > "${TEST_DIR}/bin/git" <<'GITSCRIPT'
#!/usr/bin/env bash
if [[ "$1" == "rev-parse" ]]; then
  echo "fatal: not a git repository" >&2
  exit 128
fi
command git "$@"
GITSCRIPT
  chmod +x "${TEST_DIR}/bin/git"

  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ "$status" -eq 0 ]
  # .wrangler/ should NOT be created outside a git repo
  [ ! -d "${TEST_DIR}/.wrangler" ]
}

# --- Test: JSON output structure ---

@test "hook outputs valid JSON with hookSpecificOutput" {
  run --separate-stderr bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ "$status" -eq 0 ]
  # Should be valid JSON
  echo "$output" | jq -e '.' > /dev/null
  # Should have hookSpecificOutput
  echo "$output" | jq -e '.hookSpecificOutput.hookEventName' > /dev/null
  # hookEventName should be SessionStart
  local event_name
  event_name=$(echo "$output" | jq -r '.hookSpecificOutput.hookEventName')
  [ "$event_name" = "SessionStart" ]
}

@test "hook outputs additionalContext with using-wrangler content" {
  run --separate-stderr bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ "$status" -eq 0 ]
  local context
  context=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext')
  [[ "$context" == *"wrangler"* ]]
}

# --- Test: Bootstrap idempotency ---

@test "running bootstrap twice is safe and idempotent" {
  # Run once
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"
  [ "$status" -eq 0 ]
  [ -d "${TEST_DIR}/.wrangler/issues" ]

  # Run again
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"
  [ "$status" -eq 0 ]
  [ -d "${TEST_DIR}/.wrangler/issues" ]
}

# --- Test: .gitkeep in issues directory ---

@test "bootstrap creates .gitkeep in .wrangler/issues/" {
  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ -f "${TEST_DIR}/.wrangler/issues/.gitkeep" ]
}

# --- Test: No schema dependencies ---

@test "bootstrap works without workspace-schema.json" {
  # Ensure no schema file exists
  [ ! -f "${FAKE_PLUGIN_ROOT}/.wrangler/config/workspace-schema.json" ]

  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ "$status" -eq 0 ]
  [ -d "${TEST_DIR}/.wrangler/issues" ]
}

# --- Test: Removed functionality ---

@test "bootstrap does NOT reference workspace-schema.json for directory creation" {
  # Create a schema file with extra directories
  mkdir -p "${FAKE_PLUGIN_ROOT}/.wrangler/config"
  cat > "${FAKE_PLUGIN_ROOT}/.wrangler/config/workspace-schema.json" <<'SCHEMA'
{
  "version": "1.3.0",
  "directories": {
    "customdir": {
      "path": ".wrangler/customdir",
      "description": "Custom directory from schema",
      "gitTracked": true
    }
  }
}
SCHEMA

  run bash "${FAKE_PLUGIN_ROOT}/hooks/session-start.sh"

  [ "$status" -eq 0 ]
  # The bootstrap should NOT create dirs from schema - that's the MCP tool's job
  [ ! -d "${TEST_DIR}/.wrangler/customdir" ]
}
