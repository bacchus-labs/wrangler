#!/usr/bin/env bash
set -euo pipefail

# GitHub operations using gh CLI
# Usage: source this file to get helper functions

# Check if gh is installed
check_gh_installed() {
  if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed." >&2
    echo "Install it from: https://cli.github.com/" >&2
    exit 1
  fi
}

# Check if gh is authenticated
check_gh_authenticated() {
  if ! gh auth status &> /dev/null; then
    echo "Error: GitHub CLI not authenticated." >&2
    echo "Run: gh auth login" >&2
    exit 1
  fi
}

# Create a pull request
# Usage: create_pr <title> <body> [base] [draft]
create_pr() {
  local title="$1"
  local body="$2"
  local base="${3:-main}"
  local draft="${4:-false}"

  check_gh_installed
  check_gh_authenticated

  local draft_flag=""
  [ "$draft" = "true" ] && draft_flag="--draft"

  gh pr create --title "$title" --body "$body" --base "$base" $draft_flag
}

# Update PR description
# Usage: update_pr <pr_number> <body>
update_pr() {
  local pr_number="$1"
  local body="$2"

  check_gh_installed
  check_gh_authenticated

  gh pr edit "$pr_number" --body "$body"
}

# Get PR details
# Usage: get_pr <pr_number>
get_pr() {
  local pr_number="$1"

  check_gh_installed
  check_gh_authenticated

  gh pr view "$pr_number" --json number,url,title,body,headRefName,baseRefName,state
}

# Add comment to PR
# Usage: add_pr_comment <pr_number> <comment>
add_pr_comment() {
  local pr_number="$1"
  local comment="$2"

  check_gh_installed
  check_gh_authenticated

  gh pr comment "$pr_number" --body "$comment"
}

# Get current PR number (if on a PR branch)
# Usage: get_current_pr_number
get_current_pr_number() {
  check_gh_installed
  check_gh_authenticated

  local pr_data=$(gh pr view --json number 2>/dev/null || echo '{}')
  echo "$pr_data" | jq -r '.number // empty'
}
