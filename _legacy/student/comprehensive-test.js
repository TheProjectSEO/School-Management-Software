const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  credentials: {
    email: 'student@msu.edu.ph',
    password: 'Test123!@#'
  },
  pages: [
    { name: 'Dashboard', url: '/', screenshot: 'final-01-dashboard.png' },
    { name: 'Subjects', url: '/subjects', screenshot: 'final-02-subjects.png' },
    { name: 'Assessments', url: '/assessments', screenshot: 'final-03-assessments.png' },
    { name: 'Grades', url: '/grades', screenshot: 'final-04-grades.png' },
    { name: 'Attendance', url: '/attendance', screenshot: 'final-05-attendance.png' },
    { name: 'Progress', url: '/progress', screenshot: 'final-06-progress.png' },
    { name: 'Notes', url: '/notes', screenshot: 'final-07-notes.png' },
    { name: 'Downloads', url: '/downloads', screenshot: 'final-08-downloads.png' },
    { name: 'Messages', url: '/messages', screenshot: 'final-09-messages.png' },
    { name: 'Announcements', url: '/announcements', screenshot: 'final-10-announcements.png' },
    { name: 'Notifications', url: '/notifications', screenshot: 'final-11-notifications.png' },
    { name: 'Profile', url: '/profile', screenshot: 'final-12-profile.png' },
    { name: 'Help', url: '/help', screenshot: 'final-13-help.png' }
  ]
};

async function runComprehensiveTest() {
  const results = {
    totalPages: TEST_CONFIG.pages.length,
    pagesTested: 0,
    pagesPassing: 0,
    errors: [],
    warnings: [],
    screenshots: [],
    timestamp: new Date().toISOString()
  };

  let browser;
  let context;
  let page;

  try {
    console.log('🚀 Starting Comprehensive Playwright Test...\n');

    // Launch browser
    browser = await chromium.launch({
      headless: false,
      slowMo: 100
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: '.playwright-mcp/videos',
        size: { width: 1920, height: 1080 }
      }
    });

    page = await context.newPage();

    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      consoleMessages.push({ type, text, timestamp: Date.now() });

      if (type === 'error') {
        console.log(`❌ Console Error: ${text}`);
      } else if (type === 'warning') {
        console.log(`⚠️  Console Warning: ${text}`);
      }
    });

    // Collect page errors
    page.on('pageerror', error => {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      };
      results.errors.push({
        page: 'Unknown',
        type: 'PageError',
        ...errorInfo
      });
      console.log(`💥 Page Error: ${error.message}`);
    });

    // Step 1: Login
    console.log('📝 Step 1: Testing Login...');
    await page.goto(`${TEST_CONFIG.baseUrl}/login`);
    await page.waitForLoadState('networkidle');

    // Take login page screenshot
    await page.screenshot({
      path: '.playwright-mcp/final-login-page.png',
      fullPage: true
    });
    results.screenshots.push('final-login-page.png');

    // Fill login form
    await page.fill('input[type="email"]', TEST_CONFIG.credentials.email);
    await page.fill('input[type="password"]', TEST_CONFIG.credentials.password);

    // Click login and wait for navigation
    const [response] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/auth/') || response.url().includes('/api/'), { timeout: 10000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if login was successful
    const currentUrl = page.url();
    const loginSuccessful = !currentUrl.includes('/login');

    if (loginSuccessful) {
      console.log('✅ Login successful! Redirected to:', currentUrl);
      await page.screenshot({
        path: '.playwright-mcp/final-login-success.png',
        fullPage: true
      });
      results.screenshots.push('final-login-success.png');
    } else {
      console.log('❌ Login failed - still on login page');
      results.errors.push({
        page: 'Login',
        type: 'AuthenticationError',
        message: 'Login failed - credentials may be invalid or auth system not working',
        timestamp: Date.now()
      });
    }

    // Step 2: Test all pages
    console.log('\n📋 Step 2: Testing All Pages...\n');

    for (const pageInfo of TEST_CONFIG.pages) {
      console.log(`\n🔍 Testing: ${pageInfo.name} (${pageInfo.url})`);

      const pageConsoleMessages = [];
      const pageStartTime = Date.now();

      try {
        // Navigate to page
        await page.goto(`${TEST_CONFIG.baseUrl}${pageInfo.url}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await page.waitForTimeout(2000);

        // Get console messages for this page
        const pageConsoleLogs = consoleMessages.filter(
          msg => msg.timestamp >= pageStartTime
        );

        // Count errors and warnings
        const pageErrors = pageConsoleLogs.filter(msg => msg.type === 'error');
        const pageWarnings = pageConsoleLogs.filter(msg => msg.type === 'warning');

        // Take screenshot
        const screenshotPath = `.playwright-mcp/${pageInfo.screenshot}`;
        await page.screenshot({
          path: screenshotPath,
          fullPage: true
        });
        results.screenshots.push(pageInfo.screenshot);

        // Record results
        results.pagesTested++;

        if (pageErrors.length === 0) {
          results.pagesPassing++;
          console.log(`✅ ${pageInfo.name}: PASS (${pageWarnings.length} warnings)`);
        } else {
          console.log(`❌ ${pageInfo.name}: FAIL (${pageErrors.length} errors, ${pageWarnings.length} warnings)`);
        }

        // Store errors for this page
        pageErrors.forEach(error => {
          results.errors.push({
            page: pageInfo.name,
            url: pageInfo.url,
            type: 'ConsoleError',
            message: error.text,
            timestamp: error.timestamp
          });
        });

        // Store warnings
        pageWarnings.forEach(warning => {
          results.warnings.push({
            page: pageInfo.name,
            url: pageInfo.url,
            type: 'ConsoleWarning',
            message: warning.text,
            timestamp: warning.timestamp
          });
        });

      } catch (error) {
        console.log(`❌ ${pageInfo.name}: ERROR - ${error.message}`);
        results.errors.push({
          page: pageInfo.name,
          url: pageInfo.url,
          type: 'NavigationError',
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        });
        results.pagesTested++;
      }
    }

    // Generate results summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Pages: ${results.totalPages}`);
    console.log(`Pages Tested: ${results.pagesTested}`);
    console.log(`Pages Passing: ${results.pagesPassing}`);
    console.log(`Pages Failing: ${results.pagesTested - results.pagesPassing}`);
    console.log(`Total Errors: ${results.errors.length}`);
    console.log(`Total Warnings: ${results.warnings.length}`);
    console.log(`Screenshots Captured: ${results.screenshots.length}`);
    console.log('='.repeat(80));

    // Save results to JSON
    const resultsPath = '.playwright-mcp/test-results.json';
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);

    return results;

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    results.errors.push({
      page: 'Test Runner',
      type: 'FatalError',
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
    return results;
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Run the test
runComprehensiveTest()
  .then(results => {
    console.log('\n✅ Test completed successfully!');
    process.exit(results.errors.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
