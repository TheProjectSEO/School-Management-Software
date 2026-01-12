import { chromium } from 'playwright';

async function testAdminLoginDetailed() {
  console.log('🚀 Starting detailed admin login test...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      console.log(`🔴 Browser ${type}: ${text}`);
    }
  });

  // Listen to network requests
  page.on('requestfailed', request => {
    console.log(`❌ Request failed: ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    console.log('📍 Navigating to http://localhost:3002/login');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Fill in credentials
    console.log('🔐 Filling credentials...');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'Test123!');

    // Click submit and wait
    console.log('✅ Clicking submit...');
    await Promise.all([
      page.waitForResponse(response => response.url().includes('auth'), { timeout: 5000 }).catch(() => null),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(3000);

    // Check for various error indicators
    console.log('\n🔍 Checking for errors...\n');

    // Toast notifications (Sonner)
    const toasts = await page.locator('[data-sonner-toast]').allTextContents();
    if (toasts.length > 0) {
      console.log('📢 Toast notifications:');
      toasts.forEach(toast => console.log(`   "${toast}"`));
    }

    // Alert elements
    const alerts = await page.locator('[role="alert"]').allTextContents();
    if (alerts.length > 0) {
      console.log('⚠️  Alert messages:');
      alerts.forEach(alert => console.log(`   "${alert}"`));
    }

    // Error text elements
    const errors = await page.locator('.text-red-500, .text-destructive, .error-message').allTextContents();
    if (errors.length > 0) {
      console.log('❌ Error elements:');
      errors.forEach(error => console.log(`   "${error}"`));
    }

    // Check all visible text
    const allText = await page.locator('body').textContent();
    const lowerText = allText.toLowerCase();

    if (lowerText.includes('invalid') || lowerText.includes('incorrect') || lowerText.includes('failed')) {
      console.log('\n🔍 Found error keywords in page:');
      const words = ['invalid', 'incorrect', 'failed', 'error', 'wrong', 'denied'];
      for (const word of words) {
        if (lowerText.includes(word)) {
          // Find context around the word
          const index = lowerText.indexOf(word);
          const context = allText.substring(Math.max(0, index - 50), Math.min(allText.length, index + 50));
          console.log(`   "${context.trim()}"`);
        }
      }
    }

    // Check current URL
    const finalUrl = page.url();
    console.log(`\n📍 Final URL: ${finalUrl}`);

    // Check if dashboard loaded
    const isDashboard = finalUrl.includes('dashboard') || !finalUrl.includes('login');
    console.log(`\n${isDashboard ? '✅ LOGIN SUCCESSFUL!' : '❌ LOGIN FAILED - Still on login page'}`);

    // Take final screenshot
    await page.screenshot({ path: 'admin-login-detailed-result.png', fullPage: true });
    console.log('📸 Screenshot saved: admin-login-detailed-result.png');

    // Get network activity related to auth
    console.log('\n🌐 Checking network activity...');

  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    await page.screenshot({ path: 'admin-login-error-detailed.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed');
  }
}

testAdminLoginDetailed();
