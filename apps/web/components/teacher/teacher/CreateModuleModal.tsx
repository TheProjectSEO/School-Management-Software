'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface CreateModuleModalProps {
  courseId: string
  subjectId: string
  onClose: () => void
  onSuccess?: (module: any) => void
}

export default function CreateModuleModal({
  courseId,
  subjectId,
  onClose,
  onSuccess
}: CreateModuleModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setError('Module title is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/content/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create module')
      }

      const data = await response.json()

      if (onSuccess) {
        onSuccess(data.module)
      }

      // Navigate to the new module editor
      router.push(`/teacher/subjects/${subjectId}/modules/${data.module.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create module')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-primary">article</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Create New Module
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Add a new module to your course
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Module Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Introduction to Programming"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this module covers..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Estimated Duration (minutes)
            </label>
            <Input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
              placeholder="45"
              min={1}
            />
            <p className="text-xs text-slate-500 mt-1">
              This can be automatically calculated from lesson durations
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">add</span>
                  Create Module
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
