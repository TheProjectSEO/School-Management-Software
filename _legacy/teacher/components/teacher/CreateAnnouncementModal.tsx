'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type TargetType = 'section' | 'grade' | 'course' | 'school'
type Priority = 'low' | 'normal' | 'high' | 'urgent'

interface TargetOption {
  id: string
  name: string
  student_count: number
  grade_level?: string
  section_name?: string
}

interface GradeOption {
  grade_level: string
  student_count: number
}

interface CreateAnnouncementModalProps {
  onClose: () => void
  onSuccess?: (announcement: any) => void
}

export default function CreateAnnouncementModal({
  onClose,
  onSuccess
}: CreateAnnouncementModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetType, setTargetType] = useState<TargetType>('section')
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [priority, setPriority] = useState<Priority>('normal')
  const [expiresAt, setExpiresAt] = useState('')

  // Target options from API
  const [sections, setSections] = useState<TargetOption[]>([])
  const [gradeLevels, setGradeLevels] = useState<GradeOption[]>([])
  const [courses, setCourses] = useState<TargetOption[]>([])
  const [schoolWideCount, setSchoolWideCount] = useState(0)

  // Preview count
  const [previewCount, setPreviewCount] = useState(0)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Fetch targeting options on mount
  useEffect(() => {
    async function fetchTargets() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/announcements/targets')
        if (response.ok) {
          const data = await response.json()
          setSections(data.sections || [])
          setGradeLevels(data.gradeLevels || [])
          setCourses(data.courses || [])
          setSchoolWideCount(data.schoolWideCount || 0)
        }
      } catch (err) {
        console.error('Failed to fetch targets:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTargets()
  }, [])

  // Update preview count when targeting changes
  useEffect(() => {
    async function fetchPreviewCount() {
      if (targetType === 'school') {
        setPreviewCount(schoolWideCount)
        return
      }

      const hasSelection =
        (targetType === 'section' && selectedSections.length > 0) ||
        (targetType === 'grade' && selectedGrades.length > 0) ||
        (targetType === 'course' && selectedCourses.length > 0)

      if (!hasSelection) {
        setPreviewCount(0)
        return
      }

      setIsLoadingPreview(true)
      try {
        const response = await fetch('/api/announcements/targets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_type: targetType,
            target_section_ids: selectedSections,
            target_grade_levels: selectedGrades,
            target_course_ids: selectedCourses
          })
        })
        if (response.ok) {
          const data = await response.json()
          setPreviewCount(data.count || 0)
        }
      } catch (err) {
        console.error('Failed to fetch preview count:', err)
      } finally {
        setIsLoadingPreview(false)
      }
    }

    const debounce = setTimeout(fetchPreviewCount, 300)
    return () => clearTimeout(debounce)
  }, [targetType, selectedSections, selectedGrades, selectedCourses, schoolWideCount])

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!content.trim()) {
      setError('Content is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          target_type: targetType,
          target_section_ids: selectedSections,
          target_grade_levels: selectedGrades,
          target_course_ids: selectedCourses,
          priority,
          expires_at: expiresAt || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save draft')
      }

      const data = await response.json()
      onSuccess?.(data.announcement)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!content.trim()) {
      setError('Content is required')
      return
    }
    if (previewCount === 0) {
      setError('No students will receive this announcement. Please select targets.')
      return
    }

    setIsPublishing(true)
    setError(null)

    try {
      // First create the announcement
      const createResponse = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          target_type: targetType,
          target_section_ids: selectedSections,
          target_grade_levels: selectedGrades,
          target_course_ids: selectedCourses,
          priority,
          expires_at: expiresAt || null
        })
      })

      if (!createResponse.ok) {
        const data = await createResponse.json()
        throw new Error(data.error || 'Failed to create announcement')
      }

      const { announcement } = await createResponse.json()

      // Then publish it
      const publishResponse = await fetch(`/api/announcements/${announcement.id}/publish`, {
        method: 'POST'
      })

      if (!publishResponse.ok) {
        const data = await publishResponse.json()
        throw new Error(data.error || 'Failed to publish announcement')
      }

      const publishData = await publishResponse.json()
      onSuccess?.(publishData.announcement)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish announcement')
    } finally {
      setIsPublishing(false)
    }
  }

  const toggleSelection = (
    id: string,
    selected: string[],
    setSelected: (ids: string[]) => void
  ) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id))
    } else {
      setSelected([...selected, id])
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-primary">campaign</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Create Announcement
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Send a message to your students
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Upcoming Quiz Reminder"
              autoFocus
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement message here..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Send to <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'section' as TargetType, label: 'Sections', icon: 'groups' },
                { type: 'grade' as TargetType, label: 'Grade Levels', icon: 'school' },
                { type: 'course' as TargetType, label: 'Courses', icon: 'book' },
                { type: 'school' as TargetType, label: 'All Students', icon: 'domain' }
              ].map(({ type, label, icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTargetType(type)}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                    targetType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Selection */}
          {targetType === 'section' && (
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Select Sections
              </label>
              {isLoading ? (
                <div className="text-center py-4 text-slate-500">Loading sections...</div>
              ) : sections.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No sections available</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sections.map((section) => (
                    <label
                      key={section.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section.id)}
                        onChange={() => toggleSelection(section.id, selectedSections, setSelectedSections)}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {section.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          Grade {section.grade_level} • {section.student_count} students
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {targetType === 'grade' && (
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Select Grade Levels
              </label>
              {isLoading ? (
                <div className="text-center py-4 text-slate-500">Loading grades...</div>
              ) : gradeLevels.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No grade levels available</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gradeLevels.map((grade) => (
                    <button
                      key={grade.grade_level}
                      type="button"
                      onClick={() => toggleSelection(grade.grade_level, selectedGrades, setSelectedGrades)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        selectedGrades.includes(grade.grade_level)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium">Grade {grade.grade_level}</div>
                      <div className="text-xs opacity-70">{grade.student_count} students</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {targetType === 'course' && (
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Select Courses
              </label>
              {isLoading ? (
                <div className="text-center py-4 text-slate-500">Loading courses...</div>
              ) : courses.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No courses available</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {courses.map((course) => (
                    <label
                      key={course.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => toggleSelection(course.id, selectedCourses, setSelectedCourses)}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {course.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {course.section_name} • {course.student_count} enrolled
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {targetType === 'school' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <span className="material-symbols-outlined">info</span>
                <span>This announcement will be sent to all {schoolWideCount} students in your school.</span>
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {[
                { value: 'low' as Priority, label: 'Low', color: 'bg-slate-100 text-slate-700' },
                { value: 'normal' as Priority, label: 'Normal', color: 'bg-blue-100 text-blue-700' },
                { value: 'high' as Priority, label: 'High', color: 'bg-orange-100 text-orange-700' },
                { value: 'urgent' as Priority, label: 'Urgent', color: 'bg-red-100 text-red-700' }
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    priority === value
                      ? `${color} ring-2 ring-offset-2 ring-current`
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Expires (optional)
            </label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave empty for no expiration. Expired announcements will not be visible to students.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {/* Preview Count */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-slate-500">group</span>
              <span className="text-slate-600 dark:text-slate-400">
                {isLoadingPreview ? (
                  'Calculating...'
                ) : (
                  <>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{previewCount}</span>
                    {' '}student{previewCount !== 1 ? 's' : ''} will receive this announcement
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSaving || isPublishing}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving || isPublishing}>
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  Save as Draft
                </>
              )}
            </Button>
            <Button onClick={handlePublish} disabled={isSaving || isPublishing || previewCount === 0}>
              {isPublishing ? (
                <>
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                  Publishing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">send</span>
                  Publish Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
