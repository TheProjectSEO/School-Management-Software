'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { DraftModule } from '@/lib/dal/dashboard'

interface DraftContentWidgetProps {
  drafts: DraftModule[]
  totalCount: number
}

export default function DraftContentWidget({ drafts, totalCount }: DraftContentWidgetProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Draft Content
        </h2>
        <span className="material-symbols-outlined text-primary">
          draft
        </span>
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2">
            check_circle
          </span>
          <p className="text-sm">No draft content</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.slice(0, 2).map((draft) => (
            <Link
              key={draft.id}
              href={`/teacher/content/modules/${draft.id}`}
              className="block p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {draft.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {draft.course_name} • Last edited {draft.time_ago}
                  </p>
                </div>
                <Badge variant="warning" className="ml-2">
                  DRAFT
                </Badge>
              </div>
            </Link>
          ))}

          {totalCount > 2 && (
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center pt-2">
              + {totalCount - 2} more draft{totalCount - 2 !== 1 ? 's' : ''} awaiting publish
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
