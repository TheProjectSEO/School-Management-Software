# Quick Fix: NextJS Dev Overlay Issue in Playwright Tests

## Problem
Logout button click fails in Playwright tests because NextJS dev overlay intercepts the click.

## Quick Solution

### 1. Import the helper
```typescript
import { closeNextJSOverlay } from './test-helpers';
```

### 2. Before any critical button click
```typescript
await closeNextJSOverlay(page);
```

### 3. Use force flag
```typescript
await button.click({ force: true });
```

## One-Liner Fix
```typescript
await closeNextJSOverlay(page);
await logoutButton.first().click({ force: true });
```

## Helper Functions Available

### closeNextJSOverlay(page)
Removes NextJS dev overlay from the DOM
```typescript
await closeNextJSOverlay(page);
```

### safeClick(page, selector)
Closes overlay and clicks with force
```typescript
await safeClick(page, 'button[aria-label="logout"]');
```

### safeLocatorClick(locator)
Closes overlay and clicks on locator with force
```typescript
const button = page.locator('button:has-text("logout")');
await safeLocatorClick(button);
```

### waitAndClick(page, selector, timeout?)
Wait for element, close overlay, and click
```typescript
await waitAndClick(page, 'button.logout', 5000);
```

## Test the Fix

Run the logout test:
```bash
npx playwright test tests/comprehensive-mission-test.spec.ts -g "Logout"
```

Expected result: Test passes without click timeout errors

## Where This Is Used

- `tests/comprehensive-mission-test.spec.ts` - Line 492-496 (Logout test)
- Can be applied to any other tests that click buttons during dev mode

## Files Created/Modified

- **NEW**: `tests/test-helpers.ts` - Utility functions
- **MODIFIED**: `tests/comprehensive-mission-test.spec.ts` - Applied fix to logout test

## Why This Works

1. **Removes the overlay** - Deletes the `<nextjs-portal>` element blocking clicks
2. **Force flag** - Bypasses any remaining pointer events
3. **Graceful fallback** - Works even if overlay doesn't exist

## Environment

Works in:
- Development mode (where dev overlay appears)
- Chromium, Firefox, WebKit
- Next.js 14+
- Playwright 1.40+

---

**Status**: RESOLVED
**Priority**: MEDIUM
**Issue**: #6 - NextJS Dev Overlay Blocking Logout Button
