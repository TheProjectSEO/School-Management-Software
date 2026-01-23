# Database Migration Guide

## 📋 Admin Messaging Migration

The admin messaging system requires one database migration to add admin support to the existing `direct_messages` table.

### Migration File
`supabase/migrations/20260112_add_admin_id_to_messages.sql`

### What It Does
1. ✅ Adds `admin_id` column to `direct_messages` table
2. ✅ Creates index for efficient admin message queries
3. ✅ Updates constraints to allow admin-to-student and admin-to-teacher messages
4. ✅ Adds RLS policies for admin message access
5. ✅ Updates `message_conversations` view to include admin messages

---

## 🚀 How to Run the Migration

### Option 1: Supabase SQL Editor (Recommended)

1. **Open the Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql/new
   ```

2. **Copy the migration SQL:**
   - Open: `supabase/migrations/20260112_add_admin_id_to_messages.sql`
   - Copy all contents

3. **Paste and Execute:**
   - Paste the SQL into the SQL Editor
   - Click "Run" button
   - Wait for success confirmation

4. **Verify:**
   - Check that no errors occurred
   - The output should show "Success" with affected row counts

---

### Option 2: Command Line (If you have DB password)

If you have the database password from Supabase dashboard:

```bash
psql "postgresql://postgres:[YOUR_DB_PASSWORD]@db.qyjzqzqqjimittltttph.supabase.co:5432/postgres" \
  -f supabase/migrations/20260112_add_admin_id_to_messages.sql
```

To get your database password:
1. Go to: https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/database
2. Click "Database password" section
3. Reset password if needed
4. Copy the password

---

### Option 3: Supabase CLI (Pull remote migrations first)

```bash
# Pull remote migrations to sync
supabase db pull

# Then push your new migration
supabase db push
```

---

## ✅ Verification Steps

After running the migration, verify it worked:

### 1. Check the table structure
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'school software'
  AND table_name = 'direct_messages'
  AND column_name = 'admin_id';
```

Should return:
```
 column_name | data_type
-------------+-----------
 admin_id    | uuid
```

### 2. Check the index
```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'school software'
  AND tablename = 'direct_messages'
  AND indexname = 'idx_direct_messages_admin';
```

Should return:
```
       indexname
------------------------
 idx_direct_messages_admin
```

### 3. Check RLS policies
```sql
SELECT policyname
FROM pg_policies
WHERE schemaname = 'school software'
  AND tablename = 'direct_messages'
  AND policyname LIKE '%Admin%';
```

Should return:
```
           policyname
--------------------------------
 Admins can view all school messages
 Admins can send messages
 Admins can update messages
```

---

## 🐛 Troubleshooting

### Error: "relation direct_messages does not exist"
- Make sure you're connected to the correct database
- Verify the schema is set to "school software"

### Error: "column admin_id already exists"
- Migration already ran successfully
- You can skip this migration

### Error: "constraint already exists"
- Some parts of the migration may have run partially
- Check which parts succeeded and comment out those lines
- Re-run the remaining SQL

---

## 📝 Next Steps

After the migration runs successfully:

1. ✅ Migration complete
2. 🧪 Test the messaging system
3. 🎉 Start messaging students and teachers!

---

## 🔗 Quick Links

- **SQL Editor:** https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/sql
- **Database Settings:** https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/database
- **Table Editor:** https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/editor
