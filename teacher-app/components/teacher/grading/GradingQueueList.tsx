'use client'

import { cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { GradingQueueItem } from '@/lib/dal/grading-queue'

interface GradingQueueListProps {
  items: GradingQueueItem[]
  selectedId?: string
  onSelect: (item: GradingQueueItem) => void
  loading?: boolean
}

const questionTypeLabels: Record<string, string> = {
  multiple_choice_single: 'Multiple Choice',
  multiple_choice_multi: 'Multi-Select',
  true_false: 'True/False',
  short_answer: 'Short Answer',
  matching: 'Matching',
  fill_in_blank: 'Fill in Blank',
  essay: 'Essay',
  ordering: 'Ordering'
}

const questionTypeIcons: Record<string, string> = {
  multiple_choice_single: 'radio_button_checked',
  multiple_choice_multi: 'check_box',
  true_false: 'toggle_on',
  short_answer: 'short_text',
  matching: 'swap_horiz',
  fill_in_blank: 'text_fields',
  essay: 'article',
  ordering: 'format_list_numbered'
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export default function GradingQueueList({
  items,
  selectedId,
  onSelect,
  loading = false
}: GradingQueueListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="text-center py-12">
        <span className="material-symbols-rounded text-5xl text-slate-300 dark:text-slate-600 mb-4">
          task_alt
        </span>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No Items to Grade
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          All caught up! Check back later for new submissions.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className={cn(
            'w-full text-left p-4 rounded-lg border transition-all',
            'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            selectedId === item.id
              ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark hover:border-slate-300 dark:hover:border-slate-600'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-slate-400 dark:text-slate-500 text-xl">
                {questionTypeIcons[item.question_type] || 'help'}
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {item.student_name || 'Unknown Student'}
              </span>
            </div>
            <Badge
              variant={
                item.status === 'pending'
                  ? 'warning'
                  : item.status === 'graded'
                  ? 'success'
                  : 'danger'
              }
            >
              {item.status}
            </Badge>
          </div>

          {/* Assessment info */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span className="material-symbols-rounded text-base">assignment</span>
            <span className="truncate">{item.assessment_title || 'Assessment'}</span>
            {item.course_name && (
              <>
                <span className="text-slate-400">|</span>
                <span className="truncate">{item.course_name}</span>
              </>
            )}
          </div>

          {/* Question preview */}
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-medium mr-2">
              {questionTypeLabels[item.question_type] || item.question_type}
            </span>
            {item.question_text && (
              <span className="text-slate-600 dark:text-slate-300">
                {truncateText(item.question_text, 80)}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1">
              <span className="material-symbols-rounded text-sm">schedule</span>
              {item.submitted_at && formatTimeAgo(item.submitted_at)}
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-rounded text-sm">grade</span>
              <span>
                {item.points_awarded !== null ? item.points_awarded : '?'} / {item.max_points} pts
              </span>
            </div>
            {item.priority > 0 && (
              <div className="flex items-center gap-1 text-amber-500">
                <span className="material-symbols-rounded text-sm">priority_high</span>
                <span>Priority</span>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
