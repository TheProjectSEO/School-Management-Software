import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'student@msu.edu.ph',
  password: 'Test123!@#'
};

test.describe('Manual Page Testing', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*/, { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('Test 1: Login', async ({ page }) => {
    await page.screenshot({ path: 'test-results/01-login-success.png', fullPage: true });
    expect(page.url()).toContain(BASE_URL);
  });

  test('Test 2: Dashboard', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/02-dashboard.png', fullPage: true });

    console.log(`Dashboard - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 3: Subjects', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/subjects`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/03-subjects.png', fullPage: true });

    console.log(`Subjects - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 4: Assessments', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/assessments`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/04-assessments.png', fullPage: true });

    console.log(`Assessments - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 5: Grades', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/grades`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/05-grades.png', fullPage: true });

    console.log(`Grades - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 6: Attendance', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/attendance`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/06-attendance.png', fullPage: true });

    console.log(`Attendance - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 7: Progress', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/progress`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/07-progress.png', fullPage: true });

    console.log(`Progress - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 8: Notes', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/notes`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/08-notes.png', fullPage: true });

    console.log(`Notes - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 9: Downloads', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/downloads`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/09-downloads.png', fullPage: true });

    console.log(`Downloads - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 10: Messages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/messages`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/10-messages.png', fullPage: true });

    console.log(`Messages - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 11: Announcements', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/announcements`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/11-announcements.png', fullPage: true });

    console.log(`Announcements - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 12: Notifications', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/12-notifications.png', fullPage: true });

    console.log(`Notifications - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 13: Profile', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/13-profile.png', fullPage: true });

    console.log(`Profile - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });

  test('Test 14: Help', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/help`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/14-help.png', fullPage: true });

    console.log(`Help - Errors: ${errors.length}`);
    if (errors.length > 0) console.log(`First error: ${errors[0].substring(0, 100)}`);
  });
});
