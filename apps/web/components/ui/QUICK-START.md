# Quick Start Guide - Shared UI Components

Get started with the shared UI components library in 5 minutes.

## Installation

### Option 1: Use in Web App (Direct)

Already set up! Just import:

```typescript
import { Button, Card, Input } from '@/components/ui'
```

### Option 2: Use in Other Apps (Monorepo)

1. Add dependency to your app's `package.json`:

```json
{
  "dependencies": {
    "@repo/web": "workspace:*"
  }
}
```

2. Run install:

```bash
npm install
```

3. Import components:

```typescript
import { Button, Card, Input } from '@repo/web/components/ui'
```

## Basic Usage

### 1. Button

```tsx
import { Button } from '@/components/ui'

// Primary button
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>

// Loading button
<Button loading>Processing...</Button>

// Danger button (for destructive actions)
<Button variant="danger" size="sm">Delete</Button>
```

### 2. Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

<Card>
  <CardHeader>
    <CardTitle>Welcome</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your content here</p>
  </CardContent>
</Card>
```

### 3. Form Components

```tsx
import { Input, Select, Button } from '@/components/ui'

function MyForm() {
  const [email, setEmail] = useState('')

  return (
    <form>
      <Input
        label="Email"
        type="email"
        icon="mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Select
        label="Grade"
        options={[
          { value: '10', label: 'Grade 10' },
          { value: '11', label: 'Grade 11' },
        ]}
      />

      <Button type="submit">Submit</Button>
    </form>
  )
}
```

### 4. Modal

```tsx
import { Modal, ModalFooter, Button } from '@/components/ui'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
      >
        <p>Are you sure?</p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
```

### 5. Toast Notifications

```tsx
import { toast, Toaster } from '@/components/ui'

// In your root layout:
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

// In any component:
toast.success('Success!')
toast.error('Error occurred')
toast.info('FYI: Something happened')
```

### 6. Data Table

```tsx
import { DataTable } from '@/components/ui'
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

function MyTable() {
  const users = [
    { id: '1', name: 'John', email: 'john@example.com' },
  ]

  return (
    <DataTable
      columns={columns}
      data={users}
      loading={false}
    />
  )
}
```

### 7. Badge

```tsx
import { Badge } from '@/components/ui'

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Inactive</Badge>
```

### 8. Spinner

```tsx
import { Spinner, SpinnerOverlay } from '@/components/ui'

// Inline spinner
<Spinner size="md" label="Loading..." />

// Full-screen overlay
{isLoading && <SpinnerOverlay message="Processing..." />}
```

## Common Patterns

### Form with Validation

```tsx
import { Input, Button, toast } from '@/components/ui'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  const validate = () => {
    if (!email.includes('@')) {
      setEmailError('Invalid email')
      return false
    }
    setEmailError('')
    return true
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validate()) {
      toast.success('Form submitted!')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={emailError}
      />
      <Button type="submit">Login</Button>
    </form>
  )
}
```

### Confirmation Dialog

```tsx
import { Modal, ModalFooter, Button, toast } from '@/components/ui'

function DeleteButton({ itemId }) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    await deleteItem(itemId)
    toast.success('Deleted successfully')
    setShowConfirm(false)
  }

  return (
    <>
      <Button variant="danger" onClick={() => setShowConfirm(true)}>
        Delete
      </Button>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Deletion"
      >
        <p>This action cannot be undone.</p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
```

### Loading State

```tsx
import { Button, SpinnerOverlay } from '@/components/ui'

function MyComponent() {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      await performAction()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleAction} loading={loading}>
        Submit
      </Button>
      {loading && <SpinnerOverlay message="Processing..." />}
    </>
  )
}
```

## Styling Tips

### Custom Styling

All components accept a `className` prop for custom styling:

```tsx
<Button className="w-full mt-4">Full Width Button</Button>
<Card className="max-w-md mx-auto">Centered Card</Card>
```

### Dark Mode

Components automatically support dark mode:

```html
<!-- Enable dark mode -->
<html class="dark">
  <!-- Components will use dark styles -->
</html>
```

### Responsive Design

Use Tailwind's responsive prefixes:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>Card 1</Card>
  <Card>Card 2</Card>
  <Card>Card 3</Card>
</div>
```

## TypeScript Tips

### Type Safety

Components are fully typed:

```tsx
import { ButtonProps } from '@/components/ui/Button'

const myButtonProps: ButtonProps = {
  variant: 'primary', // Type-safe variants
  size: 'md',
  onClick: () => {},
}

<Button {...myButtonProps}>Click</Button>
```

### Generic Components

DataTable is generic:

```tsx
type Student = {
  id: string
  name: string
  grade: number
}

const columns: ColumnDef<Student>[] = [
  // Columns are type-safe to Student
]

<DataTable<Student> columns={columns} data={students} />
```

## Next Steps

1. **Read the full documentation**: [README.md](./README.md)
2. **See examples**: [example-usage.tsx](./example-usage.tsx)
3. **Migration guide**: [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md)
4. **Architecture details**: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Getting Help

- Check component props in TypeScript definitions
- Review example usage in `example-usage.tsx`
- Read the comprehensive README
- Refer to original implementations if needed

## Quick Reference

| Component | Import | Main Props |
|-----------|--------|------------|
| Button | `import { Button }` | variant, size, loading |
| Card | `import { Card }` | variant, children |
| Modal | `import { Modal }` | isOpen, onClose, title, size |
| Input | `import { Input }` | label, icon, error |
| Select | `import { Select }` | label, options, error |
| Badge | `import { Badge }` | variant, size |
| DataTable | `import { DataTable }` | columns, data, pagination |
| Spinner | `import { Spinner }` | size, label |
| Toast | `import { toast }` | toast.success(), etc. |

---

**Happy coding!** 🚀
