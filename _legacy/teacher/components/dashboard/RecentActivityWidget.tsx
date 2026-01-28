'use client'

import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { ActivityItem } from '@/lib/dal/dashboard'

interface RecentActivityWidgetProps {
  activities: ActivityItem[]
}

export default function RecentActivityWidget({ activities }: RecentActivityWidgetProps) {
  const getActivityIcon = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'submission':
        return 'assignment_turned_in'
      case 'enrollment':
        return 'person_add'
      case 'module_published':
        return 'publish'
      case 'message':
        return 'mail'
      default:
        return 'notifications'
    }
  }

  const getActivityColor = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'submission':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
      case 'enrollment':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      case 'module_published':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30'
      case 'message':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
      default:
        return 'text-slate-600 bg-slate-100 dark:bg-slate-700'
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Recent Activity
        </h2>
        <span className="material-symbols-outlined text-primary">
          history
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2">
            info
          </span>
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                <span className="material-symbols-outlined text-lg">
                  {getActivityIcon(activity.type)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 dark:text-slate-100">
                  {activity.description}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {activity.time_ago}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
