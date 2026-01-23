import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { closeNextJSOverlay } from './test-helpers';

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'student@msu.edu.ph',
  password: 'Test123!@#'
};

const SCREENSHOT_DIR = '/Users/adityaaman/Desktop/All Development/School management Software/.playwright-mcp';

interface Issue {
  id: number;
  page: string;
  type: 'error' | 'warning' | 'network' | 'interaction';
  message: string;
  screenshot?: string;
  timestamp: string;
  fixed: boolean;
}

interface TestResult {
  page: string;
  status: 'pass' | 'fail' | 'warning';
  consoleErrors: string[];
  consoleWarnings: string[];
  networkErrors: string[];
  interactionErrors: string[];
  loadTime: number;
  screenshot: string;
  issues: number[];
}

const issues: Issue[] = [];
const testResults: TestResult[] = [];
let issueCounter = 0;

function createIssue(page: string, type: Issue['type'], message: string, screenshot?: string): number {
  const issue: Issue = {
    id: ++issueCounter,
    page,
    type,
    message,
    screenshot,
    timestamp: new Date().toISOString(),
    fixed: false
  };
  issues.push(issue);
  return issue.id;
}

async function captureConsoleAndNetwork(page: Page, pageName: string) {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const networkErrors: string[] = [];
  const issueIds: number[] = [];

  const consoleHandler = (msg: any) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      const issueId = createIssue(pageName, 'error', text);
      issueIds.push(issueId);
      console.log(`❌ [${pageName}] Console Error: ${text.substring(0, 100)}`);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(text);
      console.log(`⚠️  [${pageName}] Console Warning: ${text.substring(0, 100)}`);
    }
  };

  const networkHandler = (request: any) => {
    const errorText = `${request.url()} - ${request.failure()?.errorText}`;
    networkErrors.push(errorText);
    const issueId = createIssue(pageName, 'network', errorText);
    issueIds.push(issueId);
    console.log(`🌐 [${pageName}] Network Error: ${errorText}`);
  };

  page.on('console', consoleHandler);
  page.on('requestfailed', networkHandler);

  return {
    consoleErrors,
    consoleWarnings,
    networkErrors,
    issueIds,
    cleanup: () => {
      page.removeListener('console', consoleHandler);
      page.removeListener('requestfailed', networkHandler);
    }
  };
}

async function takeScreenshot(page: Page, name: string): Promise<string> {
  const filename = `systematic-${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filename;
}

test.describe('COMPREHENSIVE MISSION: End-to-End Testing with Parallel Fixes', () => {

  test('Test 1: Login Attempt', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: LOGIN ATTEMPT');
    console.log('='.repeat(80));

    const startTime = Date.now();
    const capture = await captureConsoleAndNetwork(page, 'Login');

    try {
      // Navigate to login page
      console.log('🌐 Navigating to http://localhost:3000/login');
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });

      await takeScreenshot(page, '01-login-page');

      // Fill credentials
      console.log('✍️  Filling credentials');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);

      await takeScreenshot(page, '01-login-filled');

      // Click login and wait for navigation
      console.log('🖱️  Clicking Log In button');
      const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
      await page.click('button[type="submit"]');
      await navigationPromise;

      // Wait for dashboard to load
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      await takeScreenshot(page, '01-login-complete');

      const loadTime = Date.now() - startTime;

      console.log(`✅ Login completed`);
      console.log(`📍 Current URL: ${currentUrl}`);
      console.log(`⏱️  Load time: ${loadTime}ms`);
      console.log(`❌ Console errors: ${capture.consoleErrors.length}`);
      console.log(`⚠️  Console warnings: ${capture.consoleWarnings.length}`);
      console.log(`🌐 Network errors: ${capture.networkErrors.length}`);

      // Check if redirected to dashboard
      const redirectSuccess = currentUrl.includes(BASE_URL) && !currentUrl.includes('/login');

      if (!redirectSuccess) {
        const issueId = createIssue('Login', 'interaction', 'Login did not redirect to dashboard', '01-login-complete.png');
        capture.issueIds.push(issueId);
      }

      testResults.push({
        page: 'Login',
        status: capture.issueIds.length === 0 ? 'pass' : 'fail',
        consoleErrors: capture.consoleErrors,
        consoleWarnings: capture.consoleWarnings,
        networkErrors: capture.networkErrors,
        interactionErrors: redirectSuccess ? [] : ['No redirect to dashboard'],
        loadTime,
        screenshot: '01-login-complete.png',
        issues: capture.issueIds
      });

      expect(redirectSuccess).toBe(true);

    } finally {
      capture.cleanup();
    }
  });

  test('Test 2: Dashboard - Verify Components', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: DASHBOARD - VERIFY COMPONENTS');
    console.log('='.repeat(80));

    // Login first
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(2000);

    const startTime = Date.now();
    const capture = await captureConsoleAndNetwork(page, 'Dashboard');

    try {
      console.log('🔍 Checking dashboard components...');

      // Check for sidebar
      const hasSidebar = await page.locator('aside, nav, [class*="sidebar"]').count() > 0;
      console.log(`${hasSidebar ? '✅' : '❌'} Sidebar: ${hasSidebar ? 'Present' : 'Missing'}`);

      if (!hasSidebar) {
        const issueId = createIssue('Dashboard', 'interaction', 'Sidebar not found');
        capture.issueIds.push(issueId);
      }

      // Check for user name display
      const userNameVisible = await page.locator('text=/student|user/i').count() > 0;
      console.log(`${userNameVisible ? '✅' : '❌'} User name: ${userNameVisible ? 'Visible' : 'Not visible'}`);

      if (!userNameVisible) {
        const issueId = createIssue('Dashboard', 'interaction', 'User name not displayed');
        capture.issueIds.push(issueId);
      }

      // Check for cards/widgets
      const widgetCount = await page.locator('[class*="card"], [class*="widget"], [class*="stat"]').count();
      console.log(`📊 Widgets/Cards found: ${widgetCount}`);

      if (widgetCount === 0) {
        const issueId = createIssue('Dashboard', 'interaction', 'No widgets or cards found on dashboard');
        capture.issueIds.push(issueId);
      }

      // Try clicking on widgets
      if (widgetCount > 0) {
        console.log('🖱️  Attempting to click first widget...');
        try {
          const firstWidget = page.locator('[class*="card"], [class*="widget"], [class*="stat"]').first();
          await firstWidget.click({ timeout: 5000 });
          console.log('✅ Widget clicked successfully');
        } catch (error) {
          console.log(`⚠️  Could not click widget: ${error}`);
        }
      }

      await takeScreenshot(page, '02-dashboard');

      const loadTime = Date.now() - startTime;

      testResults.push({
        page: 'Dashboard',
        status: capture.issueIds.length === 0 ? 'pass' : (capture.consoleErrors.length > 0 ? 'fail' : 'warning'),
        consoleErrors: capture.consoleErrors,
        consoleWarnings: capture.consoleWarnings,
        networkErrors: capture.networkErrors,
        interactionErrors: [],
        loadTime,
        screenshot: '02-dashboard.png',
        issues: capture.issueIds
      });

    } finally {
      capture.cleanup();
    }
  });

  test('Test 3-15: All Navigation Tabs', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3-15: ALL NAVIGATION TABS');
    console.log('='.repeat(80));

    // Login first
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(2000);

    const pagesToTest = [
      { path: '/subjects', name: 'Subjects', index: 3 },
      { path: '/assessments', name: 'Assessments', index: 4 },
      { path: '/grades', name: 'Grades', index: 5 },
      { path: '/attendance', name: 'Attendance', index: 6 },
      { path: '/progress', name: 'Progress', index: 7 },
      { path: '/notes', name: 'Notes', index: 8 },
      { path: '/downloads', name: 'Downloads', index: 9 },
      { path: '/messages', name: 'Messages', index: 10 },
      { path: '/announcements', name: 'Announcements', index: 11 },
      { path: '/notifications', name: 'Notifications', index: 12 },
      { path: '/profile', name: 'Profile', index: 13 },
      { path: '/help', name: 'Help', index: 14 }
    ];

    for (const pageInfo of pagesToTest) {
      console.log('\n' + '-'.repeat(80));
      console.log(`Testing: ${pageInfo.name} (${pageInfo.path})`);
      console.log('-'.repeat(80));

      const startTime = Date.now();
      const capture = await captureConsoleAndNetwork(page, pageInfo.name);

      try {
        // Navigate
        console.log(`🌐 Navigating to ${BASE_URL}${pageInfo.path}`);
        await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Try to interact - click any buttons
        const buttonCount = await page.locator('button:visible').count();
        console.log(`🔘 Visible buttons: ${buttonCount}`);

        if (buttonCount > 0) {
          try {
            const button = page.locator('button:visible').first();
            const buttonText = await button.textContent();
            console.log(`🖱️  Clicking button: "${buttonText}"`);
            await button.click({ timeout: 3000 });
            await page.waitForTimeout(1000);
          } catch (error) {
            console.log(`⚠️  Could not click button: ${error}`);
          }
        }

        // Try to fill any visible forms
        const inputCount = await page.locator('input:visible, textarea:visible').count();
        console.log(`📝 Visible inputs: ${inputCount}`);

        if (inputCount > 0) {
          try {
            const input = page.locator('input:visible, textarea:visible').first();
            const inputType = await input.getAttribute('type');
            console.log(`✍️  Filling input type: ${inputType}`);
            await input.fill('Test input');
            await page.waitForTimeout(500);
          } catch (error) {
            console.log(`⚠️  Could not fill input: ${error}`);
          }
        }

        const screenshotName = `${String(pageInfo.index).padStart(2, '0')}-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}`;
        await takeScreenshot(page, screenshotName);

        const loadTime = Date.now() - startTime;

        console.log(`⏱️  Load time: ${loadTime}ms`);
        console.log(`❌ Console errors: ${capture.consoleErrors.length}`);
        console.log(`⚠️  Console warnings: ${capture.consoleWarnings.length}`);
        console.log(`🌐 Network errors: ${capture.networkErrors.length}`);

        testResults.push({
          page: pageInfo.name,
          status: capture.consoleErrors.length === 0 ? 'pass' : 'fail',
          consoleErrors: capture.consoleErrors,
          consoleWarnings: capture.consoleWarnings,
          networkErrors: capture.networkErrors,
          interactionErrors: [],
          loadTime,
          screenshot: `${screenshotName}.png`,
          issues: capture.issueIds
        });

      } catch (error) {
        console.log(`❌ FAILED: ${error}`);
        const issueId = createIssue(pageInfo.name, 'error', `Navigation failed: ${error}`);

        testResults.push({
          page: pageInfo.name,
          status: 'fail',
          consoleErrors: [...capture.consoleErrors, `Navigation error: ${error}`],
          consoleWarnings: capture.consoleWarnings,
          networkErrors: capture.networkErrors,
          interactionErrors: [`Failed to load: ${error}`],
          loadTime: 0,
          screenshot: '',
          issues: [...capture.issueIds, issueId]
        });
      } finally {
        capture.cleanup();
      }
    }
  });

  test('Test 16: AI Chat Functionality', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 16: AI CHAT FUNCTIONALITY');
    console.log('='.repeat(80));

    // Login first
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);
    await page.waitForTimeout(2000);

    const capture = await captureConsoleAndNetwork(page, 'AI Chat');

    try {
      console.log('🤖 Looking for AI chat button/feature...');

      // Look for AI chat button
      const chatButtons = await page.locator('button:has-text("chat"), button:has-text("ai"), [class*="chat"]').count();
      console.log(`🔍 Found ${chatButtons} potential chat buttons`);

      if (chatButtons > 0) {
        console.log('🖱️  Opening AI chat...');
        await page.locator('button:has-text("chat"), button:has-text("ai"), [class*="chat"]').first().click();
        await page.waitForTimeout(1000);

        await takeScreenshot(page, '15-ai-chat-opened');

        // Look for chat input
        const chatInput = page.locator('input[placeholder*="message"], input[placeholder*="chat"], textarea[placeholder*="message"]');
        const hasChatInput = await chatInput.count() > 0;

        if (hasChatInput) {
          console.log('✍️  Typing message: "What courses am I enrolled in?"');
          await chatInput.fill('What courses am I enrolled in?');

          await takeScreenshot(page, '15-ai-chat-message-typed');

          // Try to send
          const sendButton = page.locator('button:has-text("send"), button[type="submit"]').last();
          const hasSendButton = await sendButton.count() > 0;

          if (hasSendButton) {
            console.log('📤 Sending message...');
            await sendButton.click();

            // Wait for response (up to 10 seconds)
            console.log('⏳ Waiting for AI response...');
            await page.waitForTimeout(10000);

            await takeScreenshot(page, '15-ai-chat-response');
            console.log('✅ AI chat test completed');
          } else {
            console.log('⚠️  Send button not found');
            const issueId = createIssue('AI Chat', 'interaction', 'Send button not found');
            capture.issueIds.push(issueId);
          }
        } else {
          console.log('⚠️  Chat input not found');
          const issueId = createIssue('AI Chat', 'interaction', 'Chat input field not found');
          capture.issueIds.push(issueId);
        }
      } else {
        console.log('⚠️  AI chat button not found');
        const issueId = createIssue('AI Chat', 'interaction', 'AI chat button/feature not found on page');
        capture.issueIds.push(issueId);
      }

      testResults.push({
        page: 'AI Chat',
        status: capture.issueIds.length === 0 ? 'pass' : 'warning',
        consoleErrors: capture.consoleErrors,
        consoleWarnings: capture.consoleWarnings,
        networkErrors: capture.networkErrors,
        interactionErrors: [],
        loadTime: 0,
        screenshot: '15-ai-chat-response.png',
        issues: capture.issueIds
      });

    } finally {
      capture.cleanup();
    }
  });

  test('Test 17: Logout and Re-login', async ({ page }) => {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 17: LOGOUT AND RE-LOGIN');
    console.log('='.repeat(80));

    const capture = await captureConsoleAndNetwork(page, 'Logout/Re-login');

    try {
      // Login first
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('button[type="submit"]')
      ]);
      await page.waitForTimeout(2000);

      console.log('🔍 Looking for logout button...');

      // Look for logout button
      const logoutButton = page.locator('button:has-text("logout"), button:has-text("sign out"), a:has-text("logout")');
      const hasLogoutButton = await logoutButton.count() > 0;

      if (hasLogoutButton) {
        console.log('🖱️  Clicking logout...');

        // Close NextJS dev overlay if present to prevent click interception
        console.log('🔧 Closing NextJS dev overlay if present...');
        await closeNextJSOverlay(page);

        // Use force: true to bypass any remaining overlay interception
        await logoutButton.first().click({ force: true });
        await page.waitForTimeout(2000);

        const currentUrl = page.url();
        console.log(`📍 Current URL after logout: ${currentUrl}`);

        await takeScreenshot(page, '16-after-logout');

        const redirectedToLogin = currentUrl.includes('/login');
        console.log(`${redirectedToLogin ? '✅' : '❌'} Redirected to login: ${redirectedToLogin}`);

        if (!redirectedToLogin) {
          const issueId = createIssue('Logout', 'interaction', 'Logout did not redirect to login page');
          capture.issueIds.push(issueId);
        }

        // Now re-login
        console.log('🔄 Re-logging in...');
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[type="password"]', TEST_USER.password);
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle' }),
          page.click('button[type="submit"]')
        ]);
        await page.waitForTimeout(2000);

        const reloginUrl = page.url();
        const reloginSuccess = !reloginUrl.includes('/login');
        console.log(`${reloginSuccess ? '✅' : '❌'} Re-login successful: ${reloginSuccess}`);

        await takeScreenshot(page, '16-after-relogin');

        if (!reloginSuccess) {
          const issueId = createIssue('Re-login', 'interaction', 'Re-login failed');
          capture.issueIds.push(issueId);
        }

      } else {
        console.log('⚠️  Logout button not found');
        const issueId = createIssue('Logout', 'interaction', 'Logout button not found');
        capture.issueIds.push(issueId);
      }

      testResults.push({
        page: 'Logout/Re-login',
        status: capture.issueIds.length === 0 ? 'pass' : 'warning',
        consoleErrors: capture.consoleErrors,
        consoleWarnings: capture.consoleWarnings,
        networkErrors: capture.networkErrors,
        interactionErrors: [],
        loadTime: 0,
        screenshot: '16-after-relogin.png',
        issues: capture.issueIds
      });

    } finally {
      capture.cleanup();
    }
  });

  test('Final: Generate Comprehensive Reports', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('GENERATING COMPREHENSIVE REPORTS');
    console.log('='.repeat(80));

    const passCount = testResults.filter(r => r.status === 'pass').length;
    const failCount = testResults.filter(r => r.status === 'fail').length;
    const warningCount = testResults.filter(r => r.status === 'warning').length;
    const totalTests = testResults.length;

    // Generate SYSTEMATIC_TEST_RESULTS.md
    const testResultsReport = `# SYSTEMATIC TEST RESULTS

**Date**: ${new Date().toISOString()}
**Total Tests**: ${totalTests}
**Passed**: ${passCount} (${Math.round(passCount/totalTests*100)}%)
**Failed**: ${failCount} (${Math.round(failCount/totalTests*100)}%)
**Warnings**: ${warningCount} (${Math.round(warningCount/totalTests*100)}%)

## Test Execution Summary

${testResults.map((result, index) => `
### Test ${index + 1}: ${result.page}

- **Status**: ${result.status === 'pass' ? '✅ PASS' : result.status === 'fail' ? '❌ FAIL' : '⚠️ WARNING'}
- **Load Time**: ${result.loadTime}ms
- **Console Errors**: ${result.consoleErrors.length}
- **Console Warnings**: ${result.consoleWarnings.length}
- **Network Errors**: ${result.networkErrors.length}
- **Interaction Errors**: ${result.interactionErrors.length}
- **Screenshot**: ${result.screenshot}
- **Issues Found**: ${result.issues.length}

${result.consoleErrors.length > 0 ? `#### Console Errors:\n${result.consoleErrors.slice(0, 5).map(e => `- ${e.substring(0, 200)}`).join('\n')}` : ''}
${result.networkErrors.length > 0 ? `#### Network Errors:\n${result.networkErrors.slice(0, 3).map(e => `- ${e}`).join('\n')}` : ''}
${result.interactionErrors.length > 0 ? `#### Interaction Errors:\n${result.interactionErrors.map(e => `- ${e}`).join('\n')}` : ''}
`).join('\n')}

## Performance Summary

**Average Load Time**: ${Math.round(testResults.reduce((sum, r) => sum + r.loadTime, 0) / testResults.length)}ms

**Fastest Pages**:
${testResults.sort((a, b) => a.loadTime - b.loadTime).slice(0, 5).map(r => `- ${r.page}: ${r.loadTime}ms`).join('\n')}

**Slowest Pages**:
${testResults.sort((a, b) => b.loadTime - a.loadTime).slice(0, 5).map(r => `- ${r.page}: ${r.loadTime}ms`).join('\n')}

## All Screenshots

${testResults.map(r => `- ${r.screenshot}`).join('\n')}
`;

    // Generate ALL_ISSUES_FOUND.md
    const allIssuesReport = `# ALL ISSUES FOUND

**Total Issues**: ${issues.length}
**Critical Errors**: ${issues.filter(i => i.type === 'error').length}
**Network Errors**: ${issues.filter(i => i.type === 'network').length}
**Interaction Issues**: ${issues.filter(i => i.type === 'interaction').length}
**Warnings**: ${issues.filter(i => i.type === 'warning').length}

## Issues by Page

${Object.entries(
  issues.reduce((acc, issue) => {
    if (!acc[issue.page]) acc[issue.page] = [];
    acc[issue.page].push(issue);
    return acc;
  }, {} as Record<string, Issue[]>)
).map(([page, pageIssues]) => `
### ${page} (${pageIssues.length} issues)

${pageIssues.map(issue => `
#### Issue #${issue.id} - ${issue.type.toUpperCase()}

- **Type**: ${issue.type}
- **Message**: ${issue.message}
- **Screenshot**: ${issue.screenshot || 'N/A'}
- **Timestamp**: ${issue.timestamp}
- **Fixed**: ${issue.fixed ? '✅ Yes' : '❌ No'}
`).join('\n')}
`).join('\n')}

## Issues by Type

### Critical Errors (${issues.filter(i => i.type === 'error').length})
${issues.filter(i => i.type === 'error').map(i => `- [#${i.id}] ${i.page}: ${i.message.substring(0, 150)}`).join('\n') || 'None'}

### Network Errors (${issues.filter(i => i.type === 'network').length})
${issues.filter(i => i.type === 'network').map(i => `- [#${i.id}] ${i.page}: ${i.message.substring(0, 150)}`).join('\n') || 'None'}

### Interaction Issues (${issues.filter(i => i.type === 'interaction').length})
${issues.filter(i => i.type === 'interaction').map(i => `- [#${i.id}] ${i.page}: ${i.message.substring(0, 150)}`).join('\n') || 'None'}

### Warnings (${issues.filter(i => i.type === 'warning').length})
${issues.filter(i => i.type === 'warning').map(i => `- [#${i.id}] ${i.page}: ${i.message.substring(0, 150)}`).join('\n') || 'None'}

## Priority Fixes Required

${issues.filter(i => i.type === 'error' || i.type === 'interaction').slice(0, 10).map(i => `
### [HIGH PRIORITY] Issue #${i.id}
- **Page**: ${i.page}
- **Type**: ${i.type}
- **Message**: ${i.message}
`).join('\n')}
`;

    // Generate PARALLEL_FIX_PLAN.md
    const fixPlanReport = `# PARALLEL FIX PLAN

This document outlines the parallel fix strategy for all ${issues.length} issues found.

## Fix Strategy Overview

Issues will be fixed in parallel using separate agents for each category:

### Agent Assignment

1. **Auth Agent**: Fix login/logout/session issues
   - Issues: ${issues.filter(i => i.page.toLowerCase().includes('login') || i.page.toLowerCase().includes('logout')).map(i => i.id).join(', ') || 'None'}

2. **Data Fetching Agent**: Fix API/database errors
   - Issues: ${issues.filter(i => i.message.includes('PGRST') || i.type === 'network').map(i => i.id).join(', ') || 'None'}

3. **UI Component Agent**: Fix interaction/rendering issues
   - Issues: ${issues.filter(i => i.type === 'interaction').map(i => i.id).join(', ') || 'None'}

4. **Console Error Agent**: Fix runtime errors
   - Issues: ${issues.filter(i => i.type === 'error' && !i.message.includes('PGRST')).map(i => i.id).join(', ') || 'None'}

## Detailed Fix Plan

${issues.map(issue => `
### Issue #${issue.id}: ${issue.page} - ${issue.type}

**Message**: ${issue.message}

**Proposed Fix**:
${issue.message.includes('PGRST106') ? `
- Review database schema for missing tables
- Check RLS policies
- Verify Supabase connection
` : issue.type === 'interaction' ? `
- Check component existence
- Verify event handlers
- Test UI rendering
` : issue.type === 'network' ? `
- Verify API endpoint
- Check network configuration
- Review CORS settings
` : `
- Review console error stack trace
- Fix runtime error
- Test error handling
`}

**Assigned Agent**: ${issue.message.includes('PGRST') ? 'Data Fetching Agent' : issue.type === 'interaction' ? 'UI Component Agent' : issue.page.toLowerCase().includes('login') ? 'Auth Agent' : 'Console Error Agent'}
`).join('\n')}
`;

    // Write all reports
    const reportsDir = '/Users/adityaaman/Desktop/All Development/School management Software/student-app';
    fs.writeFileSync(path.join(reportsDir, 'SYSTEMATIC_TEST_RESULTS.md'), testResultsReport);
    fs.writeFileSync(path.join(reportsDir, 'ALL_ISSUES_FOUND.md'), allIssuesReport);
    fs.writeFileSync(path.join(reportsDir, 'PARALLEL_FIX_PLAN.md'), fixPlanReport);

    console.log('\n✅ Reports generated:');
    console.log('   - SYSTEMATIC_TEST_RESULTS.md');
    console.log('   - ALL_ISSUES_FOUND.md');
    console.log('   - PARALLEL_FIX_PLAN.md');

    console.log(`\n📊 Final Summary:`);
    console.log(`   ✅ Passed: ${passCount}/${totalTests}`);
    console.log(`   ❌ Failed: ${failCount}/${totalTests}`);
    console.log(`   ⚠️  Warnings: ${warningCount}/${totalTests}`);
    console.log(`   🐛 Total Issues: ${issues.length}`);
  });
});
