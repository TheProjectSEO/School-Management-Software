'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/utils/authFetch'

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
  const [lessons, setLessons] = useState<LessonOption[]>([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: 'quiz' as 'quiz' | 'assignment' | 'project' | 'midterm' | 'final',
    course_id: '',
    lesson_id: '',
    section_id: ''
  })

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
    const selectedSubject = subjects.find(s => s.id === e.target.value)
    setFormData({
      ...formData,
      course_id: e.target.value,
      lesson_id: '',
      section_id: selectedSubject?.section_id || ''
    })
  }

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.course_id) return

    setIsCreating(true)
    try {
      const response = await authFetch('/api/teacher/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          type: formData.type,
          course_id: formData.course_id,
          lesson_id: formData.lesson_id || null,
          section_id: formData.section_id,
          status: 'draft',
          total_points: 100,
          max_attempts: 1
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
    } finally {
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
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter assessment title"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="project">Project</option>
                  <option value="midterm">Midterm Exam</option>
                  <option value="final">Final Exam</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <select
                  value={formData.course_id}
                  onChange={handleSubjectChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} - {subject.section_name} (Grade {subject.grade_level})
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Lesson */}
              {formData.course_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Linked Lesson <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={formData.lesson_id}
                    onChange={(e) => setFormData({ ...formData, lesson_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loadingLessons}
                  >
                    <option value="">{loadingLessons ? 'Loading lessons...' : 'None (course-level)'}</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.module_title ? `${lesson.module_title} — ` : ''}{lesson.title}
                      </option>
                    ))}
                  </select>
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
                disabled={isCreating || !formData.title.trim() || !formData.course_id}
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
