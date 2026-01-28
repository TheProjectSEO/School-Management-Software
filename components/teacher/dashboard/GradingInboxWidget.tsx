'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { RecentSubmission } from '@/lib/dal/dashboard'

interface GradingInboxWidgetProps {
  recentSubmissions: RecentSubmission[]
  totalPending: number
}

export default function GradingInboxWidget({
  recentSubmissions,
  totalPending
}: GradingInboxWidgetProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Grading Inbox
        </h2>
        <span className="material-symbols-outlined text-primary">
          grading
        </span>
      </div>

      {totalPending === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 mb-4">
            <span className="material-symbols-outlined text-3xl">
              task_alt
            </span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            All caught up!
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No submissions pending review
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 rounded-lg bg-primary/10 text-center">
            <div className="text-3xl font-bold text-primary">
              {totalPending}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              submission{totalPending !== 1 ? 's' : ''} pending
            </p>
          </div>

          {recentSubmissions.length > 0 && (
            <div className="space-y-2 mb-4">
              {recentSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/teacher/assessments/grade/${submission.id}`}
                  className="block p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {submission.student_name}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                        {submission.assessment_title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {submission.time_ago}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 ml-2">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link href="/teacher/assessments?tab=grading">
            <Button variant="primary" className="w-full">
              View All Submissions
            </Button>
          </Link>
        </>
      )}
    </Card>
  )
}
