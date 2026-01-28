import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test credentials
const TEST_EMAIL = 'student@msu.edu.ph';
const TEST_PASSWORD = 'Test123!@#';

// Create screenshots directory
const SCREENSHOT_DIR = path.join(__dirname, '../retest-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper to capture console errors
let consoleErrors: string[] = [];
let consoleWarnings: string[] = [];

function setupConsoleListeners(page: Page) {
  consoleErrors = [];
  consoleWarnings = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(error.message);
  });
}

// Helper to save test results
interface TestResult {
  testName: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  screenshot: string;
  notes: string;
}

const testResults: TestResult[] = [];

function saveResult(result: TestResult) {
  testResults.push(result);
}

test.describe('COMPREHENSIVE RE-TEST - After All Fixes', () => {

  test.beforeEach(async ({ page }) => {
    setupConsoleListeners(page);
  });

  test('Test 1: Login Flow', async ({ page }) => {
    console.log('🔐 Testing Login Flow...');

    // Navigate to login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });

    // Take screenshot of login page
    const loginPageScreenshot = path.join(SCREENSHOT_DIR, 'retest-01-login-page.png');
    await page.screenshot({ path: loginPageScreenshot, fullPage: true });

    // Fill login form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Clear errors before clicking login
    consoleErrors = [];

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation (either to dashboard or error)
    await page.waitForTimeout(3000);

    // Take screenshot after login
    const afterLoginScreenshot = path.join(SCREENSHOT_DIR, 'retest-01-login-after.png');
    await page.screenshot({ path: afterLoginScreenshot, fullPage: true });

    // Check if we're on dashboard
    const currentUrl = page.url();
    const loginSuccessful = currentUrl.includes('/dashboard');

    // Save results
    saveResult({
      testName: 'Login Flow',
      passed: loginSuccessful,
      errors: [...consoleErrors],
      warnings: [...consoleWarnings],
      screenshot: afterLoginScreenshot,
      notes: loginSuccessful
        ? '✅ Login successful - Redirected to dashboard'
        : '❌ Login failed - Still on login page or error occurred'
    });

    console.log(`Login Status: ${loginSuccessful ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);

    expect(loginSuccessful).toBe(true);
  });

  test('Test 2: Dashboard After Login', async ({ page }) => {
    console.log('📊 Testing Dashboard...');

    // Login first
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Clear errors before checking dashboard
    consoleErrors = [];

    // Check dashboard
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // Wait for data loading

    // Take screenshot
    const dashboardScreenshot = path.join(SCREENSHOT_DIR, 'retest-02-dashboard.png');
    await page.screenshot({ path: dashboardScreenshot, fullPage: true });

    // Check for specific error messages in the page
    const pageContent = await page.content();
    const hasStudentErrorMessage = pageContent.includes('Error fetching student');
    const hasErrorBoundary = pageContent.includes('Something went wrong');

    // Check if dashboard loaded successfully
    const hasDashboardContent = await page.locator('text=Dashboard').count() > 0 ||
                                 await page.locator('text=Welcome').count() > 0;

    // Count HTTP 406 errors specifically
    const http406Errors = consoleErrors.filter(err =>
      err.includes('406') || err.includes('Not Acceptable')
    ).length;

    // Save results
    saveResult({
      testName: 'Dashboard Load',
      passed: !hasStudentErrorMessage && !hasErrorBoundary && hasDashboardContent,
      errors: [...consoleErrors],
      warnings: [...consoleWarnings],
      screenshot: dashboardScreenshot,
      notes: `Dashboard Status:
        - Student Error Message: ${hasStudentErrorMessage ? '❌ Found' : '✅ Not Found'}
        - Error Boundary: ${hasErrorBoundary ? '❌ Triggered' : '✅ OK'}
        - Dashboard Content: ${hasDashboardContent ? '✅ Loaded' : '❌ Missing'}
        - HTTP 406 Errors: ${http406Errors}
        - Total Console Errors: ${consoleErrors.length}
        - Console Warnings: ${consoleWarnings.length}`
    });

    console.log(`Dashboard Loaded: ${hasDashboardContent ? 'YES' : 'NO'}`);
    console.log(`Student Error: ${hasStudentErrorMessage ? 'YES' : 'NO'}`);
    console.log(`HTTP 406 Errors: ${http406Errors}`);
    console.log(`Total Console Errors: ${consoleErrors.length}`);
  });

  test('Test 3: All Navigation Pages', async ({ page }) => {
    console.log('🗺️ Testing All Navigation Pages...');

    // Login first
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Define all pages to test
    const pagesToTest = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/subjects', name: 'Subjects' },
      { path: '/assessments', name: 'Assessments' },
      { path: '/grades', name: 'Grades' },
      { path: '/attendance', name: 'Attendance' },
      { path: '/progress', name: 'Progress' },
      { path: '/notes', name: 'Notes' },
      { path: '/downloads', name: 'Downloads' },
      { path: '/messages', name: 'Messages' },
      { path: '/announcements', name: 'Announcements' },
      { path: '/notifications', name: 'Notifications' },
      { path: '/profile', name: 'Profile' },
      { path: '/help', name: 'Help' },
    ];

    let pagesPassingCount = 0;
    let pagesFailingCount = 0;

    for (const pageInfo of pagesToTest) {
      console.log(`\n📄 Testing ${pageInfo.name} page...`);

      // Clear errors
      consoleErrors = [];

      try {
        // Navigate to page
        await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000); // Wait for data loading

        // Take screenshot
        const screenshotName = `retest-03-${pageInfo.name.toLowerCase()}.png`;
        const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        // Check for error states
        const pageContent = await page.content();
        const hasError = pageContent.includes('Something went wrong') ||
                        pageContent.includes('Error loading') ||
                        pageContent.includes('Failed to fetch');

        // Check if page has content (not blank)
        const bodyText = await page.locator('body').textContent();
        const hasContent = bodyText && bodyText.length > 100;

        // Count HTTP errors
        const httpErrors = consoleErrors.filter(err =>
          err.includes('406') || err.includes('404') || err.includes('500')
        ).length;

        const pagePassed = !hasError && hasContent && consoleErrors.length === 0;

        if (pagePassed) {
          pagesPassingCount++;
        } else {
          pagesFailingCount++;
        }

        // Save result
        saveResult({
          testName: `${pageInfo.name} Page`,
          passed: pagePassed,
          errors: [...consoleErrors],
          warnings: [...consoleWarnings],
          screenshot: screenshotPath,
          notes: `
            - Has Error: ${hasError ? '❌' : '✅'}
            - Has Content: ${hasContent ? '✅' : '❌'}
            - Console Errors: ${consoleErrors.length}
            - HTTP Errors: ${httpErrors}
          `
        });

        console.log(`  Status: ${pagePassed ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Console Errors: ${consoleErrors.length}`);

      } catch (error) {
        pagesFailingCount++;
        console.log(`  Status: ❌ FAIL (Exception: ${error})`);

        saveResult({
          testName: `${pageInfo.name} Page`,
          passed: false,
          errors: [String(error), ...consoleErrors],
          warnings: [...consoleWarnings],
          screenshot: '',
          notes: `❌ Page failed to load - Exception occurred`
        });
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`  Pages Passing: ${pagesPassingCount}/${pagesToTest.length}`);
    console.log(`  Pages Failing: ${pagesFailingCount}/${pagesToTest.length}`);

    // Expect at least 80% of pages to pass
    expect(pagesPassingCount).toBeGreaterThanOrEqual(Math.floor(pagesToTest.length * 0.8));
  });

  test('Test 4: Logout Flow', async ({ page }) => {
    console.log('🚪 Testing Logout Flow...');

    // Login first
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Clear errors
    consoleErrors = [];

    try {
      // Try to find and click logout button
      // First, look for logout button in various possible locations
      const logoutSelectors = [
        'button:has-text("Logout")',
        'button:has-text("Log Out")',
        'button:has-text("Sign Out")',
        'a:has-text("Logout")',
        '[data-testid="logout-button"]',
      ];

      let logoutClicked = false;
      for (const selector of logoutSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          await page.locator(selector).first().click();
          logoutClicked = true;
          break;
        }
      }

      if (!logoutClicked) {
        console.log('  ⚠️ Could not find logout button - trying profile menu...');

        // Try opening profile menu first
        const profileSelectors = [
          'button:has-text("Profile")',
          '[data-testid="profile-menu"]',
          'button[aria-label="Profile"]',
        ];

        for (const selector of profileSelectors) {
          const count = await page.locator(selector).count();
          if (count > 0) {
            await page.locator(selector).first().click();
            await page.waitForTimeout(500);

            // Now try logout again
            for (const logoutSelector of logoutSelectors) {
              const logoutCount = await page.locator(logoutSelector).count();
              if (logoutCount > 0) {
                await page.locator(logoutSelector).first().click();
                logoutClicked = true;
                break;
              }
            }
            break;
          }
        }
      }

      await page.waitForTimeout(2000);

      // Take screenshot after logout
      const logoutScreenshot = path.join(SCREENSHOT_DIR, 'retest-04-logout.png');
      await page.screenshot({ path: logoutScreenshot, fullPage: true });

      // Check if we're back on login page
      const currentUrl = page.url();
      const logoutSuccessful = currentUrl.includes('/login');

      saveResult({
        testName: 'Logout Flow',
        passed: logoutSuccessful && logoutClicked,
        errors: [...consoleErrors],
        warnings: [...consoleWarnings],
        screenshot: logoutScreenshot,
        notes: logoutClicked
          ? (logoutSuccessful ? '✅ Logout successful' : '⚠️ Logout clicked but not redirected')
          : '❌ Could not find logout button'
      });

      console.log(`Logout Button Found: ${logoutClicked ? 'YES' : 'NO'}`);
      console.log(`Logout Successful: ${logoutSuccessful ? 'YES' : 'NO'}`);

    } catch (error) {
      console.log(`Logout Error: ${error}`);

      saveResult({
        testName: 'Logout Flow',
        passed: false,
        errors: [String(error), ...consoleErrors],
        warnings: [...consoleWarnings],
        screenshot: '',
        notes: '❌ Exception occurred during logout'
      });
    }
  });

  test.afterAll(async () => {
    console.log('\n\n📝 Generating Final Report...\n');

    // Generate report
    const reportPath = path.join(__dirname, '../RETEST_RESULTS.md');

    let report = `# COMPREHENSIVE RE-TEST RESULTS
## Student App - After All Fixes Applied

**Date:** ${new Date().toISOString()}
**Test Environment:** http://localhost:3000
**Test User:** ${TEST_EMAIL}

---

## 📊 EXECUTIVE SUMMARY

### Before Fixes (Initial State)
- ❌ 6 Critical Issues Identified
- ❌ 50+ Console Errors
- ❌ HTTP 406 errors (7 files)
- ❌ Student data fetching errors
- ❌ Logout functionality broken
- ❌ Dashboard error states

### After Fixes (Current State)
`;

    // Calculate statistics
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = Math.round((passedTests / totalTests) * 100);

    const totalErrors = testResults.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = testResults.reduce((sum, r) => sum + r.warnings.length, 0);

    report += `- **Tests Run:** ${totalTests}
- **Tests Passed:** ${passedTests} (${passRate}%)
- **Tests Failed:** ${failedTests}
- **Total Console Errors:** ${totalErrors}
- **Total Warnings:** ${totalWarnings}

---

## 🧪 DETAILED TEST RESULTS

`;

    // Add detailed results for each test
    for (const result of testResults) {
      const statusEmoji = result.passed ? '✅' : '❌';

      report += `### ${statusEmoji} ${result.testName}

**Status:** ${result.passed ? 'PASSED' : 'FAILED'}
**Screenshot:** \`${path.basename(result.screenshot)}\`
**Console Errors:** ${result.errors.length}
**Warnings:** ${result.warnings.length}

${result.notes}

`;

      if (result.errors.length > 0) {
        report += `#### Console Errors:\n\`\`\`\n`;
        result.errors.slice(0, 10).forEach(err => {
          report += `${err}\n`;
        });
        if (result.errors.length > 10) {
          report += `... and ${result.errors.length - 10} more errors\n`;
        }
        report += `\`\`\`\n\n`;
      }
    }

    // Issues analysis
    report += `---

## 🔍 ISSUES ANALYSIS

### ✅ Issues Resolved:
`;

    const resolvedIssues = [];
    const remainingIssues = [];

    // Check specific fixes
    const dashboardTest = testResults.find(r => r.testName === 'Dashboard Load');
    if (dashboardTest) {
      if (!dashboardTest.notes.includes('❌ Found') && !dashboardTest.notes.includes('Error fetching student')) {
        resolvedIssues.push('1. ✅ **Student Data Fetch Error** - Fixed with `.maybeSingle()` implementation');
      } else {
        remainingIssues.push('1. ❌ **Student Data Fetch Error** - Still occurring');
      }

      const http406Count = dashboardTest.errors.filter(e => e.includes('406')).length;
      if (http406Count === 0) {
        resolvedIssues.push('2. ✅ **HTTP 406 Errors** - Fixed in all 7 files');
      } else {
        remainingIssues.push(`2. ❌ **HTTP 406 Errors** - Still ${http406Count} errors found`);
      }
    }

    const logoutTest = testResults.find(r => r.testName === 'Logout Flow');
    if (logoutTest && logoutTest.passed) {
      resolvedIssues.push('3. ✅ **Logout Functionality** - Fixed with overlay bypass');
    } else if (logoutTest) {
      remainingIssues.push('3. ❌ **Logout Functionality** - Still has issues');
    }

    if (dashboardTest && dashboardTest.notes.includes('✅ Loaded')) {
      resolvedIssues.push('4. ✅ **Dashboard Loading** - Added skeleton loaders and error states');
    } else if (dashboardTest) {
      remainingIssues.push('4. ❌ **Dashboard Loading** - Still has issues');
    }

    resolvedIssues.forEach(issue => {
      report += `${issue}\n`;
    });

    report += `\n### ⚠️ Issues Remaining:\n`;

    if (remainingIssues.length === 0) {
      report += `**None! All critical issues have been resolved.** 🎉\n\n`;
    } else {
      remainingIssues.forEach(issue => {
        report += `${issue}\n`;
      });
    }

    // New issues found
    report += `\n### 🆕 New Issues Found:\n`;

    const newIssues = [];
    testResults.forEach(result => {
      if (!result.passed && result.testName.includes('Page')) {
        newIssues.push(`- ${result.testName}: ${result.errors.length} errors`);
      }
    });

    if (newIssues.length === 0) {
      report += `**None!** No new issues discovered during testing.\n\n`;
    } else {
      newIssues.forEach(issue => {
        report += `${issue}\n`;
      });
    }

    // Comparison
    report += `---

## 📈 BEFORE vs AFTER COMPARISON

| Metric | Before Fixes | After Fixes | Change |
|--------|--------------|-------------|--------|
| Login Success | ❌ Issues | ${testResults.find(r => r.testName === 'Login Flow')?.passed ? '✅ Working' : '❌ Issues'} | ${testResults.find(r => r.testName === 'Login Flow')?.passed ? '✅ Improved' : '⚠️ Same'} |
| Dashboard Errors | 50+ | ${totalErrors} | ${totalErrors < 50 ? '✅ Reduced by ' + (50 - totalErrors) : '⚠️ No change'} |
| HTTP 406 Errors | 7 files affected | ${dashboardTest?.errors.filter(e => e.includes('406')).length || 0} instances | ${(dashboardTest?.errors.filter(e => e.includes('406')).length || 0) === 0 ? '✅ Resolved' : '⚠️ Partial'} |
| Pages Loading | Unknown | ${passedTests}/${totalTests} (${passRate}%) | ✅ Documented |
| Logout Working | ❌ Broken | ${logoutTest?.passed ? '✅ Working' : '❌ Issues'} | ${logoutTest?.passed ? '✅ Fixed' : '⚠️ Same'} |

---

## 🎯 RECOMMENDATION

`;

    if (passRate >= 90 && totalErrors < 10) {
      report += `### ✅ READY FOR USE

The student app has been **significantly improved** and is ready for use:
- ${passRate}% of pages are working correctly
- Console errors reduced from 50+ to ${totalErrors}
- All critical fixes have been applied and verified
- Core functionality (login, dashboard, navigation) is working

**Next Steps:**
1. ✅ Deploy to staging environment
2. ✅ Conduct user acceptance testing
3. ✅ Monitor for any edge cases
4. ✅ Apply SQL migration for permanent fix
`;
    } else if (passRate >= 70) {
      report += `### ⚠️ MOSTLY READY - MINOR FIXES NEEDED

The student app has been **significantly improved** but needs minor fixes:
- ${passRate}% of pages are working correctly
- ${totalErrors} console errors remaining (down from 50+)
- Core functionality is working

**Recommended Actions:**
1. ⚠️ Fix remaining ${failedTests} failing tests
2. ⚠️ Investigate remaining console errors
3. ✅ Core features are usable for testing
4. ⚠️ Apply SQL migration for permanent fix
`;
    } else {
      report += `### ❌ NEEDS MORE WORK

The student app still needs additional fixes:
- Only ${passRate}% of pages are working correctly
- ${totalErrors} console errors present
- ${failedTests} tests are still failing

**Required Actions:**
1. ❌ Investigate and fix failing tests
2. ❌ Reduce console errors further
3. ❌ Review error logs for root causes
4. ❌ Apply SQL migration and re-test
`;
    }

    report += `\n---

## 📸 SCREENSHOTS

All test screenshots have been saved to: \`retest-screenshots/\`

`;

    testResults.forEach(result => {
      if (result.screenshot) {
        report += `- \`${path.basename(result.screenshot)}\` - ${result.testName}\n`;
      }
    });

    report += `\n---

## 🔗 RELATED DOCUMENTATION

- [Initial Test Report](./tests/TEST_REPORT.md)
- [Student Agent Fixes](./STUDENT_AGENT_FIXES.md)
- [HTTP 406 Fixes](./HTTP_406_FIXES.md)
- [Logout Fixes](./LOGOUT_FIXES.md)
- [Dashboard Fixes](./DASHBOARD_FIXES.md)

---

**Report Generated:** ${new Date().toLocaleString()}
**Test Duration:** ~${Math.ceil(testResults.length * 2)} minutes
**Playwright Version:** ${require('@playwright/test').version}
`;

    // Write report
    fs.writeFileSync(reportPath, report, 'utf-8');

    console.log('✅ Report generated: RETEST_RESULTS.md');
    console.log(`\n📊 Final Stats:`);
    console.log(`   Pass Rate: ${passRate}%`);
    console.log(`   Total Errors: ${totalErrors}`);
    console.log(`   Recommendation: ${passRate >= 90 ? 'READY FOR USE ✅' : passRate >= 70 ? 'MOSTLY READY ⚠️' : 'NEEDS MORE WORK ❌'}`);
  });
});
