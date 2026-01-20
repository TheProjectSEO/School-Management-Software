# 🚨 IMMEDIATE ACTIONS - DO THESE NOW

## ⏰ URGENT (Do in the next 30 minutes)

### 1. Revoke API Keys (15 minutes)

**Resend API Key:**
- Go to: https://resend.com/api-keys
- Find key: `re_US5UsX6v_2Do26VZZbVhiMvVroXd5sZnp`
- Click "Revoke" immediately
- Create new key
- Update all `.env.local` files

**Daily.co API Key:**
- Go to: https://dashboard.daily.co/developers
- Find key: `5a400788fc8e091243f5080ea09254580083c3783d53f1fb899a4210700b7dae`
- Revoke it
- Create new key
- Update `.env.local` files AND Supabase Secrets

**OpenAI API Key:**
- Go to: https://platform.openai.com/api-keys
- Revoke any exposed keys
- Create new key
- Update `.env.local` files AND Supabase Secrets

**Supabase Service Role Key:**
- Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api
- Regenerate `service_role` key
- Update all `.env.local` files AND Supabase Secrets

### 2. Change Email Password (5 minutes)
- Change the company email password immediately
- Enable 2FA if not already enabled

### 3. Update Supabase Secrets (5 minutes)
- Go to: Supabase Dashboard → Settings → Edge Functions → Secrets
- Update: `DAILY_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### 4. Check for Unauthorized Access (5 minutes)
- Check Resend dashboard for sent emails you don't recognize
- Check Daily.co dashboard for rooms you didn't create
- Check OpenAI usage for unexpected API calls
- Check Supabase logs for suspicious activity

---

## 📋 Within 24 Hours

### 1. Remove Secrets from Git History

**Option A: Using git-filter-repo (Recommended)**
```bash
# Install git-filter-repo
brew install git-filter-repo  # macOS
# or: pip install git-filter-repo

# Run the cleanup script
./scripts/remove-secrets-from-git.sh
```

**Option B: Manual removal**
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch COMPLETE_SYSTEM_GUIDE.md student-app/ALL_ACCESS_CREDENTIALS.md student-app/KLASE_PH_DEPLOYMENT_PLAN.md DEMO_CREDENTIALS.md LOGIN_CREDENTIALS.md" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: Rewrites history)
git push origin --force --all
```

### 2. Set Up Secret Scanning

```bash
# Install gitleaks
brew install gitleaks

# Scan repository
gitleaks detect --source . --verbose --report-path gitleaks-report.json
```

### 3. Enable GitHub Secret Scanning
- Go to: GitHub repo → Settings → Security → Secret scanning
- Enable "Push protection" and "Secret scanning alerts"

---

## 🔒 Prevention (This Week)

1. ✅ Updated `.gitignore` to exclude sensitive files
2. Set up pre-commit hooks to scan for secrets
3. Use `.env.example` files (without real keys)
4. Enable branch protection on main branch
5. Set up CI/CD secret scanning

---

## 📞 If You See Suspicious Activity

1. **Immediately revoke** the affected key
2. **Check logs** for unauthorized access
3. **Change passwords** for affected accounts
4. **Monitor** for unusual activity for 30 days

---

## ✅ Verification Checklist

- [ ] All API keys revoked and regenerated
- [ ] Email password changed
- [ ] All `.env.local` files updated with new keys
- [ ] Supabase Secrets updated
- [ ] Secrets removed from git history
- [ ] Secret scanning enabled
- [ ] `.gitignore` updated
- [ ] Team notified about the incident
