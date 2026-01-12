# CRITICAL FIX #3: Image Aspect Ratio Warning

## Issue
Browser console warning:
```
Image with src "/brand/logo.png" has either width or height modified, but not the other.
If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.
```

## Root Cause
The Next.js `<Image>` component is being used with either `width` OR `height` specified, but not both. This causes Next.js to warn about potential aspect ratio distortion.

## Solution
Find all instances where the logo is used and ensure proper sizing.

### Step 1: Find Logo Usage
```bash
cd /Users/adityaaman/Desktop/All\ Development/School\ management\ Software/student-app
grep -r "brand/logo.png" --include="*.tsx" --include="*.jsx" -n
```

### Step 2: Fix Image Component Usage

#### ❌ WRONG: Only width or only height
```tsx
<Image
  src="/brand/logo.png"
  width={100}
  // Missing height!
/>
```

#### ✅ CORRECT Option A: Specify both width and height
```tsx
<Image
  src="/brand/logo.png"
  width={100}
  height={40}
  alt="MSU Logo"
/>
```

#### ✅ CORRECT Option B: Use fill with container
```tsx
<div className="relative w-[100px] h-[40px]">
  <Image
    src="/brand/logo.png"
    fill
    className="object-contain"
    alt="MSU Logo"
  />
</div>
```

#### ✅ CORRECT Option C: Add style for auto dimension
```tsx
<Image
  src="/brand/logo.png"
  width={100}
  style={{ height: 'auto' }}
  alt="MSU Logo"
/>
```

### Step 3: Get Logo Dimensions
```bash
file /Users/adityaaman/Desktop/All\ Development/School\ management\ Software/student-app/public/brand/logo.png
# Or use an image tool to get actual dimensions
```

### Step 4: Apply Fix Across All Components
Common locations to check:
- `components/layout/Navbar.tsx` (header logo)
- `components/layout/Sidebar.tsx` (sidebar logo)
- `app/login/page.tsx` (login page logo)
- `components/layout/Footer.tsx` (footer logo)

## Expected Result
- No more aspect ratio warnings in console
- Logo displays with correct proportions
- Improved LCP (Largest Contentful Paint) score

## Performance Impact
- **Before**: Warning on every page load
- **After**: Clean console, better performance metrics
- **LCP Improvement**: ~100-200ms (removes layout shift)
