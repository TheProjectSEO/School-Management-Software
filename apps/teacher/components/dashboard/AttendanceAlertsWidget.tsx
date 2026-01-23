'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { AbsentStudent } from '@/lib/dal/dashboard'

interface AttendanceAlertsWidgetProps {
  absentStudents: AbsentStudent[]
}

export default function AttendanceAlertsWidget({ absentStudents }: AttendanceAlertsWidgetProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Attendance Alerts
        </h2>
        <span className="material-symbols-outlined text-primary">
          fact_check
        </span>
      </div>

      {absentStudents.length === 0 ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined text-4xl text-green-600 mb-2">
            check_circle
          </span>
          <p className="text-sm">All students present today</p>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-lg">
              {absentStudents.length}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Student{absentStudents.length !== 1 ? 's' : ''} absent today
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {absentStudents.length} student{absentStudents.length !== 1 ? 's have' : ' has'} not logged in today across all your sections
            </p>
          </div>
          <Link href="/teacher/attendance">
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </Link>
        </div>
      )}
    </Card>
  )
}
