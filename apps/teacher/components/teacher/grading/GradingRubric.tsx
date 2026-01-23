'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/Card'

interface RubricCriteria {
  name: string
  max_points: number
  description: string
  levels?: {
    points: number
    description: string
  }[]
}

interface GradingRubricProps {
  questionType: string
  answerKey?: any
  rubric?: {
    criteria: RubricCriteria[]
  }
  maxPoints: number
  onQuickScore?: (points: number, feedback: string) => void
  className?: string
}

// Common feedback templates
const feedbackTemplates = {
  essay: [
    { label: 'Excellent', feedback: 'Excellent work! Your response demonstrates thorough understanding and clear articulation of the concepts.' },
    { label: 'Good', feedback: 'Good effort! Your response shows understanding but could benefit from more detail or examples.' },
    { label: 'Needs Work', feedback: 'Your response shows some understanding but needs significant improvement. Please review the material and consider the key points.' },
    { label: 'Incomplete', feedback: 'Your response is incomplete. Please provide a more comprehensive answer.' },
  ],
  short_answer: [
    { label: 'Correct', feedback: 'Correct answer!' },
    { label: 'Partially Correct', feedback: 'Partially correct. Please review the expected answer.' },
    { label: 'Incorrect', feedback: 'Incorrect. Please review the material.' },
  ],
  default: [
    { label: 'Full Credit', feedback: 'Well done!' },
    { label: 'Partial Credit', feedback: 'Partially correct.' },
    { label: 'No Credit', feedback: 'Incorrect response.' },
  ]
}

function formatAnswerKey(answerKey: any, questionType: string): React.ReactNode {
  if (!answerKey) return <span className="text-slate-400">No answer key available</span>

  switch (questionType) {
    case 'multiple_choice_single':
      return (
        <div>
          <span className="font-medium">Correct Answer ID:</span>{' '}
          <code className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-green-700 dark:text-green-400">
            {answerKey.correct_id}
          </code>
        </div>
      )

    case 'multiple_choice_multi':
      return (
        <div>
          <span className="font-medium">Correct Answer IDs:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {answerKey.correct_ids?.map((id: string, index: number) => (
              <code
                key={index}
                className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-green-700 dark:text-green-400"
              >
                {id}
              </code>
            ))}
          </div>
        </div>
      )

    case 'true_false':
      return (
        <div>
          <span className="font-medium">Correct Answer:</span>{' '}
          <span className={cn(
            'font-bold',
            answerKey.correct_value ? 'text-green-600' : 'text-red-600'
          )}>
            {answerKey.correct_value ? 'TRUE' : 'FALSE'}
          </span>
        </div>
      )

    case 'short_answer':
      return (
        <div>
          <span className="font-medium">Acceptable Answers:</span>
          <ul className="mt-1 space-y-1">
            {answerKey.acceptable_answers?.map((answer: string, index: number) => (
              <li key={index} className="flex items-center gap-2">
                <span className="material-symbols-rounded text-green-500 text-sm">check</span>
                <span>{answer}</span>
              </li>
            ))}
          </ul>
          {answerKey.case_sensitive && (
            <p className="text-xs text-amber-600 mt-1">Case sensitive</p>
          )}
        </div>
      )

    case 'matching':
      return (
        <div>
          <span className="font-medium">Correct Pairs:</span>
          <div className="mt-2 space-y-1">
            {answerKey.pairs?.map((pair: { left_id: string; right_id: string }, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <code className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                  {pair.left_id}
                </code>
                <span className="material-symbols-rounded text-slate-400">arrow_forward</span>
                <code className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-green-700 dark:text-green-400">
                  {pair.right_id}
                </code>
              </div>
            ))}
          </div>
        </div>
      )

    case 'fill_in_blank':
      return (
        <div>
          <span className="font-medium">Correct Blanks:</span>
          <div className="mt-2 space-y-2">
            {answerKey.blanks?.map((blank: { position: number; acceptable_answers: string[] }, index: number) => (
              <div key={index}>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Blank {blank.position + 1}:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {blank.acceptable_answers?.map((answer: string, i: number) => (
                    <code
                      key={i}
                      className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-green-700 dark:text-green-400 text-sm"
                    >
                      {answer}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )

    case 'ordering':
      return (
        <div>
          <span className="font-medium">Correct Order:</span>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            {answerKey.correct_order?.map((id: string, index: number) => (
              <li key={index} className="text-sm">
                <code className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-green-700 dark:text-green-400">
                  {id}
                </code>
              </li>
            ))}
          </ol>
        </div>
      )

    case 'essay':
      if (answerKey.rubric?.criteria) {
        return (
          <div>
            <span className="font-medium">Grading Rubric:</span>
            <div className="mt-2 space-y-3">
              {answerKey.rubric.criteria.map((criterion: RubricCriteria, index: number) => (
                <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">{criterion.name}</span>
                    <span className="text-xs text-slate-500">
                      {criterion.max_points} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {criterion.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      }
      return <span className="text-slate-400">Essay - use your professional judgment</span>

    default:
      return (
        <pre className="text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded overflow-auto">
          {JSON.stringify(answerKey, null, 2)}
        </pre>
      )
  }
}

export default function GradingRubric({
  questionType,
  answerKey,
  rubric,
  maxPoints,
  onQuickScore,
  className
}: GradingRubricProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('answer')

  const templates = feedbackTemplates[questionType as keyof typeof feedbackTemplates] || feedbackTemplates.default

  const quickScores = [
    { points: maxPoints, label: 'Full', color: 'bg-green-500' },
    { points: Math.round(maxPoints * 0.75), label: '75%', color: 'bg-lime-500' },
    { points: Math.round(maxPoints * 0.5), label: '50%', color: 'bg-amber-500' },
    { points: Math.round(maxPoints * 0.25), label: '25%', color: 'bg-orange-500' },
    { points: 0, label: 'Zero', color: 'bg-red-500' },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Score Buttons */}
      {onQuickScore && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <span className="material-symbols-rounded text-lg">bolt</span>
            Quick Score
          </h4>
          <div className="flex flex-wrap gap-2">
            {quickScores.map((score) => (
              <button
                key={score.label}
                onClick={() => onQuickScore(score.points, '')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-transform hover:scale-105',
                  score.color
                )}
              >
                {score.points} pts ({score.label})
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Answer Key / Rubric */}
      <Card className="p-4">
        <button
          onClick={() => setExpandedSection(expandedSection === 'answer' ? null : 'answer')}
          className="w-full flex items-center justify-between text-left"
        >
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span className="material-symbols-rounded text-lg text-primary">key</span>
            Answer Key / Reference
          </h4>
          <span className="material-symbols-rounded text-slate-400">
            {expandedSection === 'answer' ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {expandedSection === 'answer' && (
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {formatAnswerKey(answerKey, questionType)}
          </div>
        )}
      </Card>

      {/* Feedback Templates */}
      {onQuickScore && (
        <Card className="p-4">
          <button
            onClick={() => setExpandedSection(expandedSection === 'feedback' ? null : 'feedback')}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="material-symbols-rounded text-lg text-amber-500">chat</span>
              Feedback Templates
            </h4>
            <span className="material-symbols-rounded text-slate-400">
              {expandedSection === 'feedback' ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {expandedSection === 'feedback' && (
            <div className="mt-4 space-y-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const points = index === 0 ? maxPoints :
                                   index === templates.length - 1 ? 0 :
                                   Math.round(maxPoints * (1 - index * 0.25))
                    onQuickScore(points, template.feedback)
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
                    {template.label}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {template.feedback}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Custom Rubric if provided */}
      {rubric?.criteria && rubric.criteria.length > 0 && (
        <Card className="p-4">
          <button
            onClick={() => setExpandedSection(expandedSection === 'rubric' ? null : 'rubric')}
            className="w-full flex items-center justify-between text-left"
          >
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="material-symbols-rounded text-lg text-blue-500">grading</span>
              Detailed Rubric
            </h4>
            <span className="material-symbols-rounded text-slate-400">
              {expandedSection === 'rubric' ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {expandedSection === 'rubric' && (
            <div className="mt-4 space-y-4">
              {rubric.criteria.map((criterion, index) => (
                <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex justify-between items-center">
                    <span className="font-medium text-sm">{criterion.name}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {criterion.max_points} pts
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {criterion.description}
                    </p>
                    {criterion.levels && (
                      <div className="space-y-2">
                        {criterion.levels.map((level, levelIndex) => (
                          <button
                            key={levelIndex}
                            onClick={() => onQuickScore && onQuickScore(level.points, level.description)}
                            className="w-full flex items-center gap-3 p-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <span className="text-sm font-bold text-primary w-12">
                              {level.points} pts
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400 text-left">
                              {level.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
