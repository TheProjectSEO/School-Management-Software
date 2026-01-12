import { Page } from '@playwright/test';

/**
 * Close NextJS dev overlay if present to prevent click interception
 * This is useful when running Playwright tests in development mode
 */
export async function closeNextJSOverlay(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      // Close nextjs-portal overlay
      const overlay = document.querySelector('nextjs-portal');
      if (overlay) {
        console.log('[Test Helper] Removing nextjs-portal overlay');
        overlay.remove();
      }

      // Also try closing any other overlays
      const dialogs = document.querySelectorAll('[class*="overlay"], [class*="modal"], [role="dialog"]');
      dialogs.forEach(dialog => {
        const closeBtn = dialog.querySelector('button[aria-label="Close"]') ||
                        dialog.querySelector('button:has-text("Close")') ||
                        dialog.querySelector('[class*="close"]');
        if (closeBtn) {
          (closeBtn as HTMLElement).click();
        }
      });
    });
  } catch (error) {
    console.warn('[Test Helper] Could not close NextJS overlay:', error);
  }
}

/**
 * Click an element with overlay protection
 * Closes dev overlay first, then clicks with force: true as backup
 */
export async function safeClick(page: Page, selector: string, options?: { force?: boolean }): Promise<void> {
  // Close overlay first
  await closeNextJSOverlay(page);

  // Click with force flag to bypass any remaining overlays
  await page.click(selector, { force: true, ...options });
}

/**
 * Click a locator with overlay protection
 */
export async function safeLocatorClick(locator: any, options?: { force?: boolean }): Promise<void> {
  try {
    // Close overlay if possible
    const page = locator.page();
    if (page) {
      await closeNextJSOverlay(page);
    }
  } catch {
    // Ignore if we can't get the page
  }

  // Click with force flag
  await locator.click({ force: true, ...options });
}

/**
 * Wait for element and click with overlay protection
 */
export async function waitAndClick(page: Page, selector: string, timeout?: number): Promise<void> {
  await page.waitForSelector(selector, { timeout });
  await safeClick(page, selector);
}
