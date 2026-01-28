# MSU Student App - Navigation Map

## Complete Navigation Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                          SIDEBAR (All Pages)                     │
├─────────────────────────────────────────────────────────────────┤
│  📊 Dashboard (/)                                                │
│  📚 My Subjects (/subjects)                                      │
│  📝 Assessments (/assessments)                                   │
│  📈 Progress (/progress)                                         │
│  📔 Notes (/notes)                                               │
│  📥 Downloads (/downloads)                                       │
│  🔔 Notifications (/notifications)                               │
│  👤 Profile (/profile)                                           │
│  ❓ Help (/help)                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        DASHBOARD (/)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────┐                         │
│  │  Continue Learning Card            │                         │
│  │  → /subjects/[subjectId]           │                         │
│  │  → /subjects (Browse Subjects)     │                         │
│  └────────────────────────────────────┘                         │
│                                                                  │
│  ┌────────────────────────────────────┐                         │
│  │  Upcoming Assessments              │                         │
│  │  → /assessments (View Calendar)    │                         │
│  │  → /assessments/[id] (Each card)   │                         │
│  └────────────────────────────────────┘                         │
│                                                                  │
│  ┌────────────────────────────────────┐                         │
│  │  Quick Actions                     │                         │
│  │  → /subjects                       │                         │
│  │  → /assessments                    │                         │
│  │  → /progress                       │                         │
│  └────────────────────────────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      SUBJECTS FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /subjects                                                       │
│  │                                                               │
│  ├─ Subject Cards                                               │
│  │  └─→ /subjects/[subjectId]                                   │
│  │                                                               │
│  └─ "View all catalog" (Disabled - Coming Soon)                 │
│                                                                  │
│  /subjects/[subjectId]                                          │
│  │                                                               │
│  ├─ Breadcrumb: Home > Subjects > [Subject Name]               │
│  │                                                               │
│  ├─ Continue Learning                                           │
│  │  └─→ /subjects/[subjectId]/modules/[moduleId]               │
│  │                                                               │
│  └─ Back: /subjects                                             │
│                                                                  │
│  /subjects/[subjectId]/modules/[moduleId]                       │
│  │                                                               │
│  ├─ Breadcrumb: Home > Subjects > [Subject] > [Module]         │
│  │                                                               │
│  ├─ Video Player / Content                                      │
│  │                                                               │
│  ├─ Lesson Navigation                                           │
│  │  ├─→ Previous Lesson (if exists)                            │
│  │  └─→ Next Lesson (if exists)                                │
│  │                                                               │
│  └─ Back: /subjects/[subjectId]                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ASSESSMENTS FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /assessments                                                    │
│  │                                                               │
│  ├─ Stats Cards (Due This Week, Pending, Completed)            │
│  │                                                               │
│  ├─ Immediate Action Section                                    │
│  │  └─→ /assessments/[id] (Each assessment)                    │
│  │                                                               │
│  ├─ Upcoming Section                                            │
│  │  └─→ /assessments/[id]                                      │
│  │                                                               │
│  ├─ Recent Feedback Section                                     │
│  │  └─→ /assessments/[id]/feedback                             │
│  │                                                               │
│  └─ "Learn about proctoring" → /help                           │
│                                                                  │
│  /assessments/[id]                                              │
│  │                                                               │
│  ├─ Breadcrumb: Home > Assessments > Assessment Details        │
│  │                                                               │
│  ├─ Instructions & Study Materials                              │
│  │  └─→ /downloads (Study materials)                           │
│  │                                                               │
│  ├─ Start Assessment Button                                     │
│  │                                                               │
│  ├─ Help Card → /help                                          │
│  │                                                               │
│  └─ Back: /assessments                                          │
│                                                                  │
│  /assessments/[id]/submission                                   │
│  │                                                               │
│  ├─ Breadcrumb: Home > Assessments > Assessment > Submission   │
│  │                                                               │
│  ├─ Submission Details                                          │
│  │                                                               │
│  ├─ Back Links:                                                 │
│  │  ├─→ /assessments/[id] (Assessment Details)                 │
│  │  └─→ /assessments (All Assessments)                         │
│  │                                                               │
│  /assessments/[id]/feedback                                     │
│  │                                                               │
│  ├─ Breadcrumb: Home > Assessments > Assessment > Feedback     │
│  │                                                               │
│  ├─ Score Display                                               │
│  │                                                               │
│  ├─ Instructor Feedback                                         │
│  │                                                               │
│  ├─ Performance Breakdown                                       │
│  │                                                               │
│  └─ Back Links:                                                 │
│     ├─→ /assessments/[id] (Assessment Details)                 │
│     └─→ /assessments (All Assessments)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      OTHER PAGES                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /progress                                                       │
│  │                                                               │
│  └─ Links: /subjects, /assessments                             │
│                                                                  │
│  /notes                                                          │
│  │                                                               │
│  └─ Filter by subjects, create new notes                        │
│                                                                  │
│  /downloads                                                      │
│  │                                                               │
│  └─ File downloads, status tracking                             │
│                                                                  │
│  /notifications                                                  │
│  │                                                               │
│  └─ Mark as read, filter notifications                          │
│                                                                  │
│  /profile                                                        │
│  │                                                               │
│  └─ Edit profile, change password                               │
│                                                                  │
│  /help                                                           │
│  │                                                               │
│  ├─ FAQs                                                        │
│  ├─ Contact Support                                             │
│  └─ "View Knowledge Base" (Disabled - Coming Soon)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

## Active States

### Sidebar Navigation
- Current page highlighted with:
  - Background: `bg-primary/10`
  - Text color: `text-primary`
  - Border: `border border-primary/10`

### Breadcrumbs
- Current page shown in:
  - `text-primary` or `text-msu-gold` (dark mode)
  - Regular weight (not a link)

### Navigation Logic
```typescript
// Sidebar active state
const isActive = (href: string) => {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
};
```

## Mobile Navigation

```
┌─────────────────────────────────────┐
│  [☰ Menu]                [MSU Logo] │
├─────────────────────────────────────┤
│  (When opened - slide-in menu)      │
│                                     │
│  Same 9 navigation items as sidebar │
│                                     │
│  - Closes automatically on click    │
│  - Overlay darkens background       │
│  - Swipe gesture support            │
└─────────────────────────────────────┘
```

## Key Navigation Features

✅ **Consistent Layout**: All pages use AppShell with Sidebar/MobileNav
✅ **Breadcrumbs**: Present on all detail/nested pages
✅ **Back Buttons**: Always return to logical parent page
✅ **Active States**: Clear visual indication of current page
✅ **Mobile Responsive**: Mobile menu for small screens
✅ **Deep Linking**: All routes support direct URL access
✅ **Type Safety**: All route params properly typed

## Route Protection

All routes in `(student)` group require authentication:
- Middleware checks for valid session
- Redirects to `/login` if not authenticated
- DAL functions verify student enrollment

## Quick Reference

| Page Type | Has Breadcrumb | Has Back Button | Active in Sidebar |
|-----------|---------------|-----------------|-------------------|
| Dashboard | No | No | Yes (/) |
| List Pages | No | No | Yes |
| Detail Pages | Yes | Yes | Parent route |
| Nested Pages | Yes | Yes | Root route |

## Notes for Developers

1. **Adding New Pages**:
   - Add route to appropriate folder in `app/(student)/`
   - Add breadcrumb if it's a detail page
   - Add back button linking to parent
   - Update this navigation map

2. **Updating Links**:
   - Always use Next.js `<Link>` component
   - Use absolute paths from root (e.g., `/subjects`)
   - For dynamic routes, construct with template literals

3. **Active States**:
   - Sidebar handles this automatically
   - Use `usePathname()` for custom components
   - Breadcrumbs: last item is not a link

4. **Mobile Considerations**:
   - MobileNav closes on navigation
   - Test all links on mobile viewport
   - Ensure touch targets are large enough
