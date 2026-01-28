'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { TeacherSubject } from '@/lib/dal/teacher'

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  subjects: TeacherSubject[]
  onSubmit: (data: SessionFormData) => Promise<void>
}

export interface SessionFormData {
  course_id: string
  section_id: string
  module_id?: string | null
  title: string
  description?: string | null
  scheduled_start: string
  scheduled_end?: string | null
  provider?: 'zoom' | 'meet' | 'teams' | 'livekit' | 'daily' | 'internal'
  join_url?: string | null
}

export default function CreateSessionModal({
  isOpen,
  onClose,
  subjects,
  onSubmit
}: CreateSessionModalProps) {
  const [formData, setFormData] = useState<SessionFormData>({
    course_id: '',
    section_id: '',
    module_id: null,
    title: '',
    description: null,
    scheduled_start: '',
    scheduled_end: null,
    provider: 'zoom',
    join_url: null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get selected subject to access modules
  const selectedSubject = subjects.find(s => s.id === formData.course_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.course_id) {
      setError('Please select a subject/course')
      return
    }
    if (!formData.title) {
      setError('Please enter a session title')
      return
    }
    if (!formData.scheduled_start) {
      setError('Please select a start date and time')
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(formData)
      // Reset form
      setFormData({
        course_id: '',
        section_id: '',
        module_id: null,
        title: '',
        description: null,
        scheduled_start: '',
        scheduled_end: null,
        provider: 'zoom',
        join_url: null
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubjectChange = (courseId: string) => {
    const subject = subjects.find(s => s.id === courseId)
    setFormData({
      ...formData,
      course_id: courseId,
      section_id: subject?.section_id || ''
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Create Live Session
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
              close
            </span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                  error
                </span>
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Subject/Course Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Subject/Course
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => handleSubjectChange(e.target.value)}
              required
              className="w-full h-12 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            >
              <option value="">Select a subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.subject_code}) - {subject.section_name}
                </option>
              ))}
            </select>
          </div>

          {/* Module Selection (Optional) */}
          {selectedSubject && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Module (Optional)
              </label>
              <select
                value={formData.module_id || ''}
                onChange={(e) => setFormData({ ...formData, module_id: e.target.value || null })}
                className="w-full h-12 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              >
                <option value="">No specific module</option>
                {/* Note: In production, you'd fetch modules for the selected course */}
                <option value="general">General Session</option>
              </select>
            </div>
          )}

          {/* Session Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Session Title
              <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Introduction to Algebra"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
              placeholder="What will you cover in this session?"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Start Date & Time
                <span className="text-red-500 ml-1">*</span>
              </label>
              <Input
                type="datetime-local"
                value={formData.scheduled_start}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                End Date & Time
              </label>
              <Input
                type="datetime-local"
                value={formData.scheduled_end || ''}
                onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value || null })}
              />
            </div>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Video Platform
            </label>
            <select
              value={formData.provider || 'zoom'}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
              className="w-full h-12 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            >
              <option value="zoom">Zoom</option>
              <option value="meet">Google Meet</option>
              <option value="teams">Microsoft Teams</option>
              <option value="livekit">LiveKit</option>
              <option value="daily">Daily.co</option>
              <option value="internal">Internal Platform</option>
            </select>
          </div>

          {/* Join URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Join URL
            </label>
            <Input
              type="url"
              value={formData.join_url || ''}
              onChange={(e) => setFormData({ ...formData, join_url: e.target.value || null })}
              placeholder="https://zoom.us/j/123456789"
              icon="link"
            />
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              The meeting link students will use to join the session
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-lg mr-2 animate-spin">
                    progress_activity
                  </span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg mr-2">
                    add
                  </span>
                  Create Session
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
