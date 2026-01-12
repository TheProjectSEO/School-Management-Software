# Get Supabase Service Role Key (2 minutes)

## Quick Steps:

1. **Open Supabase Dashboard:**
   - Go to: https://qyjzqzqqjimittltttph.supabase.co

2. **Navigate to API Settings:**
   - Click **Settings** (gear icon in sidebar)
   - Click **API**

3. **Copy Service Role Key:**
   - Scroll to "Project API keys"
   - Find the **service_role** key (NOT the anon key)
   - Click the copy icon

4. **Add to Environment:**
   ```bash
   # I'll add it to .env.local for you once you provide it
   ```

---

## Alternative: Manual User Creation (5 minutes)

If you prefer not to use the Service Role key:

1. **Go to:** https://qyjzqzqqjimittltttph.supabase.co
2. **Click:** Authentication → Users
3. **Click:** "Add user" button
4. **Fill in:**
   - Email: `admin@msu.edu.ph`
   - Password: `Admin123!@#`
   - Auto Confirm User: ✅ **CHECK THIS BOX**
5. **Click:** "Create user"

Then tell me when done and I'll run the setup script!

---

**Which method do you prefer?**
- A) Give me the Service Role key (fully automated)
- B) Create user manually (you do step 1-5 above)
