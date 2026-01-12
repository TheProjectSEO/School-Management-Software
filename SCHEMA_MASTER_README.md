# 🎯 MSU School OS - Schema Configuration Master Guide

**Last Updated:** January 1, 2026
**Status:** ✅ ALL APPS CONFIGURED
**Schema:** `"school software"` (locked down across all apps)

---

## ✅ What Was Done (Automatically)

I've configured **ALL THREE APPS** to use the correct schema:

### student-app ✅
- Schema set to: `"school software"`
- Files copied: UNIVERSAL_SCHEMA_CONFIG.md, .env.schema, verify-schema.mjs
- Supabase clients updated with warning comments
- package.json updated with verification scripts
- Backups saved: client.ts.backup, server.ts.backup, package.json.backup

### teacher-app ✅
- Schema set to: `"school software"`
- All documentation files created
- Supabase clients updated with warnings
- Verification system in place

### admin-app ✅
- Schema set to: `"school software"`
- Files copied: UNIVERSAL_SCHEMA_CONFIG.md, .env.schema, verify-schema.mjs
- Supabase clients updated with warning comments
- package.json updated with verification scripts
- Backups saved: client.ts.backup, server.ts.backup, package.json.backup

---

## ⚠️ ONE MANUAL STEP REQUIRED

**You must expose the schema in Supabase Dashboard:**

### How to Do This (5 minutes):

1. **Open Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/qyjzqzqqjimittltttph
   ```

2. **Navigate to Settings → API**

3. **Find "Exposed schemas" setting:**
   - Look for "Extra schemas" or "Exposed schemas" input field
   - Current value probably shows: `public, graphql_public`

4. **Add "school software":**
   - Update to: `public, graphql_public, "school software"`
   - **IMPORTANT:** Include the quotes: `"school software"`

5. **Save:**
   - Click "Save" or "Update"
   - API will restart (takes 1-2 minutes)

6. **Verify it worked:**
   ```bash
   curl https://qyjzqzqqjimittltttph.supabase.co/rest/v1/schools?select=id \
     -H "apikey: YOUR_ANON_KEY"

   # Should return schools data (not PGRST106 error)
   ```

**Without this step:** Apps will get `PGRST106` errors saying schema isn't allowed.

---

## 🧪 Verification (Test All Apps)

After exposing the schema in Dashboard, test each app:

```bash
# Test student-app
cd student-app
npm run verify-schema
# Should show: ✅ Schema "school software" verified!

# Test teacher-app
cd ../teacher-app
npm run verify-schema
# Should show: ✅ Schema "school software" verified!

# Test admin-app
cd ../admin-app
npm run verify-schema
# Should show: ✅ Schema "school software" verified!
```

**All three should pass!** ✅

---

## 🚀 Starting All Apps

After verification passes:

```bash
# Terminal 1 - Student App
cd student-app
npm run dev
# Starts on http://localhost:3000

# Terminal 2 - Teacher App
cd teacher-app
npm run dev
# Starts on http://localhost:3001

# Terminal 3 - Admin App
cd admin-app
npm run dev
# Starts on http://localhost:3002
```

**Each app will verify schema before starting!**

---

## 📚 Documentation Structure

### In Each App Folder

```
student-app/
├── UNIVERSAL_SCHEMA_CONFIG.md ← Read this first
├── .env.schema                ← Schema documentation
├── scripts/
│   └── verify-schema.mjs      ← Automated verification
├── lib/
│   └── supabase/
│       ├── client.ts          ← ⚠️ schema: "school software"
│       └── server.ts          ← ⚠️ schema: "school software"
└── package.json               ← verify-schema scripts added

teacher-app/
├── UNIVERSAL_SCHEMA_CONFIG.md
├── SUPABASE_MCP_SCHEMA_RULES.md ← Extra: MCP usage guide
├── SCHEMA_GUIDE.md
├── .env.schema
├── scripts/verify-schema.mjs
└── ... (same structure)

admin-app/
├── UNIVERSAL_SCHEMA_CONFIG.md
├── .env.schema
├── scripts/verify-schema.mjs
└── ... (same structure)
```

### In Parent Folder

```
School management Software/
├── SCHEMA_REFERENCE.md            ← Central reference
├── SCHEMA_SETUP_CHECKLIST.md      ← Setup instructions
├── setup-all-apps-schema.sh       ← Distribution script (already run)
├── distribute-schema-config.sh    ← Simple distribution
├── student-app/
├── teacher-app/
└── admin-app/
```

---

## 🔒 How This Prevents Future Mistakes

### Automated Prevention

1. **Pre-dev Hook:**
   ```bash
   npm run dev
   # Runs verify-schema.mjs FIRST
   # If schema wrong → FAILS before starting server
   ```

2. **Pre-build Hook:**
   ```bash
   npm run build
   # Runs verify-schema.mjs FIRST
   # If schema wrong → FAILS before building
   ```

3. **Warning Comments in Code:**
   - `lib/supabase/client.ts` has big warning: "⚠️ DO NOT CHANGE"
   - `lib/supabase/server.ts` has big warning
   - Comments explain WHY "school software" is correct

### Documentation Prevention

4. **UNIVERSAL_SCHEMA_CONFIG.md:**
   - Clear explanation of which schema
   - Examples of correct vs wrong usage
   - Quick reference card

5. **SUPABASE_MCP_SCHEMA_RULES.md (teacher-app):**
   - My permanent reference when using Supabase MCP
   - Templates for all database operations
   - Explains what to do in every scenario

---

## 🎓 For Future Developers

**If a new developer joins the team, give them:**

1. This file: `SCHEMA_MASTER_README.md`
2. App-specific: `{app}/UNIVERSAL_SCHEMA_CONFIG.md`
3. Tell them: "Read these BEFORE writing any database code"

**Then:**
- They run `npm run dev` in any app
- Verification runs automatically
- If they configured something wrong, dev server won't start
- They'll see error message pointing to documentation

---

## 🔧 Maintenance

### Monthly Check (Optional)

```bash
# Verify all apps still use correct schema
cd student-app && npm run verify-schema
cd ../teacher-app && npm run verify-schema
cd ../admin-app && npm run verify-schema
```

### After Supabase Project Changes

If you ever migrate to a new Supabase project:

1. **Export/Import will preserve schema names**
2. **BUT you must re-expose "school software" in new project's dashboard**
3. **Update .env.local in all apps with new URL and keys**
4. **Run `npm run verify-schema` in each app to confirm**

---

## 📋 Quick Commands Reference

### Distribute Schema Config to All Apps
```bash
cd "School management Software"
./setup-all-apps-schema.sh
```

### Verify Single App
```bash
cd student-app
npm run verify-schema
```

### Verify All Apps at Once
```bash
# From parent folder
(cd student-app && npm run verify-schema) && \
(cd teacher-app && npm run verify-schema) && \
(cd admin-app && npm run verify-schema)
```

### Start All Apps
```bash
# Option 1: Separate terminals (recommended)
# Terminal 1:
cd student-app && npm run dev

# Terminal 2:
cd teacher-app && npm run dev

# Terminal 3:
cd admin-app && npm run dev

# Option 2: Tmux/screen (advanced)
tmux new -d -s student 'cd student-app && npm run dev'
tmux new -d -s teacher 'cd teacher-app && npm run dev'
tmux new -d -s admin 'cd admin-app && npm run dev'
```

---

## 🎯 Final Answer

### When I Use Supabase MCP for ANY App:

**I will ALWAYS:**
1. ✅ Use schema: `"school software"`
2. ✅ Prefix every table: `"school software".table_name`
3. ✅ Check `SUPABASE_MCP_SCHEMA_RULES.md` before operations
4. ✅ Verify with `npm run verify-schema`

**I will NEVER:**
1. ❌ Use `public` schema for school tables
2. ❌ Use `n8n_content_creation` for school tables
3. ❌ Forget the schema prefix in SQL queries
4. ❌ Change schema config without checking documentation first

**How It Happens Automatically:**
- ✅ Verification runs before dev/build (pre-hooks)
- ✅ Warning comments in code files
- ✅ Multiple documentation files as reference
- ✅ Template examples in SUPABASE_MCP_SCHEMA_RULES.md

---

## 📁 Files You Can Share

**To share schema config with anyone:**

Give them these files from parent folder:
1. `SCHEMA_MASTER_README.md` (this file)
2. `SCHEMA_REFERENCE.md`
3. `setup-all-apps-schema.sh` (run it to configure their apps)

**Or just run:**
```bash
# They run this one command:
./setup-all-apps-schema.sh

# Everything gets configured automatically!
```

---

## ✅ Status

**Completed:**
- ✅ All three apps configured with `"school software"` schema
- ✅ Verification scripts in place
- ✅ Auto-verification on dev/build
- ✅ Documentation distributed
- ✅ Backups saved (can rollback if needed)

**Remaining:**
- ⚠️ YOU must expose schema in Supabase Dashboard (manual step)

**After That:**
- 🚀 All apps will work correctly
- 🚀 No more schema confusion
- 🚀 Automated prevention system in place

---

**This is NOW the single source of truth for schema configuration!** 🔒✅

**Keep this file at the parent level** so anyone working on the project reads it first.
