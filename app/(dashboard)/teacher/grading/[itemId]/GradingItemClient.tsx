'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from "@/lib/utils/authFetch";

interface GradingItem {
  id: string
  submission: {
    id: string
    submitted_at: string
    attempt_number: number
    status: string
    score: number | null
    feedback: string | null
  }
  student: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
  }
  assessment: {
    id: string
    title: string
    type: string
    total_points: number
    course: {
      id: string
      name: string
    }
  }
  answers: {
    id: string
    question_id: string
    question_text: string
    question_type: string
    points: number
    selected_option_id: string | null
    text_answer: string | null
    is_correct: boolean | null
    points_earned: number | null
    correct_answer?: string
    options?: {
      id: string
      option_text: string
      is_correct: boolean
    }[]
  }[]
  rubric?: {
    id: string
    title: string
    criteria: {
      id: string
      name: string
      description: string
      max_points: number
    }[]
  }
}

interface GradingItemClientProps {
  item: GradingItem
}

export default function GradingItemClient({ item }: GradingItemClientProps) {
  const router = useRouter()
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    item.answers.forEach(answer => {
      initial[answer.question_id] = answer.points_earned ?? 0
    })
    return initial
  })
  const [feedback, setFeedback] = useState(item.submission.feedback || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)

  const totalEarned = Object.values(scores).reduce((sum, score) => sum + score, 0)
  const percentage = Math.round((totalEarned / item.assessment.total_points) * 100)

  const handleScoreChange = (questionId: string, value: number, maxPoints: number) => {
    setScores(prev => ({
      ...prev,
      [questionId]: Math.min(Math.max(0, value), maxPoints)
    }))
  }

  const saveGrades = async (release: boolean = false) => {
    try {
      if (release) {
        setIsReleasing(true)
      } else {
        setIsSaving(true)
      }

      const response = await authFetch(`/api/teacher/grading/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores,
          feedback,
          totalScore: totalEarned,
          release
        })
      })

      if (!response.ok) throw new Error('Failed to save grades')

      if (release) {
        router.push('/teacher/grading')
      }
    } catch (error) {
      console.error('Failed to save grades:', error)
    } finally {
      setIsSaving(false)
      setIsReleasing(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/teacher/grading"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Grade Submission
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {item.assessment.title} • {item.assessment.course.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveGrades(false)}
            disabled={isSaving || isReleasing}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => saveGrades(true)}
            disabled={isSaving || isReleasing}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-[#961517] transition-colors disabled:opacity-50"
          >
            {isReleasing ? 'Releasing...' : 'Release Grade'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Student Info */}
          <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {item.student.avatar_url ? (
                  <img src={item.student.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <span className="text-primary font-medium">
                    {item.student.full_name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {item.student.full_name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Submitted {new Date(item.submission.submitted_at).toLocaleString()}
                  {item.submission.attempt_number > 1 && ` • Attempt ${item.submission.attempt_number}`}
                </p>
              </div>
            </div>
          </div>

          {/* Answers */}
          {item.answers.map((answer, index) => (
            <div
              key={answer.id}
              className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Question {index + 1}
                  </span>
                  <p className="mt-1 text-slate-900 dark:text-white font-medium">
                    {answer.question_text}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <input
                    type="number"
                    value={scores[answer.question_id] ?? 0}
                    onChange={e => handleScoreChange(answer.question_id, parseInt(e.target.value) || 0, answer.points)}
                    className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    min={0}
                    max={answer.points}
                  />
                  <span className="text-slate-500 dark:text-slate-400">/ {answer.points}</span>
                </div>
              </div>

              {/* Student's Answer */}
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Student's Answer:
                </p>
                {answer.question_type === 'multiple_choice' && answer.options ? (
                  <div className="space-y-2">
                    {answer.options.map(option => (
                      <div
                        key={option.id}
                        className={`flex items-center gap-2 p-2 rounded ${
                          option.id === answer.selected_option_id
                            ? option.is_correct
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : option.is_correct
                              ? 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-500'
                              : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {option.id === answer.selected_option_id
                            ? option.is_correct ? 'check_circle' : 'cancel'
                            : option.is_correct ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                        {option.option_text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-900 dark:text-white">
                    {answer.text_answer || '(No answer provided)'}
                  </p>
                )}
              </div>

              {answer.correct_answer && answer.question_type !== 'multiple_choice' && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Correct Answer: {answer.correct_answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Grading Panel */}
        <div className="space-y-4">
          {/* Score Summary */}
          <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6 sticky top-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Score Summary
            </h3>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-primary">
                {totalEarned}
                <span className="text-xl text-slate-400">/{item.assessment.total_points}</span>
              </div>
              <div className={`text-lg font-medium ${
                percentage >= 90 ? 'text-green-600' :
                percentage >= 70 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {percentage}%
              </div>
            </div>

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Feedback
              </label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={6}
                placeholder="Provide feedback for the student..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none"
              />
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <button
                onClick={() => {
                  const fullScore: Record<string, number> = {}
                  item.answers.forEach(a => { fullScore[a.question_id] = a.points })
                  setScores(fullScore)
                }}
                className="w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <span className="material-symbols-outlined text-lg align-middle mr-2">done_all</span>
                Give Full Marks
              </button>
              <button
                onClick={() => {
                  const zeroScore: Record<string, number> = {}
                  item.answers.forEach(a => { zeroScore[a.question_id] = 0 })
                  setScores(zeroScore)
                }}
                className="w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <span className="material-symbols-outlined text-lg align-middle mr-2">restart_alt</span>
                Reset All Scores
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
