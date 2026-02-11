'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import TodaysSessionsWidget from './TodaysSessionsWidget'
import GradingInboxWidget from './GradingInboxWidget'
import PendingReleasesWidget from './PendingReleasesWidget'
import DraftContentWidget from './DraftContentWidget'
import UpcomingDeadlinesWidget from './UpcomingDeadlinesWidget'
import RecentActivityWidget from './RecentActivityWidget'
import type {
  TodaysLiveSession,
  RecentSubmission,
  GradedNotReleasedItem,
  DraftModule,
  UpcomingDeadline,
  ActivityItem,
} from '@/lib/dal/dashboard'

interface DashboardWidgetsGridProps {
  sessions: TodaysLiveSession[]
  recentSubmissions: RecentSubmission[]
  totalPending: number
  gradedItems: GradedNotReleasedItem[]
  drafts: DraftModule[]
  totalDraftCount: number
  deadlines: UpcomingDeadline[]
  activities: ActivityItem[]
}

type WidgetKey = 'sessions' | 'grading' | 'releases' | 'drafts' | 'deadlines' | 'activity'

const widgetConfig: {
  key: WidgetKey
  label: string
  icon: string
  color: string
  bgColor: string
  modalTitle: string
}[] = [
  {
    key: 'sessions',
    label: "Today's Sessions",
    icon: 'videocam',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    modalTitle: "Today's Live Sessions",
  },
  {
    key: 'grading',
    label: 'Grading Inbox',
    icon: 'assignment',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    modalTitle: 'Grading Inbox',
  },
  {
    key: 'releases',
    label: 'Pending Releases',
    icon: 'publish',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    modalTitle: 'Pending Grade Releases',
  },
  {
    key: 'drafts',
    label: 'Draft Content',
    icon: 'edit_note',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    modalTitle: 'Draft Content',
  },
  {
    key: 'deadlines',
    label: 'Deadlines',
    icon: 'schedule',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    modalTitle: 'Upcoming Deadlines',
  },
  {
    key: 'activity',
    label: 'Recent Activity',
    icon: 'history',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    modalTitle: 'Recent Activity',
  },
]

export default function DashboardWidgetsGrid({
  sessions,
  recentSubmissions,
  totalPending,
  gradedItems,
  drafts,
  totalDraftCount,
  deadlines,
  activities,
}: DashboardWidgetsGridProps) {
  const [openWidget, setOpenWidget] = useState<WidgetKey | null>(null)

  const counts: Record<WidgetKey, number> = {
    sessions: sessions.length,
    grading: totalPending,
    releases: gradedItems.length,
    drafts: totalDraftCount,
    deadlines: deadlines.length,
    activity: activities.length,
  }

  const modalContent: Record<WidgetKey, React.ReactNode> = {
    sessions: <TodaysSessionsWidget sessions={sessions} />,
    grading: (
      <GradingInboxWidget
        recentSubmissions={recentSubmissions}
        totalPending={totalPending}
      />
    ),
    releases: <PendingReleasesWidget items={gradedItems} />,
    drafts: <DraftContentWidget drafts={drafts} totalCount={totalDraftCount} />,
    deadlines: <UpcomingDeadlinesWidget deadlines={deadlines} />,
    activity: <RecentActivityWidget activities={activities} />,
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {widgetConfig.map(({ key, label, icon, color, bgColor }) => (
          <button
            key={key}
            onClick={() => setOpenWidget(key)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined text-xl ${color}`}>
                  {icon}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {label}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {counts[key]}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {openWidget && (
        <Modal
          isOpen={true}
          onClose={() => setOpenWidget(null)}
          title={widgetConfig.find(w => w.key === openWidget)!.modalTitle}
          size="lg"
        >
          {modalContent[openWidget]}
        </Modal>
      )}
    </>
  )
}
