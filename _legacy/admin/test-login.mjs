import { chromium } from 'playwright';

async function testAdminLogin() {
  console.log('🚀 Starting admin login test...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to admin app
    console.log('📍 Navigating to http://localhost:3002');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot of initial page
    await page.screenshot({ path: 'admin-login-initial.png', fullPage: true });
    console.log('✅ Screenshot saved: admin-login-initial.png');

    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}\n`);

    // Check if we're on login page
    if (currentUrl.includes('/login')) {
      console.log('✅ Successfully redirected to login page\n');

      // Get page title
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);

      // Check for login form elements
      const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = await page.locator('button[type="submit"]').first();

      const hasEmailField = await emailInput.count() > 0;
      const hasPasswordField = await passwordInput.count() > 0;
      const hasSubmitButton = await submitButton.count() > 0;

      console.log(`\n🔍 Form elements found:`);
      console.log(`   Email field: ${hasEmailField ? '✅' : '❌'}`);
      console.log(`   Password field: ${hasPasswordField ? '✅' : '❌'}`);
      console.log(`   Submit button: ${hasSubmitButton ? '✅' : '❌'}\n`);

      if (hasEmailField && hasPasswordField && hasSubmitButton) {
        // Try to login
        console.log('🔐 Attempting login with admin@test.com...');

        await emailInput.fill('admin@test.com');
        await passwordInput.fill('Test123!');

        console.log('✅ Filled credentials');
        await page.screenshot({ path: 'admin-login-filled.png', fullPage: true });
        console.log('✅ Screenshot saved: admin-login-filled.png');

        // Click submit and wait for navigation or error
        await submitButton.click();
        console.log('✅ Clicked submit button');

        // Wait for either navigation or error message
        await page.waitForTimeout(3000);

        const finalUrl = page.url();
        await page.screenshot({ path: 'admin-login-result.png', fullPage: true });
        console.log('✅ Screenshot saved: admin-login-result.png');

        console.log(`\n📍 Final URL: ${finalUrl}`);

        // Check for error messages
        const errorMessages = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').allTextContents();
        if (errorMessages.length > 0) {
          console.log(`\n❌ Error messages found:`);
          errorMessages.forEach(msg => console.log(`   "${msg}"`));
        }

        // Check if successfully logged in (redirected away from login)
        if (!finalUrl.includes('/login')) {
          console.log('\n✅ LOGIN SUCCESSFUL! Redirected to dashboard.');
        } else if (errorMessages.length > 0) {
          console.log('\n❌ LOGIN FAILED - Error messages displayed');
        } else {
          console.log('\n⚠️  LOGIN STATUS UNCLEAR - Still on login page but no error shown');

          // Get all text on page to see what happened
          const bodyText = await page.locator('body').textContent();
          console.log('\n📄 Page content preview:');
          console.log(bodyText.substring(0, 500) + '...');
        }
      } else {
        console.log('❌ Login form incomplete - cannot test login');
      }
    } else {
      console.log('❌ Not on login page. Current page:');
      const bodyText = await page.locator('body').textContent();
      console.log(bodyText.substring(0, 500));
    }

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    await page.screenshot({ path: 'admin-login-error.png', fullPage: true });
    console.log('✅ Error screenshot saved: admin-login-error.png');
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed');
  }
}

testAdminLogin();
