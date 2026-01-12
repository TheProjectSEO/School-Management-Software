'use client'

import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { TeacherStats } from '@/lib/dal/dashboard'

interface StatsWidgetProps {
  stats: TeacherStats
}

export default function StatsWidget({ stats }: StatsWidgetProps) {
  const statItems = [
    {
      label: 'Total Students',
      value: stats.total_students,
      icon: 'school',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: 'Active Courses',
      value: stats.active_courses,
      icon: 'book_2',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      label: 'Pending Submissions',
      value: stats.pending_submissions,
      icon: 'assignment',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      highlight: stats.pending_submissions > 0
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className={item.highlight ? 'border-orange-300 dark:border-orange-700' : ''}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                {item.label}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {item.value}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg ${item.bgColor} flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-2xl ${item.color}`}>
                {item.icon}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
