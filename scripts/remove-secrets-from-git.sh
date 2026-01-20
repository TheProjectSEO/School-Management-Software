#!/bin/bash
# Script to remove sensitive files from git history
# WARNING: This rewrites git history. Use with caution.

set -e

echo "🚨 WARNING: This script will rewrite git history!"
echo "Make sure you have a backup and coordinate with your team."
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# Files to remove from git history
SENSITIVE_FILES=(
  "COMPLETE_SYSTEM_GUIDE.md"
  "student-app/ALL_ACCESS_CREDENTIALS.md"
  "student-app/KLASE_PH_DEPLOYMENT_PLAN.md"
  "DEMO_CREDENTIALS.md"
  "LOGIN_CREDENTIALS.md"
  "TEST_ACCOUNTS.md"
  "student-app/WORKING_LOGIN_CREDENTIALS.md"
  "student-app/FINAL_WORKING_CREDENTIALS.md"
  "student-app/TEST_CREDENTIALS.md"
)

echo "Removing sensitive files from git history..."

# Check if git-filter-repo is installed
if command -v git-filter-repo &> /dev/null; then
  echo "Using git-filter-repo..."
  for file in "${SENSITIVE_FILES[@]}"; do
    if git log --all --full-history -- "$file" | grep -q .; then
      echo "  Removing: $file"
      git filter-repo --invert-paths --path "$file" --force
    fi
  done
elif command -v git-filter-branch &> /dev/null; then
  echo "Using git-filter-branch (slower)..."
  git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch ${SENSITIVE_FILES[*]}" \
    --prune-empty --tag-name-filter cat -- --all
else
  echo "❌ ERROR: Neither git-filter-repo nor git-filter-branch is installed."
  echo "Install one of them:"
  echo "  - git-filter-repo: brew install git-filter-repo (macOS) or pip install git-filter-repo"
  echo "  - git-filter-branch: comes with git"
  exit 1
fi

echo ""
echo "✅ Sensitive files removed from git history."
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Review the changes: git log --all"
echo "2. Force push to remote: git push origin --force --all"
echo "3. WARNING: This will rewrite history on remote. Coordinate with your team!"
echo "4. Revoke all exposed API keys immediately (see SECURITY_INCIDENT_RESPONSE.md)"
