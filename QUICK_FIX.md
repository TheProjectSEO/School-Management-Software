# ⚡ QUICK FIX - Schema Not Exposed Error

**Error You're Seeing:**
```
PGRST106: The schema must be one of the following: public, graphql_public, ...
(Notice "school software" is NOT in the list)
```

---

## ⚡ 2-Minute Fix

### Do This RIGHT NOW:

1. **Open:** https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api

2. **Find:** "Exposed schemas" field (scroll down if needed)

3. **Current value:**
   ```
   public, graphql_public
   ```

4. **Change to:**
   ```
   public, graphql_public, "school software"
   ```

   **COPY THIS EXACTLY:** `public, graphql_public, "school software"`

5. **Click:** Save

6. **Wait:** 2 minutes for API restart

7. **Test:**
   ```bash
   cd teacher-app
   npm run verify-schema
   ```

**Should now show:** ✅ All PASS

---

## Then You're Done! 🎉

All apps will work:
- student-app ✅
- teacher-app ✅
- admin-app ✅

All using the same schema: `"school software"`

---

**See:** `EXPOSE_SCHEMA_DASHBOARD_GUIDE.md` for detailed instructions with troubleshooting.
