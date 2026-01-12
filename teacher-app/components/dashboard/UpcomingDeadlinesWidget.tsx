'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { UpcomingDeadline } from '@/lib/dal/dashboard'

interface UpcomingDeadlinesWidgetProps {
  deadlines: UpcomingDeadline[]
}

export default function UpcomingDeadlinesWidget({ deadlines }: UpcomingDeadlinesWidgetProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Upcoming Deadlines
        </h2>
        <span className="material-symbols-outlined text-primary">
          schedule
        </span>
      </div>

      {deadlines.length === 0 ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2">
            event_available
          </span>
          <p className="text-sm">No upcoming deadlines in the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.map((deadline) => {
            const urgency =
              deadline.days_until_due <= 1 ? 'danger' :
              deadline.days_until_due <= 3 ? 'warning' : 'info'

            return (
              <Link
                key={deadline.id}
                href={`/teacher/assessments/${deadline.id}`}
                className="block p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {deadline.title}
                      </h3>
                      <Badge variant={urgency}>
                        {deadline.days_until_due === 0
                          ? 'TODAY'
                          : deadline.days_until_due === 1
                          ? 'TOMORROW'
                          : `${deadline.days_until_due}d`
                        }
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {deadline.course_name} • {deadline.submission_count} submission{deadline.submission_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 ml-2">
                    arrow_forward
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}
