import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'student@msu.edu.ph',
  password: 'Test123!@#'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const outputDir = './visual-test-results';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      args: msg.args().length
    });
  });

  try {
    console.log('='.repeat(60));
    console.log('STUDENT APP LOGIN VISUAL TEST');
    console.log('='.repeat(60));

    // Step 1: Navigate to login
    console.log('\nStep 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: `${outputDir}/01-login-page.png` });
    console.log('✓ Screenshot: 01-login-page.png');
    const loginTitle = await page.title();
    console.log(`✓ Page title: "${loginTitle}"`);

    // Step 2: Fill credentials
    console.log('\nStep 2: Filling in credentials...');
    await page.fill('input[type="email"]', TEST_USER.email);
    console.log(`✓ Filled email: ${TEST_USER.email}`);

    await page.fill('input[type="password"]', TEST_USER.password);
    console.log(`✓ Filled password: (redacted)`);

    await page.screenshot({ path: `${outputDir}/02-form-filled.png` });
    console.log('✓ Screenshot: 02-form-filled.png');

    // Step 3: Submit form
    console.log('\nStep 3: Clicking login button...');
    await page.click('button[type="submit"]');

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: `${outputDir}/03-after-login.png` });
    console.log('✓ Screenshot: 03-after-login.png');

    // Step 4: Check current page
    const currentUrl = page.url();
    const currentTitle = await page.title();

    console.log('\n' + '='.repeat(60));
    console.log('LOGIN RESULT');
    console.log('='.repeat(60));
    console.log(`Current URL: ${currentUrl}`);
    console.log(`Page Title: "${currentTitle}"`);

    // Step 5: Check for errors in console
    const errorMessages = consoleMessages.filter(m => m.type === 'error');
    const warningMessages = consoleMessages.filter(m => m.type === 'warning');

    console.log(`Console Messages: ${consoleMessages.length} total`);
    console.log(`  - Errors: ${errorMessages.length}`);
    console.log(`  - Warnings: ${warningMessages.length}`);

    if (errorMessages.length > 0) {
      console.log('\nError Messages:');
      errorMessages.slice(0, 5).forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.text.substring(0, 100)}`);
      });
    }

    // Step 6: Navigate to dashboard if login successful
    if (currentUrl.includes('login')) {
      console.log('\n⚠ Still on login page - login may have failed');
    } else {
      console.log('\n✓ Login successful - redirected away from login page');

      // Navigate to main dashboard
      console.log('\nStep 4: Loading dashboard...');
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: `${outputDir}/04-dashboard.png` });
      console.log('✓ Screenshot: 04-dashboard.png');

      const dashboardTitle = await page.title();
      console.log(`✓ Dashboard title: "${dashboardTitle}"`);

      // Check page content
      const mainHeading = await page.$('h1, h2, [role="heading"]');
      if (mainHeading) {
        const text = await mainHeading.textContent();
        console.log(`✓ Main heading: "${text}"`);
      }
    }

    // Step 7: Get page HTML snippet
    console.log('\nStep 5: Page structure snapshot...');
    const htmlContent = await page.content();
    fs.writeFileSync(`${outputDir}/page-source.html`, htmlContent);
    console.log('✓ Full page HTML saved: page-source.html');

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nAll results saved to: ${path.resolve(outputDir)}`);
    console.log('\nFiles created:');
    console.log('  1. 01-login-page.png - Initial login page');
    console.log('  2. 02-form-filled.png - Form with credentials');
    console.log('  3. 03-after-login.png - Immediately after login');
    console.log('  4. 04-dashboard.png - Dashboard page');
    console.log('  5. page-source.html - Full HTML content');

  } catch (error) {
    console.error('\nERROR:', error.message);
    await page.screenshot({ path: `${outputDir}/error-screenshot.png` });
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
})();
