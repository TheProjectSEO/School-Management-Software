import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'student@msu.edu.ph',
  password: 'Test123!@#'
};

const PAGES_TO_TEST = [
  { path: '/', name: 'Dashboard' },
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
  { path: '/help', name: 'Help' }
];

interface TestResult {
  page: string;
  status: 'success' | 'error' | 'warning';
  consoleErrors: string[];
  consoleWarnings: string[];
  loadTime: number;
  screenshot?: string;
}

const results: TestResult[] = [];

test.describe('Final Complete Application Test', () => {

  test('Step 1: Login Test', async ({ page }) => {
    console.log('\n🔐 Testing Login...');

    // Track console messages
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Navigate to login page
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    const loadTime = Date.now() - startTime;

    // Take screenshot of login page
    await page.screenshot({
      path: 'test-results/success-00-login-page.png',
      fullPage: true
    });

    // Fill in login credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Take screenshot before clicking login
    await page.screenshot({
      path: 'test-results/success-00-login-filled.png',
      fullPage: true
    });

    // Click login button and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);

    // Take screenshot after login
    await page.screenshot({
      path: 'test-results/success-01-login-complete.png',
      fullPage: true
    });

    // Check if we're on dashboard
    await page.waitForTimeout(2000);
    const currentUrl = page.url();

    console.log(`✅ Login completed. Current URL: ${currentUrl}`);
    console.log(`⏱️  Load time: ${loadTime}ms`);
    console.log(`❌ Console errors: ${consoleErrors.length}`);
    console.log(`⚠️  Console warnings: ${consoleWarnings.length}`);

    results.push({
      page: 'Login',
      status: consoleErrors.length === 0 ? 'success' : (consoleErrors.some(e => e.includes('PGRST106')) ? 'error' : 'warning'),
      consoleErrors,
      consoleWarnings,
      loadTime,
      screenshot: 'success-01-login-complete.png'
    });

    expect(currentUrl).toContain(BASE_URL);
  });

  test('Step 2: Test All 13 Pages', async ({ page }) => {
    console.log('\n📄 Testing All Pages...');

    // First login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);

    // Wait for login to complete
    await page.waitForTimeout(2000);

    // Test each page
    for (const pageInfo of PAGES_TO_TEST) {
      console.log(`\n🔍 Testing: ${pageInfo.name} (${pageInfo.path})`);

      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      const networkErrors: string[] = [];

      // Set up console and network listeners
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        } else if (msg.type() === 'warning') {
          consoleWarnings.push(msg.text());
        }
      });

      page.on('requestfailed', request => {
        networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
      });

      try {
        // Navigate to page
        const startTime = Date.now();
        await page.goto(`${BASE_URL}${pageInfo.path}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        const loadTime = Date.now() - startTime;

        // Wait a bit for any async operations
        await page.waitForTimeout(2000);

        // Take screenshot
        const screenshotName = `success-02-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        await page.screenshot({
          path: `test-results/${screenshotName}`,
          fullPage: true
        });

        // Check for PGRST106 errors
        const hasPGRST106 = consoleErrors.some(e => e.includes('PGRST106'));
        const hasOtherErrors = consoleErrors.some(e => !e.includes('PGRST106'));

        let status: 'success' | 'error' | 'warning' = 'success';
        if (hasPGRST106) {
          status = 'error';
        } else if (hasOtherErrors || networkErrors.length > 0) {
          status = 'warning';
        }

        console.log(`  ✅ Status: ${status}`);
        console.log(`  ⏱️  Load time: ${loadTime}ms`);
        console.log(`  ❌ Console errors: ${consoleErrors.length}`);
        console.log(`  ⚠️  Console warnings: ${consoleWarnings.length}`);
        console.log(`  🌐 Network errors: ${networkErrors.length}`);

        if (consoleErrors.length > 0) {
          console.log(`  📋 First error: ${consoleErrors[0].substring(0, 100)}...`);
        }

        results.push({
          page: pageInfo.name,
          status,
          consoleErrors,
          consoleWarnings,
          loadTime,
          screenshot: screenshotName
        });

      } catch (error) {
        console.log(`  ❌ FAILED: ${error}`);

        results.push({
          page: pageInfo.name,
          status: 'error',
          consoleErrors: [...consoleErrors, `Navigation failed: ${error}`],
          consoleWarnings,
          loadTime: 0,
          screenshot: undefined
        });
      }

      // Remove listeners to avoid duplicates
      page.removeAllListeners('console');
      page.removeAllListeners('requestfailed');
    }
  });

  test('Step 3: Generate Report', async () => {
    console.log('\n📊 Generating Final Report...');

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const totalPages = results.length;

    const report = `# FINAL SUCCESS REPORT

## Test Summary
- **Date**: ${new Date().toISOString()}
- **Total Pages Tested**: ${totalPages}
- **✅ Pages Without Errors**: ${successCount} (${Math.round(successCount/totalPages*100)}%)
- **❌ Pages With Errors**: ${errorCount} (${Math.round(errorCount/totalPages*100)}%)
- **⚠️ Pages With Warnings**: ${warningCount} (${Math.round(warningCount/totalPages*100)}%)

## Overall Status
${errorCount === 0 ? '🎉 **ALL PAGES LOAD SUCCESSFULLY!** The PGRST106 errors have been resolved!' : `⚠️ ${errorCount} page(s) still have errors that need attention.`}

## Detailed Results

### ✅ Successful Pages (${successCount})
${results.filter(r => r.status === 'success').map(r =>
  `- **${r.page}** - Load time: ${r.loadTime}ms`
).join('\n') || 'None'}

### ❌ Pages With Errors (${errorCount})
${results.filter(r => r.status === 'error').map(r => {
  const hasPGRST106 = r.consoleErrors.some(e => e.includes('PGRST106'));
  return `
#### ${r.page}
- **Load Time**: ${r.loadTime}ms
- **Error Count**: ${r.consoleErrors.length}
- **Has PGRST106**: ${hasPGRST106 ? '❌ YES' : '✅ NO'}
- **Screenshot**: ${r.screenshot || 'N/A'}
- **Errors**:
${r.consoleErrors.slice(0, 5).map(e => `  - ${e.substring(0, 200)}`).join('\n')}
${r.consoleErrors.length > 5 ? `  - ... and ${r.consoleErrors.length - 5} more errors` : ''}
`;
}).join('\n') || 'None'}

### ⚠️ Pages With Warnings (${warningCount})
${results.filter(r => r.status === 'warning').map(r => `
#### ${r.page}
- **Load Time**: ${r.loadTime}ms
- **Warning Count**: ${r.consoleWarnings.length}
- **Screenshot**: ${r.screenshot || 'N/A'}
- **Top Warnings**:
${r.consoleWarnings.slice(0, 3).map(w => `  - ${w.substring(0, 150)}`).join('\n')}
`).join('\n') || 'None'}

## Performance Analysis

### Load Times
${results.sort((a, b) => a.loadTime - b.loadTime).map(r =>
  `- ${r.page}: ${r.loadTime}ms`
).join('\n')}

### Average Load Time
${Math.round(results.reduce((sum, r) => sum + r.loadTime, 0) / results.length)}ms

## Next Steps

${errorCount === 0 ? `
✅ **All tests passed!** The application is ready for:
1. User acceptance testing
2. Production deployment preparation
3. Documentation finalization
` : `
The following issues need to be addressed:

1. **PGRST106 Errors**: ${results.filter(r => r.consoleErrors.some(e => e.includes('PGRST106'))).length} page(s)
   - These indicate missing tables or permissions in the database
   - Review the schema and ensure all tables are created
   - Verify RLS policies are properly configured

2. **Other Errors**: ${results.filter(r => r.status === 'error' && !r.consoleErrors.some(e => e.includes('PGRST106'))).length} page(s)
   - Review console errors for each page
   - Fix any data fetching or component rendering issues

3. **Warnings**: ${warningCount} page(s)
   - These are non-blocking but should be addressed
   - May indicate deprecated APIs or minor issues
`}

## Screenshots

All screenshots are saved in the \`test-results/\` directory:
${results.filter(r => r.screenshot).map(r => `- ${r.screenshot}`).join('\n')}

## Test Configuration

- **Base URL**: ${BASE_URL}
- **Test User**: ${TEST_USER.email}
- **Browser**: Chromium (Playwright)
- **Test Timeout**: 30 seconds per page

---

*Generated automatically by Playwright test suite*
`;

    // Write report
    fs.writeFileSync('FINAL_SUCCESS_REPORT.md', report);

    console.log('\n✅ Report generated: FINAL_SUCCESS_REPORT.md');
    console.log(`\n📊 Summary: ${successCount}/${totalPages} pages successful`);
  });
});
