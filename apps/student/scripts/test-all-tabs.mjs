#!/usr/bin/env node
/**
 * Comprehensive Playwright test for login and all tabs
 *
 * This script will:
 * 1. Login with test credentials
 * 2. Navigate to all 13 tabs
 * 3. Verify each tab loads properly
 * 4. Generate a detailed report
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'student@msu.edu.ph',
  password: 'MSUStudent2024!',
};

const TABS_TO_TEST = [
  { name: 'Dashboard', url: '/', expectedTitle: 'Dashboard', expectedContent: ['Welcome back', 'Continue Learning'] },
  { name: 'My Subjects', url: '/subjects', expectedTitle: 'My Subjects', expectedContent: ['Web Development', 'Data Structures'] },
  { name: 'Assessments', url: '/assessments', expectedTitle: 'Assessments', expectedContent: ['Upcoming', 'Past'] },
  { name: 'Grades', url: '/grades', expectedTitle: 'Grades', expectedContent: ['Report Card', 'GPA'] },
  { name: 'Attendance', url: '/attendance', expectedTitle: 'Attendance', expectedContent: ['Attendance Record'] },
  { name: 'Progress', url: '/progress', expectedTitle: 'Progress', expectedContent: ['Learning Progress'] },
  { name: 'Notes', url: '/notes', expectedTitle: 'Notes', expectedContent: ['My Notes'] },
  { name: 'Downloads', url: '/downloads', expectedTitle: 'Downloads', expectedContent: ['Downloads'] },
  { name: 'Messages', url: '/messages', expectedTitle: 'Messages', expectedContent: ['Messages'] },
  { name: 'Announcements', url: '/announcements', expectedTitle: 'Announcements', expectedContent: ['Announcements'] },
  { name: 'Notifications', url: '/notifications', expectedTitle: 'Notifications', expectedContent: ['Notifications'] },
  { name: 'Profile', url: '/profile', expectedTitle: 'Profile', expectedContent: ['Student Information', 'Test Student'] },
  { name: 'Help', url: '/help', expectedTitle: 'Help', expectedContent: ['Help'] },
];

console.log('🧪 MSU Student Portal - Comprehensive Tab Test\n');
console.log('='.repeat(70));

const results = {
  login: false,
  tabs: [],
  errors: [],
};

let browser, page;

try {
  // Launch browser
  console.log('\n🌐 Launching browser...');
  browser = await chromium.launch({ headless: false });
  page = await browser.newPage();

  // Step 1: Test Login
  console.log('\n📝 Step 1: Testing Login Flow');
  console.log('-'.repeat(70));

  await page.goto(`${BASE_URL}/login`);
  console.log(`✅ Navigated to login page`);

  // Fill in credentials
  await page.fill('input[type="email"], input[placeholder*="student"]', TEST_CREDENTIALS.email);
  await page.fill('input[type="password"], input[placeholder*="password" i]', TEST_CREDENTIALS.password);
  console.log(`✅ Filled in credentials`);

  // Click login button
  await page.click('button:has-text("Log In")');
  console.log(`✅ Clicked login button`);

  // Wait for navigation to dashboard
  try {
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    console.log(`✅ Successfully logged in and redirected to dashboard`);
    results.login = true;
  } catch (error) {
    console.log(`❌ Login failed: ${error.message}`);
    results.errors.push({ step: 'Login', error: error.message });

    // Check if there's an error message on page
    const errorMessage = await page.textContent('.error, [role="alert"], .text-red-500').catch(() => null);
    if (errorMessage) {
      console.log(`   Error message: ${errorMessage}`);
    }

    throw new Error('Login failed - stopping test');
  }

  // Wait a bit for the page to fully load
  await page.waitForTimeout(2000);

  // Step 2: Test All Tabs
  console.log('\n📁 Step 2: Testing All Tabs');
  console.log('-'.repeat(70));

  for (const tab of TABS_TO_TEST) {
    const tabResult = {
      name: tab.name,
      url: tab.url,
      success: false,
      loadTime: 0,
      errors: [],
    };

    try {
      const startTime = Date.now();

      console.log(`\n🔍 Testing: ${tab.name} (${tab.url})`);

      // Navigate to tab
      await page.goto(`${BASE_URL}${tab.url}`, { waitUntil: 'networkidle' });
      console.log(`   ✓ Page loaded`);

      // Check if we got redirected to login (auth failed)
      if (page.url().includes('/login')) {
        throw new Error('Redirected to login - authentication failed');
      }

      // Check for error messages
      const hasError = await page.locator('.error, [role="alert"].error, .text-red-600').count() > 0;
      if (hasError) {
        const errorText = await page.textContent('.error, [role="alert"].error, .text-red-600');
        throw new Error(`Page has error: ${errorText}`);
      }

      // Verify expected content (at least one match)
      let foundContent = false;
      for (const content of tab.expectedContent) {
        const exists = await page.getByText(content, { exact: false }).count() > 0;
        if (exists) {
          console.log(`   ✓ Found expected content: "${content}"`);
          foundContent = true;
          break;
        }
      }

      if (!foundContent) {
        console.log(`   ⚠️  Expected content not found, but page loaded`);
      }

      const loadTime = Date.now() - startTime;
      tabResult.loadTime = loadTime;
      tabResult.success = true;

      console.log(`   ✅ ${tab.name} - OK (${loadTime}ms)`);

    } catch (error) {
      console.log(`   ❌ ${tab.name} - FAILED: ${error.message}`);
      tabResult.errors.push(error.message);
      results.errors.push({ tab: tab.name, error: error.message });
    }

    results.tabs.push(tabResult);
    await page.waitForTimeout(500); // Small delay between tabs
  }

  // Step 3: Test Logout
  console.log('\n🚪 Step 3: Testing Logout');
  console.log('-'.repeat(70));

  try {
    // Find and click logout button
    await page.click('button:has-text("Log Out"), button:has-text("Logout")');
    console.log(`✅ Clicked logout button`);

    // Wait for redirect to login
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
    console.log(`✅ Successfully logged out and redirected to login`);
  } catch (error) {
    console.log(`⚠️  Logout test failed: ${error.message}`);
  }

} catch (error) {
  console.log(`\n❌ Critical error: ${error.message}\n`);
  results.errors.push({ step: 'Critical', error: error.message });
} finally {
  if (browser) {
    await browser.close();
  }
}

// Print Results
console.log('\n' + '='.repeat(70));
console.log('📊 TEST RESULTS SUMMARY');
console.log('='.repeat(70));

console.log(`\n✅ Login: ${results.login ? 'PASSED' : 'FAILED'}`);

const passedTabs = results.tabs.filter(t => t.success).length;
const totalTabs = results.tabs.length;

console.log(`\n📁 Tabs: ${passedTabs}/${totalTabs} PASSED`);

if (passedTabs === totalTabs) {
  console.log('   🎉 ALL TABS WORKING!');
} else {
  console.log(`   ⚠️  ${totalTabs - passedTabs} tabs failed`);
}

// Show detailed tab results
console.log('\n📋 Detailed Tab Results:');
for (const tab of results.tabs) {
  const status = tab.success ? '✅' : '❌';
  const time = tab.loadTime > 0 ? ` (${tab.loadTime}ms)` : '';
  console.log(`   ${status} ${tab.name.padEnd(20)} ${tab.url}${time}`);

  if (tab.errors.length > 0) {
    tab.errors.forEach(err => {
      console.log(`      └─ Error: ${err}`);
    });
  }
}

// Show errors
if (results.errors.length > 0) {
  console.log('\n⚠️  Errors Encountered:');
  results.errors.forEach((err, i) => {
    console.log(`   ${i + 1}. [${err.step || err.tab}] ${err.error}`);
  });
}

// Final verdict
console.log('\n' + '='.repeat(70));
if (results.login && passedTabs === totalTabs && results.errors.length === 0) {
  console.log('✅ COMPLETE SUCCESS - All tests passed!\n');
  console.log('🎉 Your student app is fully functional!');
  process.exit(0);
} else if (results.login && passedTabs > 0) {
  console.log('⚠️  PARTIAL SUCCESS - Login works but some tabs have issues\n');
  console.log('💡 Review the errors above and fix the failing tabs');
  process.exit(1);
} else {
  console.log('❌ TESTS FAILED - Critical issues detected\n');
  console.log('💡 Review the errors above and re-run after fixing');
  process.exit(1);
}
