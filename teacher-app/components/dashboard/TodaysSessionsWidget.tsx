'use client'

import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { TodaysLiveSession } from '@/lib/dal/dashboard'

interface TodaysSessionsWidgetProps {
  sessions: TodaysLiveSession[]
}

export default function TodaysSessionsWidget({ sessions }: TodaysSessionsWidgetProps) {
  if (sessions.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Today&apos;s Sessions
          </h2>
          <span className="material-symbols-outlined text-primary">
            event
          </span>
        </div>
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2">
            event_available
          </span>
          <p className="text-sm">No sessions scheduled for today</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Today&apos;s Sessions
        </h2>
        <span className="material-symbols-outlined text-primary">
          event
        </span>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`p-4 rounded-lg border ${
              session.is_live_now
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {session.is_live_now ? (
                    <Badge variant="success" className="bg-green-600 text-white">
                      LIVE NOW
                    </Badge>
                  ) : session.minutes_until_start !== null ? (
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {new Date(session.scheduled_start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                      {session.minutes_until_start > 0 &&
                        ` • In ${Math.floor(session.minutes_until_start / 60)}h ${session.minutes_until_start % 60}m`
                      }
                    </span>
                  ) : null}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {session.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {session.section_name} • {session.course_name}
                </p>
              </div>
              <div>
                {session.is_live_now && session.join_url ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => window.open(session.join_url!, '_blank')}
                  >
                    Join Session
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {/* Navigate to session prep */}}
                  >
                    Prepare
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
