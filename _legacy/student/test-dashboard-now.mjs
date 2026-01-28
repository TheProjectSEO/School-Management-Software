#!/usr/bin/env node

/**
 * Quick Dashboard Test Script
 * Uses Playwright to login and inspect what's actually on the dashboard
 */

import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'student@msu.edu.ph';
const TEST_PASSWORD = 'Test123!@#';

async function testDashboard() {
  console.log('🚀 Starting Playwright browser test...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Step 1: Go to login
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/live-01-login.png' });
    console.log('   ✅ Login page loaded\n');

    // Step 2: Fill credentials
    console.log('📍 Step 2: Filling credentials...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    console.log('   ✅ Credentials entered\n');

    // Step 3: Click login
    console.log('📍 Step 3: Clicking login button...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/live-02-after-login.png' });

    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}\n`);

    // Step 4: Inspect dashboard
    console.log('📍 Step 4: Inspecting dashboard...');
    await page.screenshot({ path: 'test-results/live-03-dashboard-full.png', fullPage: true });

    // Check for widgets
    const widgets = await page.$$('.widget, .card, [class*="card"], [class*="widget"]');
    console.log(`   Widgets/Cards found: ${widgets.length}`);

    // Check for course listings
    const courses = await page.$$('[class*="course"], [href*="/subjects/"]');
    console.log(`   Course elements found: ${courses.length}`);

    // Check for text content
    const mainContent = await page.$('main');
    const text = await mainContent?.innerText() || '';
    console.log(`   Main content length: ${text.length} characters`);

    // Get console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    console.log(`\n   Console errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('   Latest errors:');
      errors.slice(-5).forEach(err => console.log(`     - ${err}`));
    }

    // Step 5: Try clicking My Subjects
    console.log('\n📍 Step 5: Checking My Subjects...');
    const subjectsLink = await page.$('text=My Subjects, a[href="/subjects"]');
    if (subjectsLink) {
      await subjectsLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/live-04-subjects.png' });
      console.log('   ✅ My Subjects page loaded');
    } else {
      console.log('   ⚠️ My Subjects link not found');
    }

    // Final report
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Final URL: ${page.url()}`);
    console.log(`Widgets visible: ${widgets.length}`);
    console.log(`Course elements: ${courses.length}`);
    console.log(`Console errors: ${errors.length}`);
    console.log(`Screenshots saved in: test-results/`);
    console.log('='.repeat(60));
    console.log('\n✅ Test complete! Check screenshots to see what student sees.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDashboard();
