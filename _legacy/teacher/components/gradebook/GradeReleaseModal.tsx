'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface GradebookStudent {
  student_id: string
  student_name: string
  lrn?: string
  profile_id: string
}

interface GradeReleaseModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  periodId: string
  students: GradebookStudent[]
  onRelease: () => void
}

export default function GradeReleaseModal({
  isOpen,
  onClose,
  courseId,
  periodId,
  students,
  onRelease,
}: GradeReleaseModalProps) {
  const [releaseType, setReleaseType] = useState<'all' | 'selected'>('all')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  // Select/deselect all
  const toggleAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map((s) => s.student_id)))
    }
  }

  // Get release count
  const releaseCount =
    releaseType === 'all' ? students.length : selectedStudents.size

  // Check if confirmation is valid
  const isConfirmValid =
    confirmText.toLowerCase() === 'release' && releaseCount > 0

  // Handle submission
  const handleSubmit = async () => {
    if (!isConfirmValid) {
      setError('Please type "RELEASE" to confirm')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const studentIds =
        releaseType === 'all'
          ? students.map((s) => s.student_id)
          : Array.from(selectedStudents)

      const response = await fetch('/api/teacher/gradebook/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          periodId,
          studentIds,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to release grades')
      }

      onRelease()
      handleReset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form
  const handleReset = () => {
    setReleaseType('all')
    setSelectedStudents(new Set())
    setConfirmText('')
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                publish
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Release Grades
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Make grades visible to students
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose()
              handleReset()
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
              close
            </span>
          </button>
        </div>

        <div className="p-6 space-y-6">
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

          {/* Warning */}
          <div className="px-4 py-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5">
                warning
              </span>
              <div>
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  This action cannot be undone
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Once grades are released, students will be able to view their
                  grades and the grades will be marked as finalized.
                </p>
              </div>
            </div>
          </div>

          {/* Release Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Release To
            </label>
            <div className="space-y-3">
              <label
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  releaseType === 'all'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="releaseType"
                  value="all"
                  checked={releaseType === 'all'}
                  onChange={() => setReleaseType('all')}
                  className="w-5 h-5 text-primary"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    All Students
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Release grades to all {students.length} students
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">{students.length}</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  releaseType === 'selected'
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="releaseType"
                  value="selected"
                  checked={releaseType === 'selected'}
                  onChange={() => setReleaseType('selected')}
                  className="w-5 h-5 text-primary"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Selected Students
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Choose specific students to release grades to
                  </div>
                </div>
                {releaseType === 'selected' && (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">
                      {selectedStudents.size}
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Student Selection */}
          {releaseType === 'selected' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Select Students
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {selectedStudents.size === students.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
                {students.map((student) => (
                  <label
                    key={student.student_id}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      selectedStudents.has(student.student_id)
                        ? 'bg-primary/5'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.student_id)}
                      onChange={() => toggleStudent(student.student_id)}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-sm">
                        {student.student_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {student.student_name}
                      </div>
                      {student.lrn && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {student.lrn}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Type &quot;RELEASE&quot; to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RELEASE"
              className="w-full h-12 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">
                info
              </span>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {releaseCount} student{releaseCount !== 1 ? 's' : ''} will
                  receive their grades
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Grades will be visible immediately after release
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose()
                handleReset()
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isConfirmValid}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-lg mr-2 animate-spin">
                    progress_activity
                  </span>
                  Releasing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg mr-2">
                    publish
                  </span>
                  Release Grades
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
