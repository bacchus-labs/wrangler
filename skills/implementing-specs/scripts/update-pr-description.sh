#!/usr/bin/env bash
set -euo pipefail

# Update PR description using gh CLI
# Usage: ./update-pr-description.sh <pr-number> <new-description>

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils/github.sh"

PR_NUMBER="$1"
NEW_DESCRIPTION="$2"

# Sanitize sensitive data before updating
sanitize_sensitive_data() {
  local content="$1"

  # Patterns for common secrets
  local patterns=(
    's/sk-[a-zA-Z0-9]{48}/sk-REDACTED/g'                    # OpenAI API keys
    's/ghp_[a-zA-Z0-9]{36}/ghp_REDACTED/g'                  # GitHub tokens
    's/gho_[a-zA-Z0-9]{36}/gho_REDACTED/g'                  # GitHub OAuth tokens
    's/[A-Za-z0-9+\/]{40}=[A-Za-z0-9+\/]*/{AWS_KEY}/g'      # AWS access keys
    's/[0-9]+-[a-zA-Z0-9_]{32}\.apps\.googleusercontent\.com/CLIENT_ID_REDACTED/g'  # Google OAuth
    's/password["\s:=]+["\x27][^"\x27]+["\x27]/password="REDACTED"/gi'              # Passwords
    's/api[_-]?key["\s:=]+["\x27][^"\x27]+["\x27]/api_key="REDACTED"/gi'           # API keys
  )

  local sanitized="$content"
  for pattern in "${patterns[@]}"; do
    sanitized=$(echo "$sanitized" | sed -E "$pattern")
  done

  echo "$sanitized"
}

# Check for secrets before updating
detect_secrets() {
  local content="$1"

  # Simple secret detection patterns
  if echo "$content" | grep -qE 'sk-[a-zA-Z0-9]{48}'; then
    echo "Warning: Possible OpenAI API key detected" >&2
  fi
  if echo "$content" | grep -qE 'ghp_[a-zA-Z0-9]{36}'; then
    echo "Warning: Possible GitHub token detected" >&2
  fi
  if echo "$content" | grep -qE 'password["\s:=]+'; then
    echo "Warning: Possible password detected" >&2
  fi
}

# Detect and warn about secrets
detect_secrets "$NEW_DESCRIPTION"

# Sanitize the description
SANITIZED_DESCRIPTION=$(sanitize_sensitive_data "$NEW_DESCRIPTION")

# Update PR description
update_pr "$PR_NUMBER" "$SANITIZED_DESCRIPTION"

echo "✅ Updated PR #$PR_NUMBER description"
