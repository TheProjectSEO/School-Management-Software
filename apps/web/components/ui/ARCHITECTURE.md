# UI Components Library - Architecture

## Directory Structure

```
apps/web/components/ui/
├── Button.tsx              # Button component with variants
├── Card.tsx                # Card container with subcomponents
├── Modal.tsx               # Modal dialog with portal
├── DataTable.tsx           # Advanced table with sorting/pagination
├── Input.tsx               # Form input with icon support
├── Select.tsx              # Dropdown select component
├── Badge.tsx               # Status badge component
├── Spinner.tsx             # Loading spinner + overlay
├── Toast.tsx               # Toast notifications (Sonner)
├── index.ts                # Centralized exports
├── README.md               # Component documentation
├── MIGRATION-GUIDE.md      # Migration instructions
├── COMPONENT-SUMMARY.md    # Project summary
├── ARCHITECTURE.md         # This file
└── example-usage.tsx       # Interactive examples
```

## Component Hierarchy

```
UI Components Library (@repo/web/components/ui)
│
├── Layout Components
│   ├── Card
│   │   ├── CardHeader
│   │   ├── CardTitle
│   │   ├── CardDescription
│   │   ├── CardContent
│   │   └── CardFooter
│   └── Modal
│       └── ModalFooter
│
├── Form Components
│   ├── Input
│   │   ├── Label
│   │   ├── Icon (optional)
│   │   └── Error message
│   ├── Select
│   │   ├── Label
│   │   ├── Options
│   │   └── Error message
│   └── Button
│       └── Loading spinner (optional)
│
├── Data Display
│   ├── DataTable
│   │   ├── Table Header
│   │   ├── Table Body
│   │   ├── Sorting controls
│   │   ├── Row selection
│   │   └── Pagination
│   └── Badge
│
└── Feedback Components
    ├── Toast (via Sonner)
    │   ├── Success
    │   ├── Error
    │   ├── Info
    │   └── Warning
    └── Spinner
        ├── Spinner (inline)
        └── SpinnerOverlay (full-screen)
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  (Admin App / Teacher App / Student App / Web App)          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Import components
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Shared UI Components Library                    │
│           (@repo/web/components/ui)                         │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Button    │  │   Card     │  │   Modal    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Input     │  │  Select    │  │   Badge    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ DataTable  │  │  Spinner   │  │   Toast    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Uses utilities
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Utility Layer                             │
│                 (@repo/web/lib/utils)                       │
│                                                              │
│  ┌────────────────────────────────────────────┐            │
│  │  cn() - Class name merger                  │            │
│  │  (clsx + tailwind-merge)                   │            │
│  └────────────────────────────────────────────┘            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Uses design system
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Design System Layer                         │
│              (Tailwind CSS Configuration)                    │
│                                                              │
│  Colors:                                                     │
│    - Primary: #7B1113 (MSU Maroon)                         │
│    - Gold: #FDB913                                          │
│    - Green: #006400                                         │
│                                                              │
│  Typography:                                                 │
│    - Font: Lexend                                           │
│    - Icons: Material Symbols Outlined                       │
│                                                              │
│  Spacing & Radius:                                          │
│    - Card: p-5, rounded-xl                                  │
│    - Input: h-12, rounded-lg                                │
│    - Button: h-9/12/14, rounded-lg                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Depends on
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Dependencies                       │
│                                                              │
│  React Ecosystem:                                            │
│    - react, react-dom                                       │
│    - TypeScript                                             │
│                                                              │
│  UI Libraries:                                               │
│    - @tanstack/react-table (DataTable)                     │
│    - sonner (Toast)                                         │
│                                                              │
│  Utilities:                                                  │
│    - clsx (Class merging)                                   │
│    - tailwind-merge (Tailwind conflict resolution)          │
│                                                              │
│  Styling:                                                    │
│    - tailwindcss                                            │
│    - @tailwindcss/forms                                     │
└─────────────────────────────────────────────────────────────┘
```

## Component Composition Patterns

### 1. Simple Components (Direct Usage)

```tsx
import { Button, Badge, Spinner } from '@repo/web/components/ui'

// Direct usage - no composition needed
<Button variant="primary">Click Me</Button>
<Badge variant="success">Active</Badge>
<Spinner size="md" />
```

### 2. Compound Components (Parent-Child)

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@repo/web/components/ui'

// Composition pattern
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### 3. Controlled Components (State Management)

```tsx
import { Modal, ModalFooter, Button } from '@repo/web/components/ui'

// External state control
const [isOpen, setIsOpen] = useState(false)

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  Content
  <ModalFooter>
    <Button onClick={() => setIsOpen(false)}>Close</Button>
  </ModalFooter>
</Modal>
```

### 4. Complex Components (Configuration)

```tsx
import { DataTable } from '@repo/web/components/ui'
import { ColumnDef } from '@tanstack/react-table'

// Configuration-driven
const columns: ColumnDef<User>[] = [...]

<DataTable
  columns={columns}
  data={users}
  pagination={paginationState}
  onPageChange={handlePageChange}
/>
```

## Styling Architecture

### Theme System

```
┌─────────────────────────────────────────┐
│         Tailwind Configuration          │
│  (tailwind.config.ts in each app)      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Design Tokens                   │
│  - Colors (primary, msu-gold, etc.)    │
│  - Fonts (Lexend)                      │
│  - Spacing (consistent scales)          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│      Component Styling Patterns         │
│  - cn() utility for class merging      │
│  - Variant-based styling               │
│  - Dark mode support (dark:)           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         Rendered Components             │
│  - Consistent visual design            │
│  - Responsive breakpoints              │
│  - Accessible markup                   │
└─────────────────────────────────────────┘
```

### Class Name Merging Strategy

```typescript
// Utility function
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage in component
<button
  className={cn(
    'base-classes',                    // Always applied
    variant === 'primary' && 'primary-classes',  // Conditional
    size === 'lg' && 'large-classes',  // Conditional
    className                          // User overrides
  )}
/>
```

## Type System Architecture

```typescript
// Component Props Pattern
interface ComponentProps extends HTMLAttributes<HTMLElement> {
  variant?: 'option1' | 'option2'  // Union types for variants
  size?: 'sm' | 'md' | 'lg'       // Union types for sizes
  customProp?: string              // Component-specific props
}

// forwardRef Pattern (for ref access)
const Component = forwardRef<HTMLElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <element ref={ref} {...props} />
  }
)

// Generic Components (DataTable)
interface DataTableProps<T extends object> {
  data: T[]
  columns: ColumnDef<T>[]
}

function DataTable<T extends object>({ data, columns }: DataTableProps<T>) {
  // Implementation
}
```

## Accessibility Architecture

```
Component Accessibility Layer
│
├── Semantic HTML
│   └── Use proper elements (button, input, select)
│
├── ARIA Attributes
│   ├── aria-label
│   ├── aria-describedby
│   └── role (when needed)
│
├── Keyboard Navigation
│   ├── Tab order
│   ├── Escape key (modals)
│   └── Enter/Space (buttons)
│
├── Focus Management
│   ├── Focus rings (focus:ring-2)
│   ├── Focus trapping (modals)
│   └── Focus restoration
│
└── Screen Reader Support
    ├── Hidden labels
    ├── Live regions (toasts)
    └── Descriptive text
```

## Performance Optimization

### Tree Shaking

```typescript
// Centralized exports enable tree shaking
export { Button } from './Button'
export { Card } from './Card'

// Apps only bundle what they import
import { Button, Card } from '@repo/web/components/ui'
// DataTable is NOT bundled if not imported
```

### Code Splitting

```typescript
// Dynamic imports for large components
const DataTable = lazy(() => import('@repo/web/components/ui/DataTable'))

// Usage
<Suspense fallback={<Spinner />}>
  <DataTable {...props} />
</Suspense>
```

### Memoization

```typescript
// Memoize columns for DataTable
const columns = useMemo(() => [...], [dependencies])

// Memoize expensive components
const ExpensiveComponent = memo(({ data }) => {
  // Component logic
})
```

## Testing Architecture

```
Testing Pyramid
│
├── Unit Tests (Component Level)
│   ├── Button renders correctly
│   ├── Input validates properly
│   └── Badge shows correct variant
│
├── Integration Tests (Composition)
│   ├── Form with Input + Button submits
│   ├── Modal with Card displays
│   └── DataTable with pagination works
│
└── E2E Tests (User Flows)
    ├── User fills form and submits
    ├── User sorts and filters table
    └── User opens modal and confirms
```

## Migration Architecture

```
┌─────────────────────────────────────────┐
│         Legacy Components               │
│  (app/components/ui/OldComponent.tsx)  │
└────────────────┬────────────────────────┘
                 │
                 │ Gradual Migration
                 ▼
┌─────────────────────────────────────────┐
│      Parallel Existence Phase           │
│  - Old components still work            │
│  - New components available             │
│  - Pages migrate one by one             │
└────────────────┬────────────────────────┘
                 │
                 │ Complete Migration
                 ▼
┌─────────────────────────────────────────┐
│       Shared Components Only            │
│  (@repo/web/components/ui)             │
│  - Old components removed               │
│  - All apps use shared library          │
└─────────────────────────────────────────┘
```

## Deployment Architecture

```
Development
│
├── Local Dev Server (next dev)
│   └── Hot reload for component changes
│
├── Build Process (next build)
│   ├── TypeScript compilation
│   ├── Tailwind CSS processing
│   └── Bundle optimization
│
└── Production Build
    ├── Minified JavaScript
    ├── Optimized CSS
    └── Tree-shaken bundles

Production (Vercel)
│
├── Edge Network (CDN)
│   └── Static assets cached globally
│
├── Serverless Functions
│   └── API routes (if needed)
│
└── Component Streaming
    └── React Server Components (RSC)
```

## Future Architecture Enhancements

### 1. Component Library Site (Storybook)

```
Storybook Instance
│
├── Interactive Component Gallery
├── Live Code Playground
├── Props Documentation
├── Accessibility Tests
└── Visual Regression Tests
```

### 2. Design Tokens System

```
Design Tokens (JSON)
│
├── colors.json
├── typography.json
├── spacing.json
└── effects.json

↓ Build Process

Tailwind Config (Auto-generated)
```

### 3. Component Analytics

```
Usage Tracking
│
├── Component render counts
├── Performance metrics
├── Error tracking
└── User interactions
```

---

**Architecture Version**: 1.0.0
**Last Updated**: January 24, 2026
**Status**: Production Ready
