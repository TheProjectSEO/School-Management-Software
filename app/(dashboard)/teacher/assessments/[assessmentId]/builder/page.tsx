'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { authFetch } from "@/lib/utils/authFetch";

interface Assessment {
  id: string
  title: string
  description: string
  type: 'essay' | 'assignment' | 'short_quiz' | 'long_quiz' | 'exam' | 'quiz' | 'project' | 'midterm' | 'final'
  course_id: string
  available_from: string | null
  due_date: string | null
  time_limit_minutes: number | null
  max_attempts: number
  total_points: number
  instructions: string | null
  status: 'draft' | 'published'
  course?: { id: string; name: string }
  grading_period_id?: string
  requires_file_upload?: boolean
  file_upload_instructions?: string | null
  allowed_file_types?: string | null
  min_word_count?: number | null
  max_word_count?: number | null
}

interface QuestionOption {
  id: string
  option_text: string
  is_correct: boolean
  order_index: number
}

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  points: number
  order_index: number
  explanation?: string
  options?: QuestionOption[]
  correct_answer?: string  // for true_false: 'True' | 'False'
}

function makeBlankOptions(): QuestionOption[] {
  return [
    { id: `opt-${Date.now()}-1`, option_text: '', is_correct: true,  order_index: 0 },
    { id: `opt-${Date.now()}-2`, option_text: '', is_correct: false, order_index: 1 },
    { id: `opt-${Date.now()}-3`, option_text: '', is_correct: false, order_index: 2 },
    { id: `opt-${Date.now()}-4`, option_text: '', is_correct: false, order_index: 3 },
  ]
}

function isMC(type: string) {
  return type === 'multiple_choice'
}

export default function AssessmentBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const assessmentId = params.assessmentId as string

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'questions' | 'preview'>('questions')
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [gradingPeriods, setGradingPeriods] = useState<{ id: string; name: string; is_active: boolean }[]>([])
  const [loadingPeriods, setLoadingPeriods] = useState(false)

  useEffect(() => {
    async function loadPeriods() {
      setLoadingPeriods(true)
      try {
        const res = await authFetch('/api/teacher/grading-periods')
        if (!res.ok) return
        const data = await res.json()
        setGradingPeriods(data.periods || [])
      } catch (e) {
        console.error('Failed to load grading periods:', e)
      } finally {
        setLoadingPeriods(false)
      }
    }
    loadPeriods()
  }, [])

  useEffect(() => {
    loadAssessment()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId])

  const loadAssessment = async () => {
    try {
      setIsLoading(true)
      const response = await authFetch(`/api/teacher/assessments/${assessmentId}`)
      if (!response.ok) throw new Error('Failed to load assessment')
      const data = await response.json()
      setAssessment(data.assessment)

      // Transform questions from API format to component format
      const apiQuestions: any[] = data.assessment?.questions || []
      const transformedQuestions: Question[] = apiQuestions.map((q: any) => {
        let options: QuestionOption[] | undefined

        // Reconstruct options from choices_json (only for multiple_choice)
        // Handles two formats:
        //   Builder format:    choices_json = ["Option A", "Option B", ...]
        //   AI-planner format: choices_json = [{id:"a", text:"Option A", is_correct:true}, ...]
        if (isMC(q.question_type) && q.choices_json && Array.isArray(q.choices_json)) {
          const isObjectFormat = q.choices_json.length > 0 && typeof q.choices_json[0] === 'object' && q.choices_json[0] !== null
          if (isObjectFormat) {
            // AI-planner format
            const correctIds: string[] = q.answer_key_json?.correct_ids || []
            options = q.choices_json.map((choice: any, idx: number) => ({
              id: `${q.id}-opt-${idx}`,
              option_text: String(choice.text || ''),
              is_correct: Boolean(choice.is_correct) || correctIds.includes(choice.id),
              order_index: idx,
            }))
          } else {
            // Builder format (strings)
            const correctIndex = q.answer_key_json?.correctIndex ?? 0
            options = q.choices_json.map((choice: any, idx: number) => ({
              id: `${q.id}-opt-${idx}`,
              option_text: String(choice),
              is_correct: idx === correctIndex,
              order_index: idx,
            }))
          }
        } else if (isMC(q.question_type)) {
          // MC question with no saved choices yet — give blank options
          options = makeBlankOptions()
        }

        // Resolve correct_answer for true_false:
        //   Builder format:    answer_key_json = {correctAnswer: "True"}
        //   AI-planner format: answer_key_json = {correct_ids: ["true"]}
        let correctAnswer: string | undefined
        if (q.question_type === 'true_false') {
          if (q.answer_key_json?.correctAnswer) {
            correctAnswer = q.answer_key_json.correctAnswer
          } else if (q.answer_key_json?.correct_ids?.[0]) {
            const raw = String(q.answer_key_json.correct_ids[0])
            correctAnswer = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
          }
        }

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type as Question['question_type'],
          points: q.points || 1,
          order_index: q.order_index || 0,
          explanation: q.explanation || '',
          options,
          correct_answer: correctAnswer,
        }
      })

      setQuestions(transformedQuestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment')
    } finally {
      setIsLoading(false)
    }
  }

  const saveAssessment = async () => {
    if (!assessment) return

    // Validate before save
    for (const q of questions) {
      if (!q.question_text.trim()) {
        setError('All questions must have question text before saving.')
        return
      }
      if (isMC(q.question_type)) {
        const filled = q.options?.filter(o => String(o.option_text || '').trim()) || []
        if (filled.length < 2) {
          setError('Multiple choice questions need at least 2 filled-in options.')
          return
        }
      }
    }

    try {
      setIsSaving(true)
      setError(null)
      setSaveSuccess(false)

      // Build the questions payload
      const questionsPayload = questions.map((q, index) => {
        const isMultipleChoice = isMC(q.question_type)
        const filledOptions = isMultipleChoice
          ? (q.options || []).filter(o => String(o.option_text || '').trim())
          : []

        const isTF = q.question_type === 'true_false'
        return {
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          points: q.points,
          order_index: index,
          explanation: q.explanation || null,
          // choices_json only for multiple_choice — always store as strings
          choices_json: isMultipleChoice && filledOptions.length > 0
            ? filledOptions.map(o => String(o.option_text || ''))
            : null,
          // answer_key_json: correctIndex for MC, correctAnswer for TF, null otherwise
          answer_key_json: isMultipleChoice && filledOptions.length > 0
            ? { correctIndex: filledOptions.findIndex(o => o.is_correct) }
            : isTF && q.correct_answer
              ? { correctAnswer: q.correct_answer }
              : null,
        }
      })

      const response = await authFetch(`/api/teacher/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assessment.title,
          description: assessment.description,
          type: assessment.type,
          instructions: assessment.instructions,
          available_from: assessment.available_from,
          due_date: assessment.due_date,
          time_limit_minutes: assessment.time_limit_minutes,
          max_attempts: assessment.max_attempts,
          total_points: questions.reduce((sum, q) => sum + q.points, 0) || assessment.total_points,
          grading_period_id: assessment.grading_period_id,
          requires_file_upload: assessment.requires_file_upload ?? false,
          file_upload_instructions: assessment.file_upload_instructions ?? null,
          allowed_file_types: assessment.allowed_file_types ?? 'any',
          min_word_count: assessment.min_word_count ?? null,
          max_word_count: assessment.max_word_count ?? null,
          questions: questionsPayload,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save assessment')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      // Reload to sync IDs from DB
      await loadAssessment()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const publishAssessment = async () => {
    if (questions.length === 0) {
      setError('Add at least one question before publishing.')
      return
    }
    // Save first to make sure latest changes are committed
    await saveAssessment()
    try {
      setIsSaving(true)
      const response = await authFetch(`/api/teacher/assessments/${assessmentId}/publish`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to publish assessment')
      setAssessment(prev => prev ? { ...prev, status: 'published' } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setIsSaving(false)
    }
  }

  const unpublishAssessment = async () => {
    try {
      setIsSaving(true)
      const response = await authFetch(`/api/teacher/assessments/${assessmentId}/unpublish`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to unpublish assessment')
      setAssessment(prev => prev ? { ...prev, status: 'draft' } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish')
    } finally {
      setIsSaving(false)
    }
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice',
      points: 1,
      order_index: questions.length,
      explanation: '',
      options: makeBlankOptions(),
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions]
    const current = updated[index]

    // When type changes, adjust options appropriately
    if (updates.question_type && updates.question_type !== current.question_type) {
      if (isMC(updates.question_type)) {
        // Switching TO multiple_choice: add default options if none
        updates.options = current.options && current.options.length >= 2
          ? current.options
          : makeBlankOptions()
      } else {
        // Switching FROM multiple_choice: remove options
        updates.options = undefined
      }
    }

    updated[index] = { ...current, ...updates }
    setQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const addOption = (questionIndex: number) => {
    const updated = [...questions]
    const q = updated[questionIndex]
    const newOption: QuestionOption = {
      id: `opt-${Date.now()}-new`,
      option_text: '',
      is_correct: false,
      order_index: (q.options?.length || 0),
    }
    updated[questionIndex] = { ...q, options: [...(q.options || []), newOption] }
    setQuestions(updated)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions]
    const q = updated[questionIndex]
    const newOptions = (q.options || []).filter((_, i) => i !== optionIndex)
    // Ensure at least one option is correct
    if (!newOptions.some(o => o.is_correct) && newOptions.length > 0) {
      newOptions[0].is_correct = true
    }
    updated[questionIndex] = { ...q, options: newOptions }
    setQuestions(updated)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg">
          {error || 'Assessment not found'}
        </div>
        <Link href="/teacher/assessments" className="mt-4 inline-block text-primary hover:underline">
          Back to Assessments
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101822]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a2634] border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/teacher/assessments"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {assessment.title || 'Untitled Assessment'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                {assessment.course?.name} • {assessment.type} • {questions.length} question{questions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {assessment.status === 'published' ? (
              <>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  Published
                </span>
                <button
                  onClick={saveAssessment}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : saveSuccess ? '✓ Saved' : 'Save Changes'}
                </button>
                <button
                  onClick={unpublishAssessment}
                  disabled={isSaving}
                  className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg font-medium hover:bg-amber-200 dark:hover:bg-amber-800/30 transition-colors disabled:opacity-50"
                >
                  Unpublish
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={saveAssessment}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : saveSuccess ? '✓ Saved' : 'Save Draft'}
                </button>
                <button
                  onClick={publishAssessment}
                  disabled={isSaving || questions.length === 0}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-[#961517] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Publish
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error / success banner */}
        {error && (
          <div className="mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {(['settings', 'questions', 'preview'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* ── SETTINGS TAB ─────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title *</label>
              <input
                type="text"
                value={assessment.title}
                onChange={e => setAssessment({ ...assessment, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
              <textarea
                value={assessment.description || ''}
                onChange={e => setAssessment({ ...assessment, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Schedule */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                Schedule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Available From</label>
                  <input
                    type="datetime-local"
                    value={assessment.available_from ? new Date(assessment.available_from).toISOString().slice(0, 16) : ''}
                    onChange={e => setAssessment({ ...assessment, available_from: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">When students can start</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Due Date</label>
                  <input
                    type="datetime-local"
                    value={assessment.due_date ? new Date(assessment.due_date).toISOString().slice(0, 16) : ''}
                    onChange={e => setAssessment({ ...assessment, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Deadline for submissions</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Time Limit (minutes)</label>
                  <input
                    type="number"
                    value={assessment.time_limit_minutes || ''}
                    onChange={e => setAssessment({ ...assessment, time_limit_minutes: parseInt(e.target.value) || null })}
                    placeholder="No limit"
                    min={1}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Max Attempts</label>
                  <input
                    type="number"
                    value={assessment.max_attempts}
                    onChange={e => setAssessment({ ...assessment, max_attempts: parseInt(e.target.value) || 1 })}
                    min={1}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Assessment type */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">settings</span>
                Assessment Type
              </h3>
              <select
                value={assessment.type}
                onChange={e => setAssessment({ ...assessment, type: e.target.value as Assessment['type'] })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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

            {/* Grading Period */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Grading Period
              </h3>
              <select
                value={assessment.grading_period_id || ''}
                onChange={e => setAssessment({ ...assessment, grading_period_id: e.target.value || undefined })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Not tied to a grading period</option>
                {gradingPeriods.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.is_active ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Link this assessment to a quarter for DepEd grade computation</p>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Instructions</label>
              <textarea
                value={assessment.instructions || ''}
                onChange={e => setAssessment({ ...assessment, instructions: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* File Submission */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">attach_file</span>
                File Submission
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Allow students to upload files (essays, images, documents) as part of their submission.
              </p>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={assessment.requires_file_upload ?? false}
                    onChange={e => setAssessment({ ...assessment, requires_file_upload: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Require students to upload files
                  </span>
                </label>

                {assessment.requires_file_upload && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Allowed File Types
                      </label>
                      <select
                        value={assessment.allowed_file_types ?? 'any'}
                        onChange={e => setAssessment({ ...assessment, allowed_file_types: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="any">Any files (images, PDF, documents, etc.)</option>
                        <option value="images">Images only (JPG, PNG, GIF, WEBP)</option>
                        <option value="pdf">PDF only</option>
                        <option value="documents">Documents (PDF, DOC, DOCX)</option>
                        <option value="images,pdf">Images and PDF</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Upload Instructions <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <textarea
                        value={assessment.file_upload_instructions ?? ''}
                        onChange={e => setAssessment({ ...assessment, file_upload_instructions: e.target.value })}
                        rows={3}
                        placeholder="e.g. Upload your essay as a PDF. Maximum 3 files, 10MB each."
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Word Count — only for essay type */}
            {assessment.type === 'essay' && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">text_fields</span>
                  Word Count Requirement
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Set minimum and/or maximum word count for essay answers. Students will see a live word counter.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Min Words</label>
                    <input
                      type="number"
                      min={0}
                      value={assessment.min_word_count ?? ''}
                      onChange={e => setAssessment({ ...assessment, min_word_count: parseInt(e.target.value) || null })}
                      placeholder="No minimum"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Max Words</label>
                    <input
                      type="number"
                      min={0}
                      value={assessment.max_word_count ?? ''}
                      onChange={e => setAssessment({ ...assessment, max_word_count: parseInt(e.target.value) || null })}
                      placeholder="No maximum"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── QUESTIONS TAB ─────────────────────────────────── */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            {questions.length === 0 && (
              <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">quiz</span>
                <p className="text-slate-500 dark:text-slate-400 font-medium">No questions yet</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Click "Add Question" below to get started</p>
              </div>
            )}

            {questions.map((question, index) => (
              <div
                key={question.id}
                className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6"
              >
                {/* Question header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Question {index + 1}
                  </span>
                  <button
                    onClick={() => removeQuestion(index)}
                    className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove question"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>

                {/* Question text */}
                <textarea
                  value={question.question_text}
                  onChange={e => updateQuestion(index, { question_text: e.target.value })}
                  placeholder="Enter your question…"
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-4 resize-none"
                />

                {/* Type + points row */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Question Type</label>
                    <select
                      value={question.question_type}
                      onChange={e => updateQuestion(index, { question_type: e.target.value as Question['question_type'] })}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="essay">Essay</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Points</label>
                    <input
                      type="number"
                      value={question.points}
                      onChange={e => updateQuestion(index, { points: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                      min={1}
                    />
                  </div>
                </div>

                {/* Multiple choice options */}
                {question.question_type === 'multiple_choice' && (
                  <div className="space-y-2 mb-4">
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Answer Choices <span className="text-slate-400">(select the correct one)</span>
                    </label>
                    {(question.options || []).map((option, optIndex) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={option.is_correct}
                          onChange={() => {
                            const newOptions = (question.options || []).map((o, i) => ({
                              ...o,
                              is_correct: i === optIndex,
                            }))
                            updateQuestion(index, { options: newOptions })
                          }}
                          className="text-primary accent-primary shrink-0"
                          title="Mark as correct answer"
                        />
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={e => {
                            const newOptions = [...(question.options || [])]
                            newOptions[optIndex] = { ...newOptions[optIndex], option_text: e.target.value }
                            updateQuestion(index, { options: newOptions })
                          }}
                          placeholder={`Option ${optIndex + 1}`}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                        />
                        {(question.options || []).length > 2 && (
                          <button
                            onClick={() => removeOption(index, optIndex)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                            title="Remove option"
                          >
                            <span className="material-symbols-outlined text-base">remove_circle</span>
                          </button>
                        )}
                      </div>
                    ))}
                    {(question.options || []).length < 6 && (
                      <button
                        onClick={() => addOption(index)}
                        className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                        Add option
                      </button>
                    )}
                  </div>
                )}

                {/* True/False options */}
                {question.question_type === 'true_false' && (
                  <div className="space-y-2 mb-4">
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Correct Answer</label>
                    <div className="flex gap-4">
                      {['True', 'False'].map(val => (
                        <label key={val} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`tf-${question.id}`}
                            checked={question.correct_answer === val}
                            onChange={() => updateQuestion(index, { correct_answer: val })}
                            className="accent-primary"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Short answer / Essay hint */}
                {(question.question_type === 'short_answer' || question.question_type === 'essay') && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3 mb-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-base align-middle mr-1">edit_note</span>
                    {question.question_type === 'short_answer'
                      ? 'Students will type a short text answer. You will grade it manually.'
                      : 'Students will write an essay. You will grade it manually.'}
                  </div>
                )}

                {/* Explanation (optional) */}
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Explanation <span className="font-normal">(shown to students after grading)</span>
                  </label>
                  <input
                    type="text"
                    value={question.explanation || ''}
                    onChange={e => updateQuestion(index, { explanation: e.target.value })}
                    placeholder="Optional: explain the correct answer…"
                    className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <span className="material-symbols-outlined">add</span>
              Add Question
            </button>
          </div>
        )}

        {/* ── PREVIEW TAB ─────────────────────────────────── */}
        {activeTab === 'preview' && (
          <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {assessment.title}
            </h2>
            {assessment.description && (
              <p className="text-slate-600 dark:text-slate-400 mb-4">{assessment.description}</p>
            )}
            {assessment.instructions && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">Instructions</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{assessment.instructions}</p>
              </div>
            )}
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {questions.length} question{questions.length !== 1 ? 's' : ''} •{' '}
              {questions.reduce((s, q) => s + q.points, 0)} total points
            </div>
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="border-b border-slate-200 dark:border-slate-700 pb-6 last:border-0">
                  <p className="font-medium text-slate-900 dark:text-white mb-3">
                    {index + 1}. {question.question_text || '(No question text)'}
                    <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                      ({question.points} pt{question.points !== 1 ? 's' : ''})
                    </span>
                  </p>
                  {question.question_type === 'multiple_choice' && question.options && (
                    <div className="space-y-2 ml-4">
                      {question.options.map((option, optIndex) => (
                        <label key={option.id} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <input type="radio" name={`preview-${question.id}`} disabled />
                          {option.option_text || `Option ${optIndex + 1}`}
                          {option.is_correct && (
                            <span className="text-xs text-green-600 font-semibold">(correct)</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  {question.question_type === 'true_false' && (
                    <div className="flex gap-4 ml-4">
                      <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <input type="radio" disabled /> True
                      </label>
                      <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <input type="radio" disabled /> False
                      </label>
                    </div>
                  )}
                  {question.question_type === 'short_answer' && (
                    <div className="ml-4 h-10 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700" />
                  )}
                  {question.question_type === 'essay' && (
                    <div className="ml-4 h-24 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700" />
                  )}
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-slate-400 dark:text-slate-500 text-center py-8">No questions added yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
