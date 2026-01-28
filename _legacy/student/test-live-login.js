const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting live login test...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Collect errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  try {
    // STEP 1: Navigate to login page
    console.log('📍 STEP 1: Navigating to http://localhost:3000/login');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Screenshot 1
    await page.screenshot({ path: 'live-login-page.png', fullPage: true });
    console.log('✅ Screenshot saved: live-login-page.png\n');

    // STEP 2: Get page state
    const url1 = page.url();
    const title1 = await page.title();
    console.log(`📄 Current URL: ${url1}`);
    console.log(`📄 Page Title: ${title1}\n`);

    // STEP 3: Find and fill email field
    console.log('📝 STEP 2: Filling email field with student@msu.edu.ph');
    const emailSelector = 'input[type="email"], input[name="email"], input#email';
    await page.waitForSelector(emailSelector, { timeout: 5000 });
    await page.fill(emailSelector, 'student@msu.edu.ph');
    console.log('✅ Email filled\n');

    // STEP 4: Find and fill password field
    console.log('🔒 STEP 3: Filling password field');
    const passwordSelector = 'input[type="password"], input[name="password"], input#password';
    await page.waitForSelector(passwordSelector, { timeout: 5000 });
    await page.fill(passwordSelector, 'Test123!@#');
    console.log('✅ Password filled\n');

    // Screenshot 2
    await page.screenshot({ path: 'live-form-filled.png', fullPage: true });
    console.log('✅ Screenshot saved: live-form-filled.png\n');

    // STEP 5: Click login button
    console.log('🖱️  STEP 4: Clicking Log In button');
    const loginButtonSelector = 'button[type="submit"], button:has-text("Log In"), button:has-text("Login")';
    await page.click(loginButtonSelector);
    console.log('✅ Login button clicked\n');

    // STEP 6: Wait and observe
    console.log('⏳ STEP 5: Waiting 3 seconds to observe behavior...');
    await page.waitForTimeout(3000);

    // Screenshot 3
    await page.screenshot({ path: 'live-after-login.png', fullPage: true });
    console.log('✅ Screenshot saved: live-after-login.png\n');

    // STEP 7: Get final state
    const url2 = page.url();
    const title2 = await page.title();
    console.log(`📄 Final URL: ${url2}`);
    console.log(`📄 Final Title: ${title2}\n`);

    // Check for error messages on page
    const errorElements = await page.$$('text=/error|invalid|wrong|failed/i');
    if (errorElements.length > 0) {
      console.log(`⚠️  Found ${errorElements.length} error message(s) on page`);
      for (const el of errorElements) {
        const text = await el.textContent();
        console.log(`   - ${text}`);
      }
    }

    // Check if redirected to dashboard
    if (url2.includes('/dashboard') || url2.includes('/student')) {
      console.log('✅ LOGIN SUCCESSFUL - Redirected to dashboard!\n');
    } else if (url2 === url1) {
      console.log('❌ LOGIN FAILED - Still on login page\n');
    } else {
      console.log(`🤔 Redirected to: ${url2}\n`);
    }

    // Print console messages summary
    console.log('\n📋 CONSOLE MESSAGES SUMMARY:');
    console.log('━'.repeat(60));
    if (consoleMessages.length === 0) {
      console.log('No console messages captured');
    } else {
      consoleMessages.forEach((msg, i) => {
        console.log(`${i + 1}. [${msg.type.toUpperCase()}] ${msg.text}`);
      });
    }

    // Print errors summary
    if (errors.length > 0) {
      console.log('\n🚨 ERRORS DETECTED:');
      console.log('━'.repeat(60));
      errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }

    console.log('\n━'.repeat(60));
    console.log('🏁 Test completed! Check the screenshots:\n');
    console.log('   1. live-login-page.png - Initial login page');
    console.log('   2. live-form-filled.png - Form with credentials filled');
    console.log('   3. live-after-login.png - State after clicking login\n');

    // Keep browser open for 5 seconds to see the result
    console.log('Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    await page.screenshot({ path: 'live-error.png', fullPage: true });
    console.log('Error screenshot saved: live-error.png');
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
