# Quick Start Guide - Admin Portal Setup

**⏱️ Total Time: 5 minutes**

---

## 🚨 Current Status

✅ **Completed:**
- Admin authentication code fixed
- Admin user created (admin@msu.edu.ph)
- All 44 database tables exist
- Data seeding scripts ready
- Comprehensive documentation created

⚠️ **Blocked:**
- Schema `"school software"` not exposed to REST API
- ALL admin features currently blocked by this

---

## 🎯 What You Need to Do (2 Minutes)

### **Step 1: Open Supabase Dashboard**
```
https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api
```

### **Step 2: Find "Exposed schemas" Setting**
- Scroll down to "PostgREST Configuration" section
- Look for "Exposed schemas" or "Extra schemas"

### **Step 3: Add the Schema**
**Change from:**
```
public, graphql_public
```

**Change to:**
```
public, graphql_public, "school software"
```

⚠️ **Include the quotes around `school software`!**

### **Step 4: Save**
- Click "Save" button
- Wait 1-2 minutes for API restart

### **Step 5: Verify (Run this in terminal)**
```bash
cd admin-app
node test-admin-login.mjs
```

**Expected output:**
```
✅ Authentication SUCCESS
✅ Get user SUCCESS
✅ Profile lookup SUCCESS
✅ Admin verification SUCCESS
✅ ADMIN LOGIN TEST PASSED!
```

---

## 🚀 After Schema is Exposed

### **1. Seed Test Data (5 minutes)**
```bash
cd admin-app
node seed-via-supabase-client.mjs
```

**Expected:**
- 2 schools
- 4 sections
- 4+ students
- 5 courses
- 10+ enrollments

### **2. Start Admin App (if not running)**
```bash
cd admin-app
npm run dev
```

**URL:** http://localhost:3002

### **3. Login**
- **Email:** admin@msu.edu.ph
- **Password:** Admin123!@#

### **4. Test Admin Features**
Follow the protocol in `ADMIN_TESTING_PROTOCOL.md`

---

## 📁 Key Files

### **Documentation**
- `COMPLETE_CONVERSATION_SUMMARY.md` - Full conversation summary
- `COMPLETE_SOLUTION.md` - Detailed technical solution
- `ADMIN_TESTING_PROTOCOL.md` - Comprehensive testing protocol
- `EXPOSE_SCHEMA_DASHBOARD_GUIDE.md` - Step-by-step schema guide

### **Test Scripts**
- `test-admin-login.mjs` - Verify authentication works
- `check-existing-data.mjs` - Check database contents
- `seed-via-supabase-client.mjs` - Populate test data

### **Data**
- `SEED_ADMIN_DATA.sql` - SQL seeding script (alternative)

---

## ❓ Troubleshooting

### **Still getting PGRST106 error after exposing schema?**
- Wait 2-3 minutes (API restart takes time)
- Hard refresh browser (Cmd+Shift+R)
- Clear browser cache
- Try test script again

### **Can't find "Exposed schemas" setting?**
- Try Settings → Database → Schemas
- Contact Supabase support with project ID: `qyjzqzqqjimittltttph`
- Ask them to expose `"school software"` schema

### **Login still fails?**
Check:
1. Schema exposed? ✓
2. Test script passes? ✓
3. Admin app running on port 3002? ✓
4. Using correct credentials? ✓

---

## 🎉 Success Checklist

- [ ] Schema exposed in Dashboard
- [ ] Test script passes (node test-admin-login.mjs)
- [ ] Data seeded successfully
- [ ] Admin login works
- [ ] Dashboard loads with stats
- [ ] Can view students list
- [ ] Can view enrollments
- [ ] Cross-app testing ready

---

## 📞 Need Help?

**Full documentation:** `COMPLETE_CONVERSATION_SUMMARY.md`
**Technical details:** `COMPLETE_SOLUTION.md`
**Testing protocol:** `ADMIN_TESTING_PROTOCOL.md`

---

**Created:** January 12, 2026
**Status:** ⚠️ Awaiting schema exposure (2-minute task)
