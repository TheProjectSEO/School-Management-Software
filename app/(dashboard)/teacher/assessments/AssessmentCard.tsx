'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { authFetch } from '@/lib/utils/authFetch'

interface Assessment {
  id: string
  title: string
  type: string
  status: string
  description?: string | null
  due_date?: string | null
  total_points: number
  submission_count: number
  graded_count: number
  course_name: string
  section_name: string
}

function getAssessmentIcon(type: string) {
  switch (type) {
    case 'quiz': return 'quiz'
    case 'assignment': return 'assignment'
    case 'project': return 'folder'
    case 'midterm':
    case 'final': return 'school'
    default: return 'task'
  }
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'published': return 'success'
    case 'draft': return 'warning'
    case 'closed': return 'danger'
    default: return 'info'
  }
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return 'No due date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateString))
}

export default function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    try {
      const res = await authFetch(`/api/teacher/assessments/${assessment.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const body = await res.json()
        alert(body.error || 'Failed to delete assessment')
        setConfirming(false)
      }
    } catch {
      alert('Failed to delete assessment')
      setConfirming(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="relative group/card">
      <Link href={`/teacher/assessments/${assessment.id}`} className="block group">
        <Card className="hover:border-primary transition-colors">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-3xl">
                {getAssessmentIcon(assessment.type)}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                    {assessment.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-600 dark:text-slate-400">
                    <span className="capitalize">{assessment.type}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate max-w-[140px] sm:max-w-none">{assessment.course_name}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{assessment.section_name}</span>
                  </div>
                </div>
                <Badge variant={getStatusVariant(assessment.status)} className="ml-3">
                  {assessment.status}
                </Badge>
              </div>

              {assessment.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 mb-3">
                  {assessment.description}
                </p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Due Date</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatDate(assessment.due_date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Points</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {assessment.total_points}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Submissions</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {assessment.submission_count}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Graded</div>
                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {assessment.graded_count}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Pending</div>
                  <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    {assessment.submission_count - assessment.graded_count}
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform flex-shrink-0">
              arrow_forward
            </span>
          </div>
        </Card>
      </Link>

      {/* Delete button — sits outside the Link to avoid nested anchor */}
      <div
        className="absolute top-3 right-12 z-10"
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        {!confirming ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true) }}
            className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Delete assessment"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        ) : (
          <div
            className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg shadow-md px-2 py-1"
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          >
            <span className="text-xs text-red-600 font-medium whitespace-nowrap">Delete?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-2 py-0.5 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? '…' : 'Yes'}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(false) }}
              className="px-2 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
