# Database Schema Analysis - The Complete Truth

**Date:** January 1, 2026
**Analysis:** Claude Code examining actual Supabase database

---

## 🔍 What I Discovered

### **Source 1: Your Admin Login Code Expects**
```typescript
// app/(auth)/login/page.tsx expects this flow:
1. auth.users (Supabase managed) ✅ EXISTS
2. profiles table with auth_user_id ❌ DOES NOT EXIST
3. school_members with role ✅ EXISTS
```

### **Source 2: Your Actual Database Has**
```sql
✅ auth.users (5 users including admin@msu.edu.ph)
❌ profiles table - MISSING!
✅ school_members (4 rows, with profile_id column)
✅ teachers table
✅ admins table (empty)
```

---

## 🎯 The Problem

Your login code (lines 44-55) tries to query a table that doesn't exist:

```typescript
const { data: profile } = await supabase
  .from("profiles")  // ❌ This table DOES NOT exist in your database!
  .select("id")
  .eq("auth_user_id", user.id)
  .single();
```

**Result:** Query fails, login fails, entire admin portal blocked.

---

## 📊 Actual Database State

### auth.users (Managed by Supabase)
```
✅ admin@msu.edu.ph      (id: 2da60adc-ea62-4016-90b8-984795fa7305)
✅ teacher@msu.edu.ph    (id: 862a76b7-789f-4056-be9f-879ff006a5ca)
✅ student@msu.edu.ph    (id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
✅ maria.santos@msu.edu.ph
✅ juan.delacruz@msu.edu.ph
```

### school_members (Your Main Table)
```sql
Columns: id, school_id, profile_id, role, status, created_at, updated_at

Role Constraint: 'school_admin', 'teacher', 'parent', 'student'

Existing rows:
- profile_id: bbbbbbbb-0000-0000-0000-000000000001, role: school_admin
- profile_id: bbbbbbbb-0000-0000-0000-000000000002, role: teacher
- profile_id: bbbbbbbb-0000-0000-0000-000000000003, role: student
- profile_id: 49a69ddf-c3cc-42bc-848e-c9fa00ef650e, role: student
```

**Note:** These profile_ids DON'T link to auth.users - they're dummy UUIDs!

### teachers table
```sql
Columns: id, school_id, profile_id, employee_id
Rows: 1
```

### admins table
```sql
Columns: id, school_id, profile_id
Rows: 0 (EMPTY!)
```

---

## ✅ THE SOLUTION - Two Options

### **Option A: Create profiles Table (What Code Expects)**

**What:** Create the missing `profiles` table

**Why:** Your admin code expects it to exist

**Schema:**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Create index for performance
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
```

**Then:**
```sql
-- Create profile for admin user
INSERT INTO profiles (auth_user_id, full_name, email)
VALUES (
  '2da60adc-ea62-4016-90b8-984795fa7305',  -- admin@msu.edu.ph
  'System Administrator',
  'admin@msu.edu.ph'
) RETURNING id;

-- Let's say this returns: profile_id = 'xxxxx-xxxxx-xxxxx'

-- Create school_members entry
INSERT INTO school_members (school_id, profile_id, role, status)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',  -- existing school_id
  'xxxxx-xxxxx-xxxxx',  -- from above
  'school_admin',
  'active'
);
```

**Pros:**
- Matches what your code expects
- Follows standard pattern (auth → profile → member)
- Allows storing additional user info
- Good for multi-tenant systems

**Cons:**
- Additional table to manage
- More complex joins
- Need migration

---

### **Option B: Simplify - Remove profiles Table Requirement**

**What:** Change login code to work without profiles table

**Why:** Simpler, uses existing schema

**Code Change:**
```typescript
// app/(auth)/login/page.tsx

// REMOVE lines 44-55 (profiles query)

// CHANGE lines 57-63 to:
const { data: schoolMember } = await supabase
  .from("school_members")
  .select("role")
  .eq("profile_id", user.id)  // ← Use auth user ID directly
  .in("role", ["school_admin"])
  .eq("status", "active")  // ← Use status instead of is_active
  .single();
```

**Then:**
```sql
-- Update existing school_admin to use real auth user ID
UPDATE school_members
SET profile_id = '2da60adc-ea62-4016-90b8-984795fa7305'  -- admin@msu.edu.ph
WHERE profile_id = 'bbbbbbbb-0000-0000-0000-000000000001'
AND role = 'school_admin';
```

**Pros:**
- No new table needed
- Uses existing schema
- Simpler architecture
- Works immediately

**Cons:**
- Can't store extended profile info (phone, avatar, etc.)
- Less flexible for future

---

## 🎯 MY RECOMMENDATION

**Use Option A - Create profiles Table**

**Why:**
1. Your codebase clearly expects this pattern (other apps might too)
2. Standard multi-tenant SaaS architecture
3. Allows user profiles with additional data
4. Better separation of concerns
5. More maintainable long-term

**I'll create the migration and set it up for you!**

---

## 📋 What I'll Do Next

1. ✅ Create `profiles` table migration
2. ✅ Create profile for admin@msu.edu.ph user
3. ✅ Link profile to school_members with school_admin role
4. ✅ Test login works
5. ✅ Resume comprehensive testing

**Shall I proceed with creating the schema?**
