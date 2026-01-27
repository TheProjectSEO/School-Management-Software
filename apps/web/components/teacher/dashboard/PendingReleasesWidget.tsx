'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { GradedNotReleasedItem } from '@/lib/dal/dashboard'

interface PendingReleasesWidgetProps {
  items: GradedNotReleasedItem[]
}

export default function PendingReleasesWidget({ items }: PendingReleasesWidgetProps) {
  const totalCount = items.reduce((sum, item) => sum + item.graded_count, 0)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Pending Releases
        </h2>
        <span className="material-symbols-outlined text-primary">
          send
        </span>
      </div>

      {totalCount === 0 ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2">
            check_circle
          </span>
          <p className="text-sm">No grades pending release</p>
        </div>
      ) : (
        <>
          <div className="text-center py-4 mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-msu-gold/10 text-msu-gold mb-4">
              <span className="text-3xl font-bold">{items.length}</span>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {items.length} assessment{items.length !== 1 ? 's' : ''} ready
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {totalCount} graded submission{totalCount !== 1 ? 's' : ''} ready to release
            </p>
          </div>

          <div className="space-y-2 mb-4">
            {items.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.assessment_title}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {item.course_name}
                    </p>
                  </div>
                  <Badge variant="warning">
                    {item.graded_count}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <Link href="/teacher/assessments?tab=release">
            <Button variant="primary" className="w-full">
              Release Grades
            </Button>
          </Link>
        </>
      )}
    </Card>
  )
}
