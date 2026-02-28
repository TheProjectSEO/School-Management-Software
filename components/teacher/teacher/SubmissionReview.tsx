'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { SubmissionDetail } from '@/lib/dal/assessments'
import { authFetch } from "@/lib/utils/authFetch";

interface SubmissionReviewProps {
  submission: SubmissionDetail
}

export default function SubmissionReview({ submission }: SubmissionReviewProps) {
  const router = useRouter()
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Initialize scores from existing answer data or distribute AI score proportionally
  const [answerScores, setAnswerScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    const hasAnyScores = submission.answers.some(a => a.points_earned !== null || a.is_correct !== null)

    if (hasAnyScores) {
      // Use actual graded scores
      submission.answers.forEach(answer => {
        initial[answer.question_id] = answer.points_earned ?? (answer.is_correct ? answer.points : 0)
      })
    } else if (submission.ai_score !== null && submission.ai_score !== undefined && submission.answers.length > 0) {
      // Distribute AI score proportionally across questions
      const totalPossible = submission.answers.reduce((sum, a) => sum + a.points, 0)
      submission.answers.forEach(answer => {
        const proportion = totalPossible > 0 ? answer.points / totalPossible : 0
        initial[answer.question_id] = Math.round(submission.ai_score! * proportion)
      })
    } else {
      // Default: 0 for all
      submission.answers.forEach(answer => {
        initial[answer.question_id] = 0
      })
    }
    return initial
  })

  // Calculate total score
  const totalScore = Object.values(answerScores).reduce((sum, score) => sum + score, 0)
  const maxScore = submission.assessment.total_points
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  const updateAnswerScore = useCallback((questionId: string, points: number) => {
    setAnswerScores(prev => ({
      ...prev,
      [questionId]: points
    }))
  }, [])

  const handleGenerateAIFeedback = async () => {
    setIsGeneratingAI(true)
    setError(null)

    try {
      const response = await authFetch('/api/teacher/ai/grade-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI feedback')
      }

      const data = await response.json()
      if (data.success && data.suggestion) {
        setFeedback(data.suggestion.feedback || '')
        // Optionally apply AI suggested scores
        if (data.suggestion.suggested_points !== undefined) {
          // Distribute points proportionally if AI gives a total
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI feedback')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await authFetch(`/api/teacher/grading/${submission.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores: answerScores,
          feedback,
          totalScore,
          release: false
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save draft')
      }

      const data = await response.json()
      setSuccess(data.message || 'Draft saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save draft')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReleaseGrade = async () => {
    setIsReleasing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await authFetch(`/api/teacher/grading/${submission.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores: answerScores,
          feedback,
          totalScore,
          release: true
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to release grade')
      }

      const data = await response.json()
      setSuccess(data.message || 'Grade released successfully')

      // Navigate back after success
      setTimeout(() => {
        router.push('/teacher/submissions')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to release grade')
    } finally {
      setIsReleasing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              Review Submission
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {submission.assessment.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving || isReleasing}
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">save</span>
                Save Draft
              </>
            )}
          </Button>
          <Button
            onClick={handleReleaseGrade}
            disabled={isSaving || isReleasing}
          >
            {isReleasing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Releasing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">send</span>
                Release Grade
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Student Info */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {submission.student.avatar_url ? (
                <img
                  src={submission.student.avatar_url}
                  alt={submission.student.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-primary text-3xl">
                  person
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {submission.student.full_name}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                LRN: {submission.student.lrn}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Submitted
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
            <Badge variant="info">Attempt {submission.attempt_number}</Badge>
          </div>
        </div>
      </Card>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Student Submission */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Student Answers
            </h2>

            <div className="space-y-6">
              {submission.answers.map((answer, index) => {
                const currentScore = answerScores[answer.question_id] ?? 0
                return (
                  <div
                    key={answer.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default">Question {index + 1}</Badge>
                          <Badge variant="info">{answer.points} points</Badge>
                          {answer.is_correct !== null && (
                            <Badge variant={answer.is_correct ? 'success' : 'danger'}>
                              {answer.is_correct ? 'Correct' : 'Incorrect'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 font-medium">
                          {answer.question_text}
                        </p>
                      </div>
                    </div>

                    <div className="pl-4 border-l-4 border-slate-200 dark:border-slate-700">
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Student Answer:
                      </div>
                      <p className="text-slate-900 dark:text-slate-100">
                        {answer.text_answer || 'No answer provided'}
                      </p>
                    </div>

                    {/* Score input for all question types */}
                    <div className="mt-4 flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Points Earned:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={answer.points}
                        value={currentScore}
                        onChange={(e) => updateAnswerScore(
                          answer.question_id,
                          Math.min(answer.points, Math.max(0, parseInt(e.target.value) || 0))
                        )}
                        className="w-20 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary text-center"
                      />
                      <span className="text-slate-600 dark:text-slate-400">
                        / {answer.points}
                      </span>
                      {/* Quick score buttons */}
                      <div className="flex gap-1 ml-2">
                        <button
                          type="button"
                          onClick={() => updateAnswerScore(answer.question_id, 0)}
                          className="px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAnswerScore(answer.question_id, Math.floor(answer.points / 2))}
                          className="px-2 py-1 text-xs rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                        >
                          Half
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAnswerScore(answer.question_id, answer.points)}
                          className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                        >
                          Full
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right Panel: Grading */}
        <div className="space-y-6">
          {/* Score Summary */}
          <Card>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Score
            </h2>
            {submission.ai_score !== null && submission.ai_score !== undefined && submission.status !== 'graded' && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-700 dark:text-slate-200 mb-4">
                Draft AI score: {submission.ai_score}/{maxScore}
              </div>
            )}
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-primary mb-2">
                {totalScore}
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                / {maxScore} points
              </div>
              <div className="mt-4">
                <Badge
                  variant={percentage >= 75 ? 'success' : percentage >= 50 ? 'warning' : 'danger'}
                  className="text-lg px-4 py-2"
                >
                  {percentage}%
                </Badge>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  const newScores: Record<string, number> = {}
                  submission.answers.forEach(a => { newScores[a.question_id] = a.points })
                  setAnswerScores(newScores)
                }}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              >
                Give Full Marks
              </button>
              <button
                type="button"
                onClick={() => {
                  const newScores: Record<string, number> = {}
                  submission.answers.forEach(a => { newScores[a.question_id] = 0 })
                  setAnswerScores(newScores)
                }}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Reset All
              </button>
            </div>
          </Card>

          {/* Feedback */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Feedback
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAIFeedback}
                disabled={isGeneratingAI}
              >
                {isGeneratingAI ? (
                  <>
                    <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">smart_toy</span>
                    AI Draft
                  </>
                )}
              </Button>
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback for the student..."
              rows={8}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
