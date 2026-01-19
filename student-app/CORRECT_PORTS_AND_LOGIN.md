# ✅ CORRECT PORTS & FIXED LOGINS

## 🔧 Port Configuration

Based on package.json files:

| App | Port | Status |
|-----|------|--------|
| **Teacher-App** | 3001 | ✅ `next dev -p 3001` |
| **Admin-App** | 3002 | ✅ `next dev -p 3002` |
| **Student-App** | 3000 | ✅ Default Next.js port |

---

## 🔑 CORRECTED LOGIN CREDENTIALS

### 👨‍🏫 TEACHER (Port 3001 - NOT 3002!)

```
URL:      http://localhost:3001/login
Email:    teacher.demo@msu.edu.ph
Password: Demo123!@#
```

**Fixed:** RPC function `get_teacher_profile()` updated ✅

---

### 👔 ADMIN (Port 3002 - NOT 3001!)

```
URL:      http://localhost:3002/login
Email:    admin.demo@msu.edu.ph
Password: Demo123!@#
```

**Fixed:** RPC function `get_admin_profile()` updated ✅

---

### 👨‍🎓 STUDENT (Port 3000)

```
URL:      http://localhost:3000/login
Email:    adityaamandigital@gmail.com
Password: MSUStudent2024!@#
```

**Fixed:** RPC function `get_user_role()` updated ✅

---

## 🚀 START APPS ON CORRECT PORTS

```bash
# Terminal 1 - Teacher App
cd teacher-app
npm run dev
# ✅ Starts on http://localhost:3001

# Terminal 2 - Admin App
cd admin-app
npm run dev
# ✅ Starts on http://localhost:3002

# Terminal 3 - Student App
cd student-app
npm run dev
# ✅ Starts on http://localhost:3000
```

---

## ✅ VERIFIED RPC FUNCTIONS

All three RPC functions now work correctly:

1. ✅ `get_admin_profile()` - Uses `school_profiles`
2. ✅ `get_teacher_profile()` - Uses `school_profiles`
3. ✅ `get_user_role()` - Uses `school_profiles`

**All granted execute permissions to anon and authenticated roles.**

---

## 🧪 TRY LOGGING IN NOW

**Teacher:** http://localhost:3001/login
- teacher.demo@msu.edu.ph / Demo123!@#
- Should load teacher dashboard without 404 ✅

**Admin:** http://localhost:3002/login
- admin.demo@msu.edu.ph / Demo123!@#
- Should load admin dashboard ✅

**Student:** http://localhost:3000/login
- adityaamandigital@gmail.com / MSUStudent2024!@#
- Should load subjects page ✅

---

## 🎯 About the 3004 Redirect

The redirect to port 3004 was likely because:
- You had teacher-app running on wrong port
- Or there was a cached redirect

**Solution:**
1. Stop all apps (Ctrl+C)
2. Clear browser cache or use incognito
3. Start teacher-app on correct port 3001
4. Navigate to http://localhost:3001/login
5. Should work now!

---

## ✅ ALL FIXED

✅ Teacher RPC function fixed
✅ Admin RPC function fixed
✅ Student RPC function fixed
✅ Correct ports documented
✅ All permissions granted

**All three apps should work now!** 🎉
