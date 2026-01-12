# How to Expose "school software" Schema in Supabase Dashboard

**Time Required:** 2-3 minutes
**Difficulty:** Easy
**One-time setup:** Yes

---

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

**URL:** https://supabase.com/dashboard/project/qyjzqzqqjimittltttph

Or:
1. Go to https://supabase.com/dashboard
2. Click on your project: **qyjzqzqqjimittltttph**

---

### Step 2: Navigate to API Settings

**Click:** Settings (in left sidebar, near bottom)

Then:
**Click:** API (in the settings tabs)

You should now be on: `https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api`

---

### Step 3: Find "Exposed schemas" Setting

**Scroll down** on the API settings page until you find one of these:

- **"Exposed schemas"**
- **"Extra schemas"**
- **"DB schemas"**
- **"Exposed PostgREST schemas"**

It's usually in the **"PostgREST configuration"** section or near the bottom of the page.

---

### Step 4: Add "school software" Schema

**Current value** probably shows something like:
```
public, graphql_public
```

**Update it to:**
```
public, graphql_public, "school software"
```

**IMPORTANT:**
- ✅ Include the **quotes** around `school software`
- ✅ Use a **comma** to separate from other schemas
- ✅ The exact text is: `"school software"` (with the space inside quotes)

**Examples of correct format:**
```
public, "school software"
```
or
```
public, graphql_public, "school software"
```

---

### Step 5: Save Changes

**Click:** "Save" or "Update" button (usually at bottom of section)

**Wait:** 1-2 minutes for API to restart

You might see a notification: "API restarting..." or "Configuration updated"

---

### Step 6: Verify It Worked

**Open a terminal** and run:

```bash
# Test if schema is accessible
curl -s "https://qyjzqzqqjimittltttph.supabase.co/rest/v1/schools?select=id,name" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o"
```

**Expected result:** JSON array of schools
```json
{"schools":[{"id":"...","name":"MSU - Main Campus"},...]}
```

**Bad result:** Error message
```json
{"code":"PGRST106","message":"The schema must be..."}
```

If you get the bad result, wait another minute and try again (API might still be restarting).

---

### Step 7: Test All Apps

After verification succeeds:

```bash
# Test teacher-app
cd teacher-app
npm run verify-schema
# Should show: ✅ Schema "school software" verified!

# Test student-app
cd ../student-app
npm run verify-schema
# Should show: ✅ Schema "school software" verified!

# Test admin-app
cd ../admin-app
npm run verify-schema
# Should show: ✅ Schema "school software" verified!
```

**All three should now PASS!** ✅

---

## Troubleshooting

### Issue: Can't Find "Exposed schemas" Setting

**Try these locations:**

1. **Settings → API Tab:**
   - Look for "PostgREST" section
   - Look for "Configuration" section
   - Scroll all the way down

2. **Settings → Database Tab:**
   - Sometimes it's under Database settings
   - Look for "Schema settings"

3. **Settings → Project Settings:**
   - Might be under general project settings

### Issue: Field is Disabled/Greyed Out

**Possible cause:** You don't have permissions

**Solutions:**
- Ask project owner to do it
- Or use Owner/Admin account
- Or contact Supabase support

### Issue: Save Button Doesn't Work

**Try:**
- Refresh page and try again
- Check browser console for errors
- Try different browser

### Issue: API Doesn't Restart

**Wait 5 minutes** - Sometimes takes longer

**Check API status:**
- Settings → API → Check if there's a status indicator
- Try the curl command again after 5 minutes

---

## Alternative: Contact Supabase Support

If you can't find the setting:

**Supabase Support:**
- Email: support@supabase.com
- Discord: https://discord.supabase.com

**Tell them:**
```
Hi, I need to expose a custom schema to PostgREST API.

Project: qyjzqzqqjimittltttph
Schema name: "school software" (with quotes, has a space)

Current exposed schemas: public, graphql_public
Requested: Add "school software" to exposed schemas

Reason: Multi-app school management system using this schema

Can you help enable this or point me to the setting?
```

---

## After Schema is Exposed

**Everything will work:**

✅ All apps start without errors
✅ Schools dropdown loads in registration
✅ All database queries work
✅ `npm run verify-schema` passes in all apps
✅ "No students found" issue will be fixed (can query students)

---

## Summary

**What to do:**
1. Go to Supabase Dashboard
2. Settings → API
3. Find "Exposed schemas" setting
4. Add: `"school software"`
5. Save
6. Wait 1-2 minutes
7. Run: `npm run verify-schema` in teacher-app
8. Should see: ✅ All PASS

**Estimated time:** 2-3 minutes

**Then:** Continue testing teacher app with working database!

---

**Created:** January 1, 2026
**Project:** MSU School OS
**Status:** Waiting for dashboard configuration
