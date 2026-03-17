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
  type: 'quiz' | 'assignment' | 'exam'
  course_id: string
  available_from: string | null
  due_date: string | null
  time_limit_minutes: number | null
  max_attempts: number
  total_points: number
  instructions: string | null
  status: 'draft' | 'published'
  course?: {
    id: string
    name: string
  }
}

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  points: number
  order_index: number
  correct_answer?: string
  explanation?: string
  options?: {
    id: string
    option_text: string
    is_correct: boolean
    order_index: number
  }[]
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

  useEffect(() => {
    loadAssessment()
  }, [assessmentId])

  const loadAssessment = async () => {
    try {
      setIsLoading(true)
      const response = await authFetch(`/api/teacher/assessments/${assessmentId}`)
      if (!response.ok) throw new Error('Failed to load assessment')
      const data = await response.json()
      setAssessment(data.assessment)

      // Transform questions from API format to component format
      const apiQuestions = data.assessment?.questions || []
      const transformedQuestions: Question[] = apiQuestions.map((q: any) => {
        // Convert choices_json to options format
        let options: Question['options'] = []
        if (q.choices_json && Array.isArray(q.choices_json)) {
          const correctIndex = q.answer_key_json?.correctIndex ?? q.answer_key_json?.correct ?? 0
          options = q.choices_json.map((choice: string, idx: number) => ({
            id: `${q.id}-opt-${idx}`,
            option_text: choice,
            is_correct: idx === correctIndex,
            order_index: idx
          }))
        }

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points || 1,
          order_index: q.order_index || 0,
          options
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
    try {
      setIsSaving(true)
      setError(null)

      // Transform questions to the format expected by the API
      const questionsPayload = questions.map((q, index) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order_index: index,
        choices_json: q.options?.map(opt => opt.option_text) || null,
        answer_key_json: q.options ? {
          correctIndex: q.options.findIndex(opt => opt.is_correct)
        } : null,
      }))

      const response = await authFetch(`/api/teacher/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assessment.title,
          type: assessment.type,
          instructions: assessment.instructions,
          available_from: assessment.available_from,
          due_date: assessment.due_date,
          time_limit_minutes: assessment.time_limit_minutes,
          max_attempts: assessment.max_attempts,
          total_points: questions.reduce((sum, q) => sum + q.points, 0),
          questions: questionsPayload
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save assessment')
      }

      // Reload to get the saved questions with proper IDs
      await loadAssessment()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const publishAssessment = async () => {
    try {
      setIsSaving(true)
      const response = await authFetch(`/api/teacher/assessments/${assessmentId}/publish`, {
        method: 'POST'
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
        method: 'POST'
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
      question_type: 'true_false', // Using true_false as it's accepted by DB constraint
      points: 1,
      order_index: questions.length + 1,
      options: [
        { id: `opt-${Date.now()}-1`, option_text: '', is_correct: true, order_index: 1 },
        { id: `opt-${Date.now()}-2`, option_text: '', is_correct: false, order_index: 2 },
        { id: `opt-${Date.now()}-3`, option_text: '', is_correct: false, order_index: 3 },
        { id: `opt-${Date.now()}-4`, option_text: '', is_correct: false, order_index: 4 },
      ]
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], ...updates }
    setQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !assessment) {
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
                {assessment.course?.name} • {assessment.type}
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
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={unpublishAssessment}
                  disabled={isSaving}
                  className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg font-medium hover:bg-amber-200 dark:hover:bg-amber-800/30 transition-colors"
                >
                  Unpublish
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={saveAssessment}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={publishAssessment}
                  disabled={isSaving || questions.length === 0}
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-[#961517] transition-colors disabled:opacity-50"
                >
                  Publish
                </button>
              </>
            )}
          </div>
        </div>

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
      <div className="max-w-4xl mx-auto">
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={assessment.title}
                onChange={e => setAssessment({ ...assessment, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={assessment.description || ''}
                onChange={e => setAssessment({ ...assessment, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            {/* Schedule Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                Schedule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Available From
                  </label>
                  <input
                    type="datetime-local"
                    value={assessment.available_from ? new Date(assessment.available_from).toISOString().slice(0, 16) : ''}
                    onChange={e => setAssessment({ ...assessment, available_from: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    When students can start taking this assessment
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={assessment.due_date ? new Date(assessment.due_date).toISOString().slice(0, 16) : ''}
                    onChange={e => setAssessment({ ...assessment, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Deadline for submissions
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={assessment.time_limit_minutes || ''}
                    onChange={e => setAssessment({ ...assessment, time_limit_minutes: parseInt(e.target.value) || null })}
                    placeholder="No limit"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Leave empty for no time limit
                  </p>
                </div>
              </div>
            </div>

            {/* Settings Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">settings</span>
                Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    value={assessment.max_attempts}
                    onChange={e => setAssessment({ ...assessment, max_attempts: parseInt(e.target.value) || 1 })}
                    min={1}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Number of times students can retake
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Assessment Type
                  </label>
                  <select
                    value={assessment.type}
                    onChange={e => setAssessment({ ...assessment, type: e.target.value as Assessment['type'] })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Instructions
              </label>
              <textarea
                value={assessment.instructions || ''}
                onChange={e => setAssessment({ ...assessment, instructions: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Question {index + 1}
                  </span>
                  <button
                    onClick={() => removeQuestion(index)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
                <textarea
                  value={question.question_text}
                  onChange={e => updateQuestion(index, { question_text: e.target.value })}
                  placeholder="Enter your question..."
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-4"
                />
                <div className="flex gap-4 mb-4">
                  <select
                    value={question.question_type}
                    onChange={e => updateQuestion(index, { question_type: e.target.value as Question['question_type'] })}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  >
                    <option value="true_false">Multiple Choice</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="essay">Essay</option>
                  </select>
                  <input
                    type="number"
                    value={question.points}
                    onChange={e => updateQuestion(index, { points: parseInt(e.target.value) || 1 })}
                    className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    min={1}
                  />
                  <span className="text-sm text-slate-500 dark:text-slate-400 self-center">points</span>
                </div>
                {question.question_type === 'true_false' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={option.is_correct}
                          onChange={() => {
                            const newOptions = question.options!.map((o, i) => ({
                              ...o,
                              is_correct: i === optIndex
                            }))
                            updateQuestion(index, { options: newOptions })
                          }}
                          className="text-primary"
                        />
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={e => {
                            const newOptions = [...question.options!]
                            newOptions[optIndex] = { ...newOptions[optIndex], option_text: e.target.value }
                            updateQuestion(index, { options: newOptions })
                          }}
                          placeholder={`Option ${optIndex + 1}`}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={addQuestion}
              className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Add Question
            </button>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {assessment.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {assessment.description}
            </p>
            {assessment.instructions && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">Instructions</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{assessment.instructions}</p>
              </div>
            )}
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="border-b border-slate-200 dark:border-slate-700 pb-6 last:border-0">
                  <p className="font-medium text-slate-900 dark:text-white mb-3">
                    {index + 1}. {question.question_text || '(No question text)'}
                    <span className="ml-2 text-sm text-slate-500">({question.points} pts)</span>
                  </p>
                  {question.question_type === 'true_false' && question.options && (
                    <div className="space-y-2 ml-4">
                      {question.options.map((option, optIndex) => (
                        <label key={option.id} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <input type="radio" name={`preview-${question.id}`} disabled />
                          {option.option_text || `Option ${optIndex + 1}`}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
