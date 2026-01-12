# Get Supabase Service Role Key (30 Seconds)

## Step 1: Go to Supabase Settings
https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api

## Step 2: Find "service_role" Key
Scroll down to **"Project API keys"** section

You'll see:
- `anon` `public` key (already in .env.local)
- **`service_role` `secret`** key ← **Copy this one**

## Step 3: Add to .env.local

**Edit:** `teacher-app/.env.local`

**Add this line:**
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

(Paste the key you copied after the `=`)

## Step 4: Run Seed Script

```bash
cd teacher-app
node scripts/seed-with-auth.mjs
```

**This will:**
- ✅ Create 3 sections
- ✅ Create 5 courses
- ✅ Create 6 REAL student accounts (with auth.users entries)
- ✅ Assign teacher to all
- ✅ Enroll students
- ✅ Create modules

**Time:** 10-15 seconds

**Then:** Refresh teacher app and see students in Messages! 🎉
