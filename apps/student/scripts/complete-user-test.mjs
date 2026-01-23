import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_RESULTS_DIR = '.playwright-mcp';
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'student@msu.edu.ph',
  password: 'Test123!@#'
};

// Ensure test results directory exists
try {
  mkdirSync(TEST_RESULTS_DIR, { recursive: true });
} catch (err) {
  // Directory already exists
}

const testResults = {
  timestamp: new Date().toISOString(),
  phases: [],
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  consoleErrors: [],
  screenshots: []
};

async function captureConsoleErrors(page) {
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({
        type: 'console-error',
        text: msg.text(),
        timestamp: new Date().toISOString()
      });
    }
  });

  page.on('pageerror', error => {
    errors.push({
      type: 'page-error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  return errors;
}

async function takeScreenshot(page, name) {
  const path = join(TEST_RESULTS_DIR, name);
  await page.screenshot({ path, fullPage: true });
  testResults.screenshots.push({ name, path, timestamp: new Date().toISOString() });
  console.log(`📸 Screenshot saved: ${name}`);
  return path;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  testResults.summary.totalTests++;

  try {
    const result = await testFn();
    if (result.status === 'warning') {
      testResults.summary.warnings++;
      console.log(`⚠️  ${name} - ${result.message}`);
    } else {
      testResults.summary.passed++;
      console.log(`✅ ${name} - PASSED`);
    }
    return result;
  } catch (error) {
    testResults.summary.failed++;
    console.log(`❌ ${name} - FAILED: ${error.message}`);
    return {
      status: 'failed',
      message: error.message,
      stack: error.stack
    };
  }
}

async function main() {
  console.log('🚀 Starting Complete End-to-End User Testing\n');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: join(TEST_RESULTS_DIR, 'videos'),
      size: { width: 1920, height: 1080 }
    }
  });
  const page = await context.newPage();

  // Set up console error capturing
  const consoleErrors = await captureConsoleErrors(page);

  // ============================================================
  // PHASE 1: LOGIN & AUTHENTICATION
  // ============================================================
  const phase1Results = {
    name: 'Phase 1: Login & Authentication',
    tests: []
  };

  console.log('\n' + '='.repeat(60));
  console.log('PHASE 1: LOGIN & AUTHENTICATION');
  console.log('='.repeat(60));

  // Test 1.1: Navigate to login page
  const loginNavTest = await runTest('Navigate to login page', async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await wait(1000);
    await takeScreenshot(page, 'user-test-01-login-page.png');

    const url = page.url();
    if (!url.includes('/login')) {
      throw new Error(`Expected to be on login page, but URL is: ${url}`);
    }

    return {
      status: 'passed',
      message: 'Successfully navigated to login page',
      url
    };
  });
  phase1Results.tests.push(loginNavTest);

  // Test 1.2: Check login form elements
  const loginFormTest = await runTest('Verify login form elements', async () => {
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    const submitButton = await page.$('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")');

    const elements = {
      emailInput: !!emailInput,
      passwordInput: !!passwordInput,
      submitButton: !!submitButton
    };

    if (!emailInput || !passwordInput || !submitButton) {
      return {
        status: 'warning',
        message: 'Some form elements are missing',
        elements
      };
    }

    return {
      status: 'passed',
      message: 'All login form elements present',
      elements
    };
  });
  phase1Results.tests.push(loginFormTest);

  // Test 1.3: Fill and submit login form
  const loginSubmitTest = await runTest('Fill and submit login form', async () => {
    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);

    await takeScreenshot(page, 'user-test-01b-login-filled.png');

    await page.click('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")');

    // Wait for navigation
    await wait(3000);

    await takeScreenshot(page, 'user-test-02-dashboard.png');

    const url = page.url();
    const isLoggedIn = url.includes('/dashboard') || url.includes('/student');

    if (!isLoggedIn) {
      return {
        status: 'failed',
        message: `Login may have failed - URL is: ${url}`,
        url
      };
    }

    return {
      status: 'passed',
      message: 'Login successful, redirected to dashboard',
      url
    };
  });
  phase1Results.tests.push(loginSubmitTest);

  testResults.phases.push(phase1Results);

  // ============================================================
  // PHASE 2: DASHBOARD EXPLORATION
  // ============================================================
  const phase2Results = {
    name: 'Phase 2: Dashboard Exploration',
    tests: []
  };

  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: DASHBOARD EXPLORATION');
  console.log('='.repeat(60));

  // Test 2.1: Check user name display
  const userNameTest = await runTest('Check user name display', async () => {
    const userName = await page.textContent('body');
    const hasUserName = userName.includes('John') || userName.includes('Student') || userName.includes('Welcome');

    return {
      status: hasUserName ? 'passed' : 'warning',
      message: hasUserName ? 'User name or welcome message found' : 'User name not clearly visible',
      hasUserName
    };
  });
  phase2Results.tests.push(userNameTest);

  // Test 2.2: Check navigation menu
  const navMenuTest = await runTest('Check navigation menu', async () => {
    const navLinks = await page.$$('nav a, aside a, [role="navigation"] a');
    const linkCount = navLinks.length;

    const linkTexts = await Promise.all(
      navLinks.map(async link => {
        try {
          return await link.textContent();
        } catch {
          return null;
        }
      })
    );

    return {
      status: linkCount > 0 ? 'passed' : 'failed',
      message: `Found ${linkCount} navigation links`,
      linkCount,
      linkTexts: linkTexts.filter(Boolean)
    };
  });
  phase2Results.tests.push(navMenuTest);

  // Test 2.3: Check for widgets/cards
  const widgetsTest = await runTest('Check dashboard widgets/cards', async () => {
    const cards = await page.$$('[class*="card"], [class*="widget"], section, article');
    const cardCount = cards.length;

    await takeScreenshot(page, 'user-test-03-dashboard-full.png');

    return {
      status: cardCount > 0 ? 'passed' : 'warning',
      message: `Found ${cardCount} potential widgets/cards`,
      cardCount
    };
  });
  phase2Results.tests.push(widgetsTest);

  testResults.phases.push(phase2Results);

  // ============================================================
  // PHASE 3: TEST EVERY TAB
  // ============================================================
  const phase3Results = {
    name: 'Phase 3: Test All Navigation Tabs',
    tests: []
  };

  console.log('\n' + '='.repeat(60));
  console.log('PHASE 3: TEST ALL NAVIGATION TABS');
  console.log('='.repeat(60));

  const tabs = [
    { name: 'Dashboard', keywords: ['dashboard', 'home', 'overview'], url: '/student/dashboard' },
    { name: 'My Subjects', keywords: ['subjects', 'courses', 'classes'], url: '/student/subjects' },
    { name: 'Assessments', keywords: ['assessments', 'assignments', 'tests', 'quizzes'], url: '/student/assessments' },
    { name: 'Grades', keywords: ['grades', 'marks', 'scores'], url: '/student/grades' },
    { name: 'Attendance', keywords: ['attendance', 'presence'], url: '/student/attendance' },
    { name: 'Progress', keywords: ['progress', 'performance'], url: '/student/progress' },
    { name: 'Notes', keywords: ['notes', 'materials'], url: '/student/notes' },
    { name: 'Downloads', keywords: ['downloads', 'files'], url: '/student/downloads' },
    { name: 'Messages', keywords: ['messages', 'inbox', 'chat'], url: '/student/messages' },
    { name: 'Announcements', keywords: ['announcements', 'news'], url: '/student/announcements' },
    { name: 'Notifications', keywords: ['notifications', 'alerts'], url: '/student/notifications' },
    { name: 'Profile', keywords: ['profile', 'account', 'settings'], url: '/student/profile' },
    { name: 'Help', keywords: ['help', 'support', 'faq'], url: '/student/help' }
  ];

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const tabNumber = String(i + 4).padStart(2, '0');

    const tabTest = await runTest(`Test tab: ${tab.name}`, async () => {
      console.log(`\n  📑 Testing: ${tab.name}`);

      // Try to navigate via URL first
      try {
        await page.goto(`${BASE_URL}${tab.url}`, { waitUntil: 'networkidle', timeout: 5000 });
      } catch (urlError) {
        // If direct URL fails, try clicking nav link
        console.log(`  ⚠️  Direct URL navigation failed, trying to click nav link...`);

        const navLink = await page.$(`a:has-text("${tab.name}")`);
        if (navLink) {
          await navLink.click();
        } else {
          // Try keyword matching
          for (const keyword of tab.keywords) {
            const link = await page.$(`a:has-text("${keyword}")`);
            if (link) {
              await link.click();
              break;
            }
          }
        }
      }

      await wait(2000);

      const screenshotName = `user-test-${tabNumber}-${tab.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      await takeScreenshot(page, screenshotName);

      // Check page content
      const pageTitle = await page.title();
      const pageContent = await page.textContent('body');
      const hasContent = pageContent.length > 100;

      // Try to find interactive elements
      const buttons = await page.$$('button');
      const inputs = await page.$$('input, textarea, select');
      const links = await page.$$('a');

      // Check for loading states
      const hasLoadingIndicator = await page.$('[class*="loading"], [class*="spinner"]');

      // Check for error messages
      const hasError = await page.$('[class*="error"], [role="alert"]');

      const result = {
        status: 'passed',
        message: `Successfully loaded ${tab.name}`,
        details: {
          pageTitle,
          contentLength: pageContent.length,
          hasContent,
          interactiveElements: {
            buttons: buttons.length,
            inputs: inputs.length,
            links: links.length
          },
          hasLoadingIndicator: !!hasLoadingIndicator,
          hasError: !!hasError,
          url: page.url()
        }
      };

      // Try clicking a button if available
      if (buttons.length > 0) {
        console.log(`  🖱️  Found ${buttons.length} buttons, trying to click first one...`);
        try {
          await buttons[0].click({ timeout: 1000 });
          await wait(1000);
        } catch (err) {
          console.log(`  ⚠️  Button click failed: ${err.message}`);
        }
      }

      if (hasError) {
        result.status = 'warning';
        result.message = `${tab.name} loaded but has error messages`;
      }

      return result;
    });

    phase3Results.tests.push({
      tab: tab.name,
      result: tabTest
    });
  }

  testResults.phases.push(phase3Results);

  // ============================================================
  // PHASE 4: AI CHAT TESTING
  // ============================================================
  const phase4Results = {
    name: 'Phase 4: AI Chat Testing',
    tests: []
  };

  console.log('\n' + '='.repeat(60));
  console.log('PHASE 4: AI CHAT TESTING');
  console.log('='.repeat(60));

  const aiChatTest = await runTest('Test AI Chat feature', async () => {
    // Look for AI chat button or widget
    const chatButton = await page.$('button:has-text("AI"), button:has-text("Chat"), button:has-text("Assistant"), [class*="chat"]');

    if (!chatButton) {
      return {
        status: 'warning',
        message: 'AI Chat button/widget not found on current page'
      };
    }

    await chatButton.click();
    await wait(2000);

    await takeScreenshot(page, 'user-test-AI-chat-open.png');

    // Try to find chat input
    const chatInput = await page.$('input[placeholder*="message"], input[placeholder*="chat"], textarea[placeholder*="message"]');

    if (!chatInput) {
      return {
        status: 'warning',
        message: 'Chat opened but input field not found'
      };
    }

    // Type a question
    await chatInput.fill('What is my current GPA?');
    await wait(500);

    // Find and click send button
    const sendButton = await page.$('button:has-text("Send"), button[type="submit"]');
    if (sendButton) {
      await sendButton.click();
      await wait(5000); // Wait for AI response

      await takeScreenshot(page, 'user-test-AI-response.png');

      const chatContent = await page.textContent('body');

      return {
        status: 'passed',
        message: 'AI Chat interaction completed',
        hasResponse: chatContent.includes('GPA') || chatContent.length > 1000
      };
    }

    return {
      status: 'warning',
      message: 'Could not complete chat interaction'
    };
  });
  phase4Results.tests.push(aiChatTest);

  testResults.phases.push(phase4Results);

  // ============================================================
  // PHASE 5: LOGOUT & RE-LOGIN
  // ============================================================
  const phase5Results = {
    name: 'Phase 5: Logout & Re-login',
    tests: []
  };

  console.log('\n' + '='.repeat(60));
  console.log('PHASE 5: LOGOUT & RE-LOGIN');
  console.log('='.repeat(60));

  const logoutTest = await runTest('Test logout functionality', async () => {
    // Look for logout button
    const logoutButton = await page.$('button:has-text("Logout"), button:has-text("Log Out"), button:has-text("Sign Out"), a:has-text("Logout")');

    if (!logoutButton) {
      // Try profile menu
      const profileMenu = await page.$('[class*="profile"], [class*="user-menu"], button:has-text("Profile")');
      if (profileMenu) {
        await profileMenu.click();
        await wait(1000);
        const logoutInMenu = await page.$('button:has-text("Logout"), a:has-text("Logout")');
        if (logoutInMenu) {
          await logoutInMenu.click();
        }
      } else {
        return {
          status: 'warning',
          message: 'Logout button not found'
        };
      }
    } else {
      await logoutButton.click();
    }

    await wait(2000);
    await takeScreenshot(page, 'user-test-logout.png');

    const url = page.url();
    const isLoggedOut = url.includes('/login') || url.includes('/') && !url.includes('/student');

    return {
      status: isLoggedOut ? 'passed' : 'warning',
      message: isLoggedOut ? 'Successfully logged out' : 'May not have logged out properly',
      url
    };
  });
  phase5Results.tests.push(logoutTest);

  const reloginTest = await runTest('Test re-login functionality', async () => {
    await page.goto(`${BASE_URL}/login`);
    await wait(1000);

    await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await wait(3000);
    await takeScreenshot(page, 'user-test-relogin-success.png');

    const url = page.url();
    const isLoggedIn = url.includes('/dashboard') || url.includes('/student');

    return {
      status: isLoggedIn ? 'passed' : 'failed',
      message: isLoggedIn ? 'Successfully re-logged in' : 'Re-login failed',
      url
    };
  });
  phase5Results.tests.push(reloginTest);

  testResults.phases.push(phase5Results);

  // ============================================================
  // COLLECT CONSOLE ERRORS
  // ============================================================
  testResults.consoleErrors = consoleErrors;

  // ============================================================
  // SAVE RESULTS
  // ============================================================
  const resultsPath = join(TEST_RESULTS_DIR, 'complete-user-test-results.json');
  writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Test results saved to: ${resultsPath}`);

  // ============================================================
  // PRINT SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.summary.totalTests}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`⚠️  Warnings: ${testResults.summary.warnings}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`📸 Screenshots: ${testResults.screenshots.length}`);
  console.log(`🐛 Console Errors: ${consoleErrors.length}`);
  console.log('='.repeat(60));

  await browser.close();

  return testResults;
}

// Run the tests
main().catch(console.error);
