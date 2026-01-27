/**
 * Example Usage of Shared UI Components
 *
 * This file demonstrates how to use all the UI components
 * from the shared library.
 */

'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  ModalFooter,
  Input,
  Select,
  Badge,
  Spinner,
  SpinnerOverlay,
  DataTable,
  toast,
} from './index'

// Example data type for DataTable
type Student = {
  id: string
  name: string
  email: string
  grade: string
  status: 'active' | 'inactive'
}

export default function UIComponentsExample() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])

  // Example data
  const students: Student[] = [
    { id: '1', name: 'Juan Dela Cruz', email: 'juan@example.com', grade: '10', status: 'active' },
    { id: '2', name: 'Maria Santos', email: 'maria@example.com', grade: '10', status: 'active' },
    { id: '3', name: 'Jose Rizal', email: 'jose@example.com', grade: '11', status: 'inactive' },
  ]

  // DataTable columns
  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'grade',
      header: 'Grade',
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'success' : 'default'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info(`Viewing ${row.original.name}`)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => toast.error(`Deleting ${row.original.name}`)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const gradeOptions = [
    { value: '10', label: 'Grade 10' },
    { value: '11', label: 'Grade 11' },
    { value: '12', label: 'Grade 12' },
  ]

  const handleSubmit = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      toast.success('Form submitted successfully!')
    }, 2000)
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
        UI Components Library
      </h1>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Various button styles and sizes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="flex gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Components */}
      <Card>
        <CardHeader>
          <CardTitle>Form Components</CardTitle>
          <CardDescription>Input and Select components with validation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <Input
              label="Email Address"
              type="email"
              icon="mail"
              placeholder="Enter your email"
            />
            <Input
              label="Password"
              type="password"
              icon="lock"
              placeholder="Enter your password"
              error="Password must be at least 8 characters"
            />
            <Select
              label="Grade Level"
              options={gradeOptions}
              placeholder="Select grade"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit}>Submit Form</Button>
        </CardFooter>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>Status indicators and tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Spinner */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Spinners</CardTitle>
          <CardDescription>Various spinner sizes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <Spinner size="sm" />
            <Spinner size="md" label="Loading..." />
            <Spinner size="lg" />
            <Spinner size="xl" label="Please wait" />
          </div>
        </CardContent>
      </Card>

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
          <CardDescription>Table with sorting and selection</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={students}
            selectable
            onSelectionChange={setSelectedStudents}
            rowKey="id"
          />
          {selectedStudents.length > 0 && (
            <div className="mt-4">
              <Badge variant="info">
                {selectedStudents.length} student(s) selected
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Card>
        <CardHeader>
          <CardTitle>Modal</CardTitle>
          <CardDescription>Dialog and confirmation modals</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsModalOpen(true)}>
            Open Modal
          </Button>
        </CardContent>
      </Card>

      {/* Toast Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Toast Notifications</CardTitle>
          <CardDescription>Success, error, info, and warning toasts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={() => toast.success('Success!')}>Success</Button>
            <Button onClick={() => toast.error('Error!')}>Error</Button>
            <Button onClick={() => toast.info('Info!')}>Info</Button>
            <Button onClick={() => toast.warning('Warning!')}>Warning</Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            This is an example modal with a title and close button.
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            Press Escape or click the backdrop to close.
          </p>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            setIsModalOpen(false)
            toast.success('Modal action confirmed!')
          }}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>

      {/* Loading Overlay Example */}
      {isLoading && <SpinnerOverlay message="Processing your request..." />}
    </div>
  )
}
