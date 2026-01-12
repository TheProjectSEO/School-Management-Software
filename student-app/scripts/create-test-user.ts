#!/usr/bin/env tsx
/**
 * Script to create a test user in Supabase Auth
 *
 * This uses the Supabase Admin API to create a user without email verification.
 * Run with: npx tsx scripts/create-test-user.ts
 */

import { createClient } from '@supabase/supabase-js';

// You'll need to add SUPABASE_SERVICE_ROLE_KEY to your .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  console.error('\nGet your service role key from:');
  console.error('https://supabase.com/dashboard/project/qyjzqzqqjimittltttph/settings/api');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestUser() {
  console.log('🔧 Creating test user in Supabase...\n');

  const testUsers = [
    {
      email: 'student@msu.edu.ph',
      password: 'Test123!@#',
      role: 'student',
      name: 'Test Student',
    },
    {
      email: 'teacher@msu.edu.ph',
      password: 'Test123!@#',
      role: 'teacher',
      name: 'Test Teacher',
    },
    {
      email: 'admin@msu.edu.ph',
      password: 'Admin123!@#',
      role: 'admin',
      name: 'Test Admin',
    },
  ];

  for (const user of testUsers) {
    try {
      // Create user with Admin API (bypasses email verification)
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Mark email as confirmed
        user_metadata: {
          full_name: user.name,
          role: user.role,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  ${user.email} already exists`);
        } else {
          console.error(`❌ Error creating ${user.email}:`, error.message);
        }
      } else {
        console.log(`✅ Created ${user.role}: ${user.email}`);
        console.log(`   Password: ${user.password}`);
        console.log(`   User ID: ${data.user.id}\n`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error for ${user.email}:`, err);
    }
  }

  console.log('\n📋 Test Credentials Summary:');
  console.log('─────────────────────────────────────────');
  testUsers.forEach((user) => {
    console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
  });
  console.log('─────────────────────────────────────────\n');
  console.log('🎉 You can now login at http://localhost:3000/login');
}

createTestUser();
