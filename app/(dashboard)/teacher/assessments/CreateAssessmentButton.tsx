'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from "@/lib/utils/authFetch";

interface GradingPeriod {
  id: string
  name: string
  is_active: boolean
}

interface Subject {
  id: string
  name: string
  subject_code: string
  section_id: string
  section_name: string
  grade_level: string
}

interface LessonOption {
  id: string
  title: string
  module_title?: string
}

interface CreateAssessmentButtonProps {
  subjects: Subject[]
}

export default function CreateAssessmentButton({ subjects }: CreateAssessmentButtonProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const isCreatingRef = useRef(false) // synchronous guard against double-submit
  const idempotencyKeyRef = useRef<string>('')
  const [lessons, setLessons] = useState<LessonOption[]>([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [gradingPeriods, setGradingPeriods] = useState<GradingPeriod[]>([])
  const [loadingPeriods, setLoadingPeriods] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: 'short_quiz' as 'essay' | 'assignment' | 'short_quiz' | 'long_quiz' | 'exam',
    course_id: '',
    lesson_id: '',
    section_id: '',
    grading_period_id: '',
    grade_level: '',
    topic: '',
  })

  // Unique sorted grade levels from teacher's assigned subjects
  const uniqueGradeLevels = Array.from(new Set(subjects.map(s => s.grade_level).filter(Boolean)))
    .sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b)
      return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb
    })

  // Sections for the selected grade level
  const sectionsForGrade = Array.from(
    new Map(
      subjects
        .filter(s => s.grade_level === formData.grade_level)
        .map(s => [s.section_id, { id: s.section_id, name: s.section_name }])
    ).values()
  )

  // Courses for the selected section
  const coursesForSection = Array.from(
    new Map(
      subjects
        .filter(s => s.section_id === formData.section_id)
        .map(s => [s.id, { id: s.id, name: s.name, subject_code: s.subject_code }])
    ).values()
  )

  useEffect(() => {
    if (!isModalOpen) return
    async function loadPeriods() {
      setLoadingPeriods(true)
      try {
        const res = await authFetch('/api/teacher/grading-periods')
        if (!res.ok) return
        const data = await res.json()
        setGradingPeriods(data.periods || [])
        // Auto-select the active period if there is one
        const active = (data.periods || []).find((p: GradingPeriod) => p.is_active)
        if (active) {
          setFormData(prev => ({ ...prev, grading_period_id: active.id }))
        }
      } catch (error) {
        console.error('Failed to load grading periods:', error)
      } finally {
        setLoadingPeriods(false)
      }
    }
    loadPeriods()
  }, [isModalOpen])

  // Load lessons when course changes
  useEffect(() => {
    if (!formData.course_id) {
      setLessons([])
      return
    }
    async function loadLessons() {
      setLoadingLessons(true)
      try {
        const res = await authFetch(`/api/teacher/content/modules?course_id=${formData.course_id}&include_lessons=true`)
        if (!res.ok) return
        const data = await res.json()
        const list: LessonOption[] = []
        for (const mod of data.modules || []) {
          for (const lesson of mod.lessons || []) {
            list.push({ id: lesson.id, title: lesson.title, module_title: mod.title })
          }
        }
        setLessons(list)
      } catch (error) {
        console.error('Failed to load lessons:', error)
      } finally {
        setLoadingLessons(false)
      }
    }
    loadLessons()
  }, [formData.course_id])

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value
    setFormData({ ...formData, course_id: courseId, lesson_id: '' })
  }

  const typeLabels: Record<string, string> = {
    essay: 'Essay', assignment: 'Assignment',
    short_quiz: 'Short Quiz', long_quiz: 'Long Quiz', exam: 'Exam',
  }

  const handleCreate = async () => {
    // Auto-generate title from topic if left blank
    const resolvedTitle = formData.title.trim() ||
      (formData.topic.trim()
        ? `${formData.topic.trim()} ${typeLabels[formData.type] ?? formData.type}`
        : '')
    if (!resolvedTitle || !formData.course_id || !formData.section_id) return
    if (isCreatingRef.current) return // synchronous guard
    isCreatingRef.current = true

    // Generate a stable idempotency key for this create attempt
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }

    setIsCreating(true)
    try {
      const response = await authFetch('/api/teacher/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: resolvedTitle,
          type: formData.type,
          course_id: formData.course_id,
          lesson_id: formData.lesson_id || null,
          section_id: formData.section_id,
          description: formData.topic.trim() || null,
          status: 'draft',
          total_points: 100,
          max_attempts: 1,
          grading_period_id: formData.grading_period_id || null,
          idempotency_key: idempotencyKeyRef.current,
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create assessment')
      }

      const { assessment } = await response.json()
      setIsModalOpen(false)
      router.push(`/teacher/assessments/${assessment.id}/builder`)
    } catch (error) {
      console.error('Error creating assessment:', error)
      alert(error instanceof Error ? error.message : 'Failed to create assessment')
      idempotencyKeyRef.current = '' // reset so user can retry
    } finally {
      isCreatingRef.current = false
      setIsCreating(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
      >
        <span className="material-symbols-outlined text-lg">add</span>
        Create Assessment
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isCreating && setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Create New Assessment
            </h2>

            <div className="space-y-4">
              {/* Step 1: Grade Level */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Grade Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.grade_level}
                  onChange={(e) => setFormData({ ...formData, grade_level: e.target.value, section_id: '', course_id: '', lesson_id: '' })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select grade level</option>
                  {uniqueGradeLevels.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Section (filtered by grade) */}
              {formData.grade_level && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.section_id}
                    onChange={(e) => setFormData({ ...formData, section_id: e.target.value, course_id: '', lesson_id: '' })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">{sectionsForGrade.length === 0 ? 'No sections for this grade' : 'Select section'}</option>
                    {sectionsForGrade.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 3: Subject (filtered by section) */}
              {formData.section_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.course_id}
                    onChange={handleSubjectChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">{coursesForSection.length === 0 ? 'No subjects for this section' : 'Select subject'}</option>
                    {coursesForSection.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.subject_code})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 4: Topic */}
              {formData.course_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Topic / Coverage <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g., Quadratic Equations, World War II, Cell Division"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              )}

              {/* Step 5: Lesson (filtered by subject) */}
              {formData.course_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Lesson <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={formData.lesson_id}
                    onChange={(e) => setFormData({ ...formData, lesson_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loadingLessons}
                  >
                    <option value="">{loadingLessons ? 'Loading...' : 'None (not tied to a lesson)'}</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.module_title ? `${lesson.module_title} — ` : ''}{lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 6: Type + Grading Period (side by side) */}
              {formData.course_id && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <optgroup label="Written Work">
                        <option value="essay">Essay</option>
                        <option value="assignment">Assignment</option>
                      </optgroup>
                      <optgroup label="Performance Task">
                        <option value="short_quiz">Short Quiz</option>
                        <option value="long_quiz">Long Quiz</option>
                      </optgroup>
                      <optgroup label="Quarterly Assessment">
                        <option value="exam">Exam</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Grading Period
                    </label>
                    <select
                      value={formData.grading_period_id}
                      onChange={(e) => setFormData({ ...formData, grading_period_id: e.target.value })}
                      disabled={loadingPeriods}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">{loadingPeriods ? 'Loading...' : 'None'}</option>
                      {gradingPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name}{period.is_active ? ' ✓' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 7: Title (auto-filled from topic, always editable) */}
              {formData.course_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Title <span className="text-slate-400 font-normal">(auto-filled from topic)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={formData.topic ? `${formData.topic} ${typeLabels[formData.type] ?? formData.type}` : 'Enter assessment title'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {!formData.title && formData.topic && (
                    <p className="text-xs text-slate-400 mt-1">Leave blank to use &ldquo;{formData.topic} {typeLabels[formData.type] ?? formData.type}&rdquo;</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isCreating}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || (!formData.title.trim() && !formData.topic.trim()) || !formData.course_id || !formData.section_id}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">add</span>
                    Create & Edit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
