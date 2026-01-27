# Shared UI Components Library

A comprehensive, reusable UI components library for the School Management Software, consolidated from admin, teacher, and student apps. Built with React, TypeScript, and Tailwind CSS.

## Installation

All dependencies are already installed in the web app package.json. To use these components in other apps, simply import them:

```typescript
import { Button, Card, Modal, Input, Badge } from '@repo/web/components/ui'
```

## Components

### 1. Button

Standard button component with multiple variants and sizes.

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `loading`: boolean (default: false) - Shows loading spinner
- All standard button HTML attributes

**Usage:**
```tsx
import { Button } from '@repo/web/components/ui'

<Button variant="primary" size="md">Click Me</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button loading>Processing...</Button>
```

### 2. Card

Container component for grouping related content.

**Variants:**
- `default`: Standard card with border and shadow
- `elevated`: Card with more prominent shadow
- `bordered`: Card with thicker border, no shadow

**Subcomponents:**
- `CardHeader`: Header section
- `CardTitle`: Title text
- `CardDescription`: Description text
- `CardContent`: Main content area
- `CardFooter`: Footer section with action buttons

**Usage:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@repo/web/components/ui'

<Card variant="default">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    Main content
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### 3. Modal

Reusable modal/dialog component with portal rendering.

**Props:**
- `isOpen`: boolean - Controls modal visibility
- `onClose`: () => void - Close handler
- `title`: string (optional)
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full' (default: 'md')
- `showCloseButton`: boolean (default: true)
- `closeOnBackdropClick`: boolean (default: true)

**Features:**
- Escape key to close
- Prevents body scroll when open
- Portal rendering to document.body
- Backdrop blur effect

**Usage:**
```tsx
import { Modal, ModalFooter, Button } from '@repo/web/components/ui'

const [isOpen, setIsOpen] = useState(false)

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to proceed?</p>
  <ModalFooter>
    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </ModalFooter>
</Modal>
```

### 4. DataTable

Advanced table component with sorting, pagination, and row selection.

**Props:**
- `columns`: ColumnDef[] - Column definitions (TanStack Table)
- `data`: T[] - Array of data objects
- `pagination`: PaginationInfo (optional) - Pagination state
- `onPageChange`: (page: number) => void (optional)
- `selectable`: boolean (default: false)
- `onSelectionChange`: (selected: T[]) => void (optional)
- `loading`: boolean (default: false)
- `emptyMessage`: string (default: "No data found")
- `emptyIcon`: string (default: "inbox")
- `rowKey`: keyof T (optional) - Unique key for rows

**Features:**
- Sortable columns
- Client or server-side pagination
- Row selection with checkboxes
- Loading state
- Empty state
- Responsive design

**Usage:**
```tsx
import { DataTable } from '@repo/web/components/ui'
import { ColumnDef } from '@tanstack/react-table'

type User = {
  id: string
  name: string
  email: string
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
]

<DataTable
  columns={columns}
  data={users}
  pagination={{
    page: 1,
    pageSize: 10,
    total: 100,
    totalPages: 10,
  }}
  onPageChange={(page) => setPage(page)}
  selectable
  onSelectionChange={(selected) => console.log(selected)}
/>
```

### 5. Input

Form input component with icon and error support.

**Props:**
- `icon`: string (optional) - Material Symbols icon name
- `error`: string (optional) - Error message
- `label`: string (optional) - Input label
- All standard input HTML attributes

**Usage:**
```tsx
import { Input } from '@repo/web/components/ui'

<Input
  label="Email"
  type="email"
  icon="mail"
  placeholder="Enter your email"
  error={errors.email}
/>
```

### 6. Select

Dropdown select component with options.

**Props:**
- `options`: SelectOption[] - Array of { value, label, disabled? }
- `label`: string (optional)
- `error`: string (optional)
- `placeholder`: string (optional)
- All standard select HTML attributes

**Usage:**
```tsx
import { Select } from '@repo/web/components/ui'

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3', disabled: true },
]

<Select
  label="Choose an option"
  options={options}
  placeholder="Select..."
  error={errors.selection}
/>
```

### 7. Badge

Status badge component for displaying tags and statuses.

**Props:**
- `variant`: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
- `size`: 'sm' | 'md' | 'lg' (default: 'md')

**Usage:**
```tsx
import { Badge } from '@repo/web/components/ui'

<Badge variant="success">Active</Badge>
<Badge variant="warning" size="sm">Pending</Badge>
<Badge variant="danger">Error</Badge>
```

### 8. Spinner

Loading spinner component.

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `label`: string (optional) - Text below spinner
- `className`: string (optional)

**Subcomponents:**
- `SpinnerOverlay`: Full-screen overlay with spinner

**Usage:**
```tsx
import { Spinner, SpinnerOverlay } from '@repo/web/components/ui'

<Spinner size="lg" label="Loading..." />

// Full-screen overlay
<SpinnerOverlay message="Processing..." />
```

### 9. Toast

Toast notification system using Sonner.

**Setup:**
Add `<Toaster />` to your root layout:

```tsx
import { Toaster } from '@repo/web/components/ui'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

**Usage:**
```tsx
import { toast } from '@repo/web/components/ui'

toast.success('Success message')
toast.error('Error message')
toast.info('Info message')
toast.warning('Warning message')

// With action
toast('Event created', {
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
})
```

## Styling

All components use Tailwind CSS with the following design system:

### Colors
- **Primary (MSU Maroon)**: `#7B1113`
- **Primary Hover**: `#961517`
- **Primary Active**: `#5a0c0e`
- **MSU Gold**: `#FDB913`
- **MSU Green**: `#006400`

### Dark Mode
All components support dark mode out of the box. Toggle with `class="dark"` on the `<html>` element.

### Typography
- **Font**: Lexend (display font)
- **Icons**: Material Symbols Outlined

### Spacing & Radius
- **Card padding**: `p-5` or `p-6`
- **Border radius**: `rounded-xl` for cards, `rounded-lg` for inputs/buttons
- **Shadows**: `shadow-sm`, `hover:shadow-md`

## Utility Functions

### cn (Class Names)

Merge Tailwind classes safely:

```typescript
import { cn } from '@repo/web/lib/utils'

<div className={cn(
  'base-class',
  condition && 'conditional-class',
  className
)} />
```

## Best Practices

1. **Always use forwardRef** for components that need ref access
2. **Provide proper TypeScript types** for all props
3. **Support dark mode** by default
4. **Use Material Symbols icons** consistently
5. **Make components accessible** with ARIA labels
6. **Handle loading and error states** gracefully
7. **Keep components composable** - single responsibility

## Migration Guide

### From Admin App

```typescript
// Before
import DataTable from '@/components/ui/DataTable'
import ConfirmModal from '@/components/ui/ConfirmModal'

// After
import { DataTable, Modal } from '@repo/web/components/ui'
```

### From Teacher App

```typescript
// Before
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'

// After
import { Button, Card, Modal } from '@repo/web/components/ui'
```

### From Student App

```typescript
// Before (limited UI components)
import { Toaster } from '@/components/ui/Toaster'

// After (full component library)
import { Toaster, Button, Card, Input } from '@repo/web/components/ui'
```

## Dependencies

Required npm packages (already installed):

- `react` & `react-dom`
- `@tanstack/react-table` - DataTable component
- `clsx` & `tailwind-merge` - Class name utilities
- `sonner` - Toast notifications
- `tailwindcss` - Styling

## Contributing

When adding new components:

1. Create component file in `apps/web/components/ui/`
2. Use TypeScript with proper types
3. Support dark mode
4. Add to `index.ts` export
5. Update this README with usage examples
6. Test across all three apps (admin, teacher, student)

## License

Internal use only - School Management Software project.
