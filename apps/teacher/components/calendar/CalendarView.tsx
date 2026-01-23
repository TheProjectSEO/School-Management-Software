'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { LiveSession, AssessmentDueDate } from '@/lib/dal/teacher'

interface CalendarViewProps {
  sessions: LiveSession[]
  assessments: AssessmentDueDate[]
  onCreateSession: () => void
  onSelectSession: (session: LiveSession) => void
  onSelectAssessment: (assessment: AssessmentDueDate) => void
}

type ViewMode = 'month' | 'week' | 'day'

export default function CalendarView({
  sessions,
  assessments,
  onCreateSession,
  onSelectSession,
  onSelectAssessment
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatHeaderDate = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
                chevron_left
              </span>
            </button>
            <button
              onClick={goToNext}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
                chevron_right
              </span>
            </button>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatHeaderDate()}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-primary text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Day
            </button>
          </div>
          <Button onClick={onCreateSession}>
            <span className="material-symbols-outlined text-lg mr-2">
              add
            </span>
            Create Session
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="p-0 overflow-hidden">
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            sessions={sessions}
            assessments={assessments}
            onSelectSession={onSelectSession}
            onSelectAssessment={onSelectAssessment}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            sessions={sessions}
            assessments={assessments}
            onSelectSession={onSelectSession}
            onSelectAssessment={onSelectAssessment}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            sessions={sessions}
            assessments={assessments}
            onSelectSession={onSelectSession}
            onSelectAssessment={onSelectAssessment}
          />
        )}
      </Card>
    </div>
  )
}

// Helper function to get week start (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

// Helper function to get status badge variant
function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'scheduled':
      return 'info'
    case 'live':
      return 'success'
    case 'ended':
      return 'default'
    case 'cancelled':
      return 'danger'
    default:
      return 'default'
  }
}

// Month View Component
function MonthView({
  currentDate,
  sessions,
  assessments,
  onSelectSession,
  onSelectAssessment
}: Omit<CalendarViewProps, 'onCreateSession'> & { currentDate: Date }) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = getWeekStart(monthStart)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 41) // 6 weeks

  const days = []
  const currentDay = new Date(startDate)

  while (currentDay <= endDate) {
    days.push(new Date(currentDay))
    currentDay.setDate(currentDay.getDate() + 1)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="px-3 py-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const isToday = day.getTime() === today.getTime()
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const dayStr = day.toISOString().split('T')[0]

          const daySessions = sessions.filter(s => s.scheduled_start.startsWith(dayStr))
          const dayAssessments = assessments.filter(a => a.due_date.startsWith(dayStr))

          return (
            <div
              key={index}
              className={`min-h-[120px] border-b border-r border-slate-200 dark:border-slate-700 last:border-r-0 p-2 ${
                !isCurrentMonth ? 'bg-slate-50 dark:bg-slate-900/50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-sm font-semibold ${
                    isToday
                      ? 'bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center'
                      : isCurrentMonth
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="space-y-1">
                {daySessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onSelectSession(session)}
                    className="w-full text-left px-2 py-1 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <Badge variant={getStatusVariant(session.status)} className="text-[10px] px-1.5 py-0">
                        {new Date(session.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </Badge>
                    </div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {session.title}
                    </div>
                  </button>
                ))}

                {dayAssessments.map((assessment) => (
                  <button
                    key={assessment.id}
                    onClick={() => onSelectAssessment(assessment)}
                    className="w-full text-left px-2 py-1 rounded text-xs bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-[14px]">
                        assignment
                      </span>
                      <span className="font-medium text-yellow-900 dark:text-yellow-100 truncate">
                        {assessment.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Week View Component
function WeekView({
  currentDate,
  sessions,
  assessments,
  onSelectSession,
  onSelectAssessment
}: Omit<CalendarViewProps, 'onCreateSession'> & { currentDate: Date }) {
  const weekStart = getWeekStart(currentDate)
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + i)
    return day
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="overflow-x-auto">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div className="px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
          Time
        </div>
        {days.map((day) => {
          const isToday = day.getTime() === today.getTime()
          return (
            <div
              key={day.toISOString()}
              className="px-3 py-2 text-center text-sm border-r border-slate-200 dark:border-slate-700 last:border-r-0"
            >
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-lg font-bold ${
                  isToday ? 'text-primary' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-8 relative">
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 border-r border-b border-slate-200 dark:border-slate-700">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
            {days.map((day) => {
              const dayStr = day.toISOString().split('T')[0]
              const hourSessions = sessions.filter(s => {
                const sessionDate = new Date(s.scheduled_start)
                return s.scheduled_start.startsWith(dayStr) && sessionDate.getHours() === hour
              })

              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="min-h-[60px] border-r border-b border-slate-200 dark:border-slate-700 p-1 last:border-r-0"
                >
                  {hourSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => onSelectSession(session)}
                      className="w-full text-left px-2 py-1 mb-1 rounded text-xs hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: getStatusColor(session.status)
                      }}
                    >
                      <div className="font-medium text-white truncate">
                        {session.title}
                      </div>
                      <div className="text-white/80 text-[10px]">
                        {new Date(session.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Day View Component
function DayView({
  currentDate,
  sessions,
  assessments,
  onSelectSession,
  onSelectAssessment
}: Omit<CalendarViewProps, 'onCreateSession'> & { currentDate: Date }) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const dayStr = currentDate.toISOString().split('T')[0]
  const daySessions = sessions.filter(s => s.scheduled_start.startsWith(dayStr))
  const dayAssessments = assessments.filter(a => a.due_date.startsWith(dayStr))

  return (
    <div>
      {/* Assessments Due Today */}
      {dayAssessments.length > 0 && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-yellow-50 dark:bg-yellow-900/10">
          <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Assessments Due Today
          </h3>
          <div className="space-y-2">
            {dayAssessments.map((assessment) => (
              <button
                key={assessment.id}
                onClick={() => onSelectAssessment(assessment)}
                className="w-full text-left px-3 py-2 rounded bg-white dark:bg-slate-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">
                      assignment
                    </span>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {assessment.title}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {assessment.course.name}
                      </div>
                    </div>
                  </div>
                  <Badge variant="warning">{assessment.type}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hourly schedule */}
      <div>
        {hours.map((hour) => {
          const hourSessions = daySessions.filter(s => {
            const sessionDate = new Date(s.scheduled_start)
            return sessionDate.getHours() === hour
          })

          return (
            <div key={hour} className="flex border-b border-slate-200 dark:border-slate-700">
              <div className="w-24 px-3 py-4 text-sm text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              <div className="flex-1 p-2 min-h-[80px]">
                {hourSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onSelectSession(session)}
                    className="w-full text-left px-4 py-3 mb-2 rounded-lg hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: getStatusColor(session.status)
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-white text-base mb-1">
                          {session.title}
                        </div>
                        <div className="text-white/90 text-sm mb-2">
                          {session.course.name} - {session.section.name}
                        </div>
                        <div className="flex items-center gap-2 text-white/80 text-xs">
                          <span className="material-symbols-outlined text-sm">
                            schedule
                          </span>
                          {new Date(session.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {session.scheduled_end && (
                            <> - {new Date(session.scheduled_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</>
                          )}
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper function to get status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return '#3b82f6' // blue
    case 'live':
      return '#10b981' // green
    case 'ended':
      return '#6b7280' // gray
    case 'cancelled':
      return '#ef4444' // red
    default:
      return '#6b7280'
  }
}
