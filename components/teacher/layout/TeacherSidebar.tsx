'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import BrandLogo from '@/components/teacher/brand/BrandLogo'
import { useMessageNotifications } from '@/components/teacher/providers/MessageNotificationProvider'

interface NavItem {
  name: string
  href: string
  icon: string
  showMessageBadge?: boolean
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/teacher', icon: 'dashboard' },
  { name: 'My Classes', href: '/teacher/classes', icon: 'groups' },
  { name: 'My Subjects', href: '/teacher/subjects', icon: 'book_2' },
  { name: 'Live Sessions', href: '/teacher/live-sessions', icon: 'videocam' },
  { name: 'AI Planner', href: '/teacher/ai-planner', icon: 'auto_awesome' },
  { name: 'Assessments', href: '/teacher/assessments', icon: 'quiz' },
  { name: 'Submissions', href: '/teacher/submissions', icon: 'assignment_turned_in' },
  { name: 'Grading Queue', href: '/teacher/grading', icon: 'grading' },
  { name: 'Feedback Templates', href: '/teacher/feedback-templates', icon: 'content_paste' },
  { name: 'Gradebook', href: '/teacher/gradebook', icon: 'grade' },
  { name: 'Report Cards', href: '/teacher/report-cards', icon: 'description' },
  { name: 'Attendance', href: '/teacher/attendance', icon: 'fact_check' },
  { name: 'Student Alerts', href: '/teacher/alerts', icon: 'notification_important' },
  { name: 'Calendar', href: '/teacher/calendar', icon: 'calendar_month' },
  { name: 'Messages', href: '/teacher/messages', icon: 'chat', showMessageBadge: true },
  { name: 'Students', href: '/teacher/students', icon: 'school' },
  { name: 'Settings', href: '/teacher/settings', icon: 'settings' },
]

type TeacherData = {
  full_name: string
  email: string
  avatar_url: string | null
  department: string | null
}

interface TeacherSidebarProps {
  initialTeacherData?: TeacherData
  isOpen: boolean
  onClose: () => void
}

export default function TeacherSidebar({ initialTeacherData, isOpen, onClose }: TeacherSidebarProps) {
  const pathname = usePathname()
  const [teacher] = useState<TeacherData | null>(initialTeacherData || null)

  const { unreadCount: messageUnreadCount } = useMessageNotifications()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 bg-white dark:bg-card-dark border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <BrandLogo size="lg" />
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Teacher Portal</p>
            </div>
            {/* Close button — mobile only */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Navigation — scrollbar hidden */}
        <nav className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                <span className="font-medium">{item.name}</span>
                {item.showMessageBadge && messageUnreadCount > 0 && (
                  <span className={cn(
                    "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold shadow-sm px-1",
                    isActive
                      ? "bg-yellow-400 text-slate-900"
                      : "bg-primary text-white"
                  )}>
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg">
            {teacher?.avatar_url ? (
              <img
                src={teacher.avatar_url}
                alt={teacher.full_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm shrink-0">
                {teacher ? getInitials(teacher.full_name) : 'T'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                {teacher?.full_name || 'Loading...'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {teacher?.email || ''}
              </p>
              {teacher?.department && (
                <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                  {teacher.department}
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
