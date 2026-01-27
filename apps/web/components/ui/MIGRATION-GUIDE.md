# Migration Guide: Shared UI Components

This guide explains how to migrate from app-specific UI components to the shared UI library at `apps/web/components/ui/`.

## Overview

The shared UI components library consolidates common components from:
- **Admin App** (`apps/admin/components/ui/`)
- **Teacher App** (`apps/teacher/components/ui/`)
- **Student App** (`apps/student/components/ui/`)

## Component Mapping

### From Admin App

| Admin Component | Shared Component | Changes |
|----------------|------------------|---------|
| `DataTable.tsx` | `DataTable.tsx` | Merged with teacher version, added dark mode |
| `ConfirmModal.tsx` | `Modal.tsx` | Now generic modal, use with custom content |
| `FormModal.tsx` | `Modal.tsx` | Use Modal with form children |
| `StatCard.tsx` | `Card.tsx` | Use CardHeader/CardTitle subcomponents |
| `ChartCard.tsx` | `Card.tsx` | Use Card with variant="elevated" |
| `UserStatusBadge.tsx` | `Badge.tsx` | Generic badge with variants |
| `ExportButton.tsx` | `Button.tsx` | Use Button with icon |
| `FilterBar.tsx` | Custom component | Build with Input/Select |
| `BulkImportWizard.tsx` | Custom component | Build with Modal/DataTable |

### From Teacher App

| Teacher Component | Shared Component | Changes |
|------------------|------------------|---------|
| `Button.tsx` | `Button.tsx` | Added 'danger' variant, loading prop |
| `Card.tsx` | `Card.tsx` | Added variants and subcomponents |
| `Modal.tsx` | `Modal.tsx` | Added closeOnBackdropClick prop |
| `Badge.tsx` | `Badge.tsx` | Added 'primary' variant, size prop |
| `Input.tsx` | `Input.tsx` | Added label and error props |
| `LoadingSpinner.tsx` | `Spinner.tsx` | Renamed, added SpinnerOverlay |
| `Toaster.tsx` | `Toast.tsx` | Same, exports toast function |
| `Tabs.tsx` | Not included | Keep app-specific |
| `EmptyState.tsx` | Not included | Use DataTable empty state |
| `PlaceholderPage.tsx` | Not included | Keep app-specific |

### From Student App

| Student Component | Shared Component | Changes |
|------------------|------------------|---------|
| `Toaster.tsx` | `Toast.tsx` | Same implementation |
| `OnlineIndicator.tsx` | Not included | Keep app-specific (messaging) |
| `ReadReceiptTicks.tsx` | Not included | Keep app-specific (messaging) |
| `TypingIndicator.tsx` | Not included | Keep app-specific (messaging) |
| `MarkdownRenderer.tsx` | Not included | Keep app-specific (lessons) |

## Step-by-Step Migration

### Step 1: Update Package Configuration

If using the shared components from another app in the monorepo:

```json
// apps/admin/package.json (or teacher/student)
{
  "dependencies": {
    "@repo/web": "workspace:*"
  }
}
```

### Step 2: Update Imports

#### Before (Admin App)
```typescript
import DataTable from '@/components/ui/DataTable'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { StatCard } from '@/components/ui/StatCard'
```

#### After
```typescript
import { DataTable, Modal, Card, CardHeader, CardTitle } from '@repo/web/components/ui'
```

#### Before (Teacher App)
```typescript
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
```

#### After
```typescript
import { Button, Card, Modal, Badge } from '@repo/web/components/ui'
```

### Step 3: Update Component Usage

#### ConfirmModal → Modal

**Before:**
```tsx
<ConfirmModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Delete Item"
  message="Are you sure?"
  variant="danger"
/>
```

**After:**
```tsx
import { Modal, ModalFooter, Button } from '@repo/web/components/ui'

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Delete Item"
>
  <p>Are you sure?</p>
  <ModalFooter>
    <Button variant="outline" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Delete
    </Button>
  </ModalFooter>
</Modal>
```

#### StatCard → Card

**Before:**
```tsx
<StatCard
  title="Total Students"
  value="1,234"
  icon="school"
  trend={+12}
/>
```

**After:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@repo/web/components/ui'

<Card>
  <CardHeader>
    <CardTitle>Total Students</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-primary text-4xl">
        school
      </span>
      <div>
        <p className="text-3xl font-bold">1,234</p>
        <p className="text-sm text-green-600">+12%</p>
      </div>
    </div>
  </CardContent>
</Card>
```

#### LoadingSpinner → Spinner

**Before:**
```tsx
<LoadingSpinner size="md" />
```

**After:**
```tsx
import { Spinner } from '@repo/web/components/ui'

<Spinner size="md" label="Loading..." />
```

### Step 4: Update DataTable Usage

The DataTable API remains mostly the same:

```tsx
import { DataTable } from '@repo/web/components/ui'
import { ColumnDef } from '@tanstack/react-table'

type User = {
  id: string
  name: string
  email: string
}

const columns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
]

<DataTable
  columns={columns}
  data={users}
  loading={isLoading}
  selectable
  onSelectionChange={(selected) => console.log(selected)}
/>
```

### Step 5: Update Form Components

**Before:**
```tsx
<input
  type="email"
  className="w-full h-12 px-4 border rounded-lg"
  placeholder="Email"
/>
```

**After:**
```tsx
import { Input } from '@repo/web/components/ui'

<Input
  label="Email Address"
  type="email"
  icon="mail"
  placeholder="Enter your email"
  error={errors.email}
/>
```

### Step 6: Update Toast Notifications

**Before:**
```tsx
import { toast } from 'sonner'

toast.success('Success!')
```

**After:**
```tsx
import { toast } from '@repo/web/components/ui'

toast.success('Success!')
// Same API, just import from shared library
```

## Breaking Changes

### 1. Modal Component

- `ConfirmModal` is removed - use generic `Modal` with custom content
- `FormModal` is removed - use `Modal` with form children
- New prop: `closeOnBackdropClick` (default: true)

### 2. Button Component

- New variant: `danger`
- New prop: `loading` (shows spinner automatically)
- Removed: No breaking changes, fully backward compatible

### 3. Badge Component

- New variant: `primary`
- New prop: `size` ('sm' | 'md' | 'lg')

### 4. Card Component

- New subcomponents: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- New prop: `variant` ('default' | 'elevated' | 'bordered')

### 5. Spinner Component

- Renamed from `LoadingSpinner` to `Spinner`
- New subcomponent: `SpinnerOverlay` for full-screen loading

## Testing Checklist

After migration, test the following:

- [ ] All buttons render correctly with variants
- [ ] Forms submit with Input/Select components
- [ ] Modals open/close properly
- [ ] DataTable sorts and paginates
- [ ] Dark mode works on all components
- [ ] Toast notifications appear
- [ ] Spinners show during loading states
- [ ] Badges display with correct colors
- [ ] Cards render with proper styling

## Rollback Plan

If you need to rollback:

1. Keep old components in place temporarily
2. Gradually migrate pages one at a time
3. Test each page thoroughly before moving to next
4. Remove old components only after 100% migration

## Benefits of Migration

1. **Consistency** - All apps use the same components
2. **Maintainability** - Fix bugs once, benefit everywhere
3. **Performance** - Shared bundle, smaller total size
4. **Developer Experience** - Single source of truth
5. **Dark Mode** - Built-in support across all components
6. **TypeScript** - Better type safety with shared types
7. **Documentation** - Centralized examples and usage

## Support

For questions or issues during migration:

1. Check the [README.md](./README.md) for component usage
2. Review [example-usage.tsx](./example-usage.tsx) for code samples
3. Refer to original component implementations if needed

## Timeline

Recommended migration timeline:

- **Week 1**: Update imports and basic components (Button, Card, Badge)
- **Week 2**: Migrate form components (Input, Select)
- **Week 3**: Update complex components (DataTable, Modal)
- **Week 4**: Testing and cleanup
- **Week 5**: Remove old component files

## Next Steps

1. Start with non-critical pages
2. Test thoroughly in development
3. Deploy to staging for QA
4. Roll out to production gradually
5. Monitor for issues
6. Clean up old components

---

**Migration Status**: Ready
**Last Updated**: January 24, 2026
**Maintained By**: Development Team
