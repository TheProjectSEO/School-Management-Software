'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { SubmissionDetail } from '@/lib/dal/assessments'

interface SubmissionReviewProps {
  submission: SubmissionDetail
}

export default function SubmissionReview({ submission }: SubmissionReviewProps) {
  const router = useRouter()
  const [feedback, setFeedback] = useState(submission.feedback || '')
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({})
  const [totalScore, setTotalScore] = useState(submission.score ?? submission.ai_score ?? 0)

  const handleGenerateAIFeedback = async () => {
    // TODO: Implement AI feedback generation
    setFeedback('Great work! Your answers demonstrate a solid understanding of the concepts...')
  }

  const handleSaveDraft = async () => {
    console.log('Saving draft...', { feedback, rubricScores, totalScore })
  }

  const handleReleaseGrade = async () => {
    console.log('Releasing grade...', { feedback, rubricScores, totalScore })
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
          <Button variant="outline" onClick={handleSaveDraft}>
            <span className="material-symbols-outlined text-lg">save</span>
            Save Draft
          </Button>
          <Button onClick={handleReleaseGrade}>
            <span className="material-symbols-outlined text-lg">send</span>
            Release Grade
          </Button>
        </div>
      </div>

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
              {submission.answers.map((answer, index) => (
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

                  {answer.question_type === 'essay' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                        Points Earned
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={answer.points}
                        defaultValue={answer.points_earned || 0}
                        className="w-32 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="ml-2 text-slate-600 dark:text-slate-400">
                        / {answer.points}
                      </span>
                    </div>
                  )}
                </div>
              ))}
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
                Draft AI score: {submission.ai_score}/{submission.assessment.total_points}
              </div>
            )}
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-primary mb-2">
                {totalScore}
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                / {submission.assessment.total_points} points
              </div>
              <div className="mt-4">
                <Badge variant="success" className="text-lg px-4 py-2">
                  {Math.round((totalScore / submission.assessment.total_points) * 100)}%
                </Badge>
              </div>
            </div>
          </Card>

          {/* Rubric Scoring */}
          <Card>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Rubric Scoring
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Content Quality
                </label>
                <select
                  onChange={(e) => setRubricScores({ ...rubricScores, content: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select score...</option>
                  <option value="5">Excellent (5)</option>
                  <option value="4">Good (4)</option>
                  <option value="3">Satisfactory (3)</option>
                  <option value="2">Needs Improvement (2)</option>
                  <option value="1">Poor (1)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Organization
                </label>
                <select
                  onChange={(e) => setRubricScores({ ...rubricScores, organization: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select score...</option>
                  <option value="5">Excellent (5)</option>
                  <option value="4">Good (4)</option>
                  <option value="3">Satisfactory (3)</option>
                  <option value="2">Needs Improvement (2)</option>
                  <option value="1">Poor (1)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Clarity
                </label>
                <select
                  onChange={(e) => setRubricScores({ ...rubricScores, clarity: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select score...</option>
                  <option value="5">Excellent (5)</option>
                  <option value="4">Good (4)</option>
                  <option value="3">Satisfactory (3)</option>
                  <option value="2">Needs Improvement (2)</option>
                  <option value="1">Poor (1)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Feedback */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Feedback
              </h2>
              <Button variant="outline" size="sm" onClick={handleGenerateAIFeedback}>
                <span className="material-symbols-outlined text-base">smart_toy</span>
                AI Draft
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
