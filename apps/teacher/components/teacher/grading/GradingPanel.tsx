'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import GradingRubric from './GradingRubric'
import { GradingQueueItem } from '@/lib/dal/grading-queue'

interface AIGradingSuggestion {
  suggested_points: number
  max_points: number
  percentage: number
  feedback: string
  strengths: string[]
  improvements: string[]
  rubric_scores: Record<string, number> | null
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

interface GradingPanelProps {
  item: GradingQueueItem | null
  questionDetails?: {
    question_text: string
    question_type: string
    choices_json: any
    answer_key_json: any
    points: number
  } | null
  onGrade: (itemId: string, points: number, feedback: string) => Promise<void>
  onFlag: (itemId: string, reason: string) => Promise<void>
  onNext: () => void
  onClose?: () => void
  loading?: boolean
}

const questionTypeLabels: Record<string, string> = {
  multiple_choice_single: 'Multiple Choice (Single)',
  multiple_choice_multi: 'Multiple Choice (Multiple)',
  true_false: 'True/False',
  short_answer: 'Short Answer',
  matching: 'Matching',
  fill_in_blank: 'Fill in the Blank',
  essay: 'Essay',
  ordering: 'Ordering'
}

function formatStudentResponse(response: string | null, questionType: string, choices?: any[]): React.ReactNode {
  if (!response) {
    return (
      <div className="text-slate-400 italic flex items-center gap-2">
        <span className="material-symbols-rounded text-lg">do_not_disturb</span>
        No response provided
      </div>
    )
  }

  // Try to parse JSON response
  let parsedResponse: any = response
  try {
    parsedResponse = JSON.parse(response)
  } catch {
    // Keep as string if not valid JSON
  }

  switch (questionType) {
    case 'multiple_choice_single':
    case 'multiple_choice_multi':
      // Show selected choice(s)
      const selectedIds = Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse]

      if (choices && Array.isArray(choices)) {
        const selectedChoices = choices.filter(c => selectedIds.includes(c.id))
        return (
          <div className="space-y-2">
            {selectedChoices.length > 0 ? (
              selectedChoices.map((choice, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <span className="material-symbols-rounded text-blue-500">check_circle</span>
                  <span className="text-slate-700 dark:text-slate-300">{choice.text || choice.label || choice.id}</span>
                </div>
              ))
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <code className="text-sm">{response}</code>
              </div>
            )}
          </div>
        )
      }
      return (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <code className="text-sm">{response}</code>
        </div>
      )

    case 'true_false':
      const boolValue = typeof parsedResponse === 'boolean'
        ? parsedResponse
        : String(parsedResponse).toLowerCase() === 'true'
      return (
        <div className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold',
          boolValue
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        )}>
          <span className="material-symbols-rounded">
            {boolValue ? 'check_circle' : 'cancel'}
          </span>
          {boolValue ? 'TRUE' : 'FALSE'}
        </div>
      )

    case 'short_answer':
    case 'essay':
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {response}
          </p>
        </div>
      )

    case 'matching':
      if (typeof parsedResponse === 'object' && !Array.isArray(parsedResponse)) {
        return (
          <div className="space-y-2">
            {Object.entries(parsedResponse).map(([leftId, rightId], index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
              >
                <code className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-sm">
                  {leftId}
                </code>
                <span className="material-symbols-rounded text-slate-400">arrow_forward</span>
                <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-sm text-blue-700 dark:text-blue-400">
                  {String(rightId)}
                </code>
              </div>
            ))}
          </div>
        )
      }
      return (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <code className="text-sm">{response}</code>
        </div>
      )

    case 'fill_in_blank':
    case 'ordering':
      if (Array.isArray(parsedResponse)) {
        return (
          <div className="space-y-2">
            {parsedResponse.map((answer, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"
              >
                <span className="text-sm font-medium text-slate-500 w-6">
                  {index + 1}.
                </span>
                <span className="text-slate-700 dark:text-slate-300">{answer}</span>
              </div>
            ))}
          </div>
        )
      }
      return (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <code className="text-sm">{response}</code>
        </div>
      )

    default:
      return (
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">{response}</pre>
        </div>
      )
  }
}

export default function GradingPanel({
  item,
  questionDetails,
  onGrade,
  onFlag,
  onNext,
  onClose,
  loading = false
}: GradingPanelProps) {
  const [points, setPoints] = useState<number>(0)
  const [feedback, setFeedback] = useState<string>('')
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [flagReason, setFlagReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // AI Grading state
  const [aiSuggestion, setAiSuggestion] = useState<AIGradingSuggestion | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAISuggestion, setShowAISuggestion] = useState(false)

  // Check if AI grading is available for this question type
  const isAIGradingAvailable = item && ['essay', 'short_answer'].includes(item.question_type)

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setPoints(item.points_awarded ?? 0)
      setFeedback(item.feedback ?? '')
      setFlagReason('')
      setShowFlagModal(false)
      setAiSuggestion(null)
      setAiError(null)
      setShowAISuggestion(false)
    }
  }, [item?.id])

  // AI Grading handler
  const handleAIGrade = useCallback(async () => {
    if (!item) return

    setIsLoadingAI(true)
    setAiError(null)

    try {
      const response = await fetch('/api/teacher/ai/grade-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId: item.id })
      })

      const data = await response.json()

      if (!data.success) {
        setAiError(data.error || 'Failed to get AI suggestion')
        return
      }

      setAiSuggestion(data.suggestion)
      setShowAISuggestion(true)
    } catch (error) {
      console.error('AI grading error:', error)
      setAiError('An error occurred while getting AI suggestion')
    } finally {
      setIsLoadingAI(false)
    }
  }, [item])

  // Apply AI suggestion
  const handleApplyAISuggestion = useCallback(() => {
    if (!aiSuggestion) return
    setPoints(aiSuggestion.suggested_points)
    setFeedback(aiSuggestion.feedback)
    setShowAISuggestion(false)
  }, [aiSuggestion])

  const handleGrade = useCallback(async () => {
    if (!item) return

    setIsSaving(true)
    try {
      await onGrade(item.id, points, feedback)
      onNext()
    } catch (error) {
      console.error('Error grading item:', error)
    } finally {
      setIsSaving(false)
    }
  }, [item, points, feedback, onGrade, onNext])

  const handleFlag = useCallback(async () => {
    if (!item || !flagReason.trim()) return

    setIsSaving(true)
    try {
      await onFlag(item.id, flagReason)
      setShowFlagModal(false)
      onNext()
    } catch (error) {
      console.error('Error flagging item:', error)
    } finally {
      setIsSaving(false)
    }
  }, [item, flagReason, onFlag, onNext])

  const handleQuickScore = useCallback((quickPoints: number, quickFeedback: string) => {
    setPoints(quickPoints)
    if (quickFeedback) {
      setFeedback(quickFeedback)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return
      }

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleGrade()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleGrade])

  if (!item) {
    return (
      <Card className="h-full flex items-center justify-center text-center p-8">
        <div>
          <span className="material-symbols-rounded text-5xl text-slate-300 dark:text-slate-600 mb-4">
            touch_app
          </span>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Select an Item to Grade
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Choose an item from the queue on the left to start grading.
          </p>
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </Card>
    )
  }

  const maxPoints = questionDetails?.points || item.max_points

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-rounded text-primary">person</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {item.student_name || 'Unknown Student'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {item.assessment_title} | {item.course_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              item.status === 'pending' ? 'warning' :
              item.status === 'graded' ? 'success' : 'danger'
            }
          >
            {item.status}
          </Badge>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-rounded text-slate-500">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Question Type Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Question Type:
          </span>
          <Badge variant="info">
            {questionTypeLabels[item.question_type] || item.question_type}
          </Badge>
          <span className="ml-auto text-sm text-slate-500">
            Max: {maxPoints} points
          </span>
        </div>

        {/* Question Text */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <span className="material-symbols-rounded text-lg">help</span>
            Question
          </h4>
          <Card className="p-4 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-slate-700 dark:text-slate-300">
              {questionDetails?.question_text || item.question_text || 'Question text not available'}
            </p>
          </Card>
        </div>

        {/* Student Response */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <span className="material-symbols-rounded text-lg">edit_note</span>
            Student Response
          </h4>
          {formatStudentResponse(
            item.student_response,
            item.question_type,
            questionDetails?.choices_json
          )}
        </div>

        {/* Grading Rubric / Answer Key */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <span className="material-symbols-rounded text-lg">grading</span>
            Grading Reference
          </h4>
          <GradingRubric
            questionType={item.question_type}
            answerKey={questionDetails?.answer_key_json}
            rubric={item.rubric_json}
            maxPoints={maxPoints}
            onQuickScore={handleQuickScore}
          />
        </div>

        {/* AI Grading Section */}
        {isAIGradingAvailable && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="material-symbols-rounded text-lg text-purple-500">auto_awesome</span>
                AI Grading Assistant
              </h4>
              {!aiSuggestion && !isLoadingAI && (
                <Button
                  variant="outline"
                  onClick={handleAIGrade}
                  disabled={isLoadingAI}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <span className="material-symbols-rounded mr-2">smart_toy</span>
                  Get AI Suggestion
                </Button>
              )}
            </div>

            {/* Loading state */}
            {isLoadingAI && (
              <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent" />
                  <span className="text-purple-700 dark:text-purple-300">
                    Analyzing student response...
                  </span>
                </div>
              </Card>
            )}

            {/* Error state */}
            {aiError && (
              <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <span className="material-symbols-rounded">error</span>
                  <span>{aiError}</span>
                  <button
                    onClick={handleAIGrade}
                    className="ml-auto text-sm underline hover:no-underline"
                  >
                    Try again
                  </button>
                </div>
              </Card>
            )}

            {/* AI Suggestion display */}
            {aiSuggestion && showAISuggestion && (
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
                <div className="space-y-4">
                  {/* Header with score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "text-2xl font-bold",
                        aiSuggestion.percentage >= 80 ? "text-green-600" :
                        aiSuggestion.percentage >= 60 ? "text-yellow-600" :
                        "text-red-600"
                      )}>
                        {aiSuggestion.suggested_points}/{aiSuggestion.max_points}
                      </div>
                      <Badge variant={
                        aiSuggestion.confidence === 'high' ? 'success' :
                        aiSuggestion.confidence === 'medium' ? 'warning' : 'danger'
                      }>
                        {aiSuggestion.confidence} confidence
                      </Badge>
                    </div>
                    <button
                      onClick={() => setShowAISuggestion(false)}
                      className="p-1 rounded hover:bg-white/50 dark:hover:bg-black/20"
                    >
                      <span className="material-symbols-rounded text-slate-400">close</span>
                    </button>
                  </div>

                  {/* Reasoning */}
                  {aiSuggestion.reasoning && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                      {aiSuggestion.reasoning}
                    </p>
                  )}

                  {/* Strengths */}
                  {aiSuggestion.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Strengths:</p>
                      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        {aiSuggestion.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="material-symbols-rounded text-green-500 text-base">check</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {aiSuggestion.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Areas for improvement:</p>
                      <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        {aiSuggestion.improvements.map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="material-symbols-rounded text-amber-500 text-base">arrow_right</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested feedback preview */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Suggested feedback:</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-black/20 p-2 rounded">
                      {aiSuggestion.feedback}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                    <Button
                      onClick={handleApplyAISuggestion}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      <span className="material-symbols-rounded mr-2">check</span>
                      Apply Suggestion
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleAIGrade}
                      className="text-purple-600 border-purple-300"
                    >
                      <span className="material-symbols-rounded">refresh</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Collapsed suggestion indicator */}
            {aiSuggestion && !showAISuggestion && (
              <button
                onClick={() => setShowAISuggestion(true)}
                className="w-full p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-left hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    AI suggested: <strong>{aiSuggestion.suggested_points}/{aiSuggestion.max_points}</strong> points
                  </span>
                  <span className="material-symbols-rounded text-purple-500">expand_more</span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Grading Form */}
        <div className="space-y-4">
          {/* Points Input */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <span className="material-symbols-rounded text-lg">grade</span>
              Points Awarded
            </label>
            <div className="flex items-center gap-4 mt-2">
              <input
                type="number"
                min={0}
                max={maxPoints}
                step={0.5}
                value={points}
                onChange={(e) => setPoints(Math.min(maxPoints, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-24 px-4 py-3 text-xl font-bold text-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <span className="text-lg text-slate-500">/ {maxPoints}</span>
              <div className="flex-1" />
              {/* Quick point buttons */}
              <div className="flex gap-1">
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                  const quickPoints = Math.round(maxPoints * fraction * 2) / 2
                  return (
                    <button
                      key={fraction}
                      onClick={() => setPoints(quickPoints)}
                      className={cn(
                        'px-2 py-1 text-xs rounded font-medium transition-colors',
                        points === quickPoints
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                      )}
                    >
                      {fraction === 1 ? 'Full' : `${fraction * 100}%`}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Feedback Textarea */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <span className="material-symbols-rounded text-lg">comment</span>
              Feedback (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add feedback for the student..."
              rows={4}
              className="w-full mt-2 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFlagModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <span className="material-symbols-rounded">flag</span>
            Flag for Review
          </button>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onNext} disabled={isSaving}>
              Skip
            </Button>
            <Button onClick={handleGrade} disabled={isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-rounded">check</span>
                  Save & Next
                  <kbd className="ml-2 text-xs opacity-70">Cmd+Enter</kbd>
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-rounded text-2xl text-red-500">flag</span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Flag for Review
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Flag this item if you need another teacher to review it or if there&apos;s an issue with the submission.
            </p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Enter reason for flagging..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowFlagModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleFlag}
                disabled={!flagReason.trim() || isSaving}
                className="bg-red-600 hover:bg-red-700"
              >
                {isSaving ? 'Flagging...' : 'Flag Item'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
