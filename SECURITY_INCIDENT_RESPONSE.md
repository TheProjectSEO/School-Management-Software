# 🚨 CRITICAL SECURITY INCIDENT - EXPOSED SECRETS

## Immediate Actions Required

### Step 1: Revoke ALL Exposed Secrets (DO THIS NOW)

#### 1. Resend API Key
- **Current Key**: `re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp`
- **Action**: Go to https://resend.com/api-keys
- **Revoke** the exposed key immediately
- **Create** a new API key
- **Update** all `.env.local` files with the new key

#### 2. Daily.co API Key
- **Current Key**: `5a400788fc8e091243f5080ea09254580083c3783d53f1fb899a4210700b7dae`
- **Action**: Go to https://dashboard.daily.co/developers
- **Revoke** the exposed key
- **Create** a new API key
- **Update** all `.env.local` files and Supabase Secrets

#### 3. Groq API Key (if still in use)
- **Action**: Go to https://console.groq.com/keys
- **Revoke** any exposed keys
- **Note**: We migrated to OpenAI, but if Groq keys exist, revoke them

#### 4. OpenAI API Key
- **Action**: Go to https://platform.openai.com/api-keys
- **Revoke** the exposed key
- **Create** a new API key
- **Update** all `.env.local` files and Supabase Secrets

#### 5. Company Email Password
- **Action**: Change the email account password immediately
- **Enable** 2FA if not already enabled

#### 6. Supabase Service Role Key
- **Action**: Go to https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api
- **Regenerate** the service_role key
- **Update** all `.env.local` files and Supabase Secrets

### Step 2: Remove Secrets from Git History

**⚠️ WARNING**: This rewrites git history. Coordinate with your team first.

```bash
# Install git-filter-repo if not installed
# brew install git-filter-repo  # macOS
# or: pip install git-filter-repo

# Remove specific secrets from entire git history
git filter-repo --invert-paths --path "COMPLETE_SYSTEM_GUIDE.md"
git filter-repo --invert-paths --path "ALL_ACCESS_CREDENTIALS.md"
git filter-repo --invert-paths --path "student-app/KLASE_PH_DEPLOYMENT_PLAN.md"

# Or use BFG Repo-Cleaner (faster for large repos)
# java -jar bfg.jar --replace-text passwords.txt
```

**Alternative (if you can't use git-filter-repo):**

```bash
# Create a script to remove sensitive files from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch COMPLETE_SYSTEM_GUIDE.md ALL_ACCESS_CREDENTIALS.md student-app/KLASE_PH_DEPLOYMENT_PLAN.md" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: This rewrites history)
git push origin --force --all
```

### Step 3: Update .gitignore

Ensure these patterns are in `.gitignore`:

```gitignore
# Sensitive documentation
*_CREDENTIALS.md
*_ACCESS_*.md
*_SECRETS.md
*_KEYS.md
COMPLETE_SYSTEM_GUIDE.md
ALL_ACCESS_*.md
LOGIN_CREDENTIALS.md
DEMO_CREDENTIALS.md
TEST_ACCOUNTS.md

# Environment files (already there, but double-check)
.env*
!.env.example
```

### Step 4: Scan Repository for Remaining Secrets

```bash
# Install gitleaks
# brew install gitleaks  # macOS

# Scan the repository
gitleaks detect --source . --verbose

# Or use truffleHog
pip install truffleHog
trufflehog --regex --entropy=False .
```

### Step 5: Create Safe Documentation Template

Create `.env.example` files (without real keys):

```bash
# student-app/.env.example
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DAILY_API_KEY=your_daily_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
RESEND_API_KEY=your_resend_api_key_here
```

## Files That Need to Be Removed/Updated

Based on the scan results, these files likely contain exposed secrets:

1. `COMPLETE_SYSTEM_GUIDE.md` - Contains passwords
2. `ALL_ACCESS_CREDENTIALS.md` - Contains API keys
3. `student-app/KLASE_PH_DEPLOYMENT_PLAN.md` - Contains Groq API key
4. Any other markdown files with actual credentials

## Prevention Going Forward

1. **Never commit real secrets** to git
2. **Use `.env.example`** files with placeholder values
3. **Use secret scanning** in CI/CD (GitHub Secret Scanning, GitGuardian)
4. **Rotate keys regularly** (every 90 days)
5. **Use environment-specific keys** (dev/staging/prod)
6. **Enable branch protection** on main branch
7. **Use pre-commit hooks** to scan for secrets

## Pre-commit Hook Setup

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Check for common secret patterns
if git diff --cached | grep -E "(api[_-]?key|password|secret|token)\s*[:=]\s*['\"]?[a-zA-Z0-9]{20,}" -i; then
  echo "❌ ERROR: Potential secret detected in commit!"
  echo "Please remove secrets before committing."
  exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Timeline

- **Immediate (0-1 hour)**: Revoke all exposed keys
- **Within 24 hours**: Remove secrets from git history
- **Within 48 hours**: Set up secret scanning and prevention
- **Ongoing**: Regular key rotation and monitoring
