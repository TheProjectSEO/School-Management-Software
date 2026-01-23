'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import BrandLogo from '@/components/brand/BrandLogo'
import { createClient } from '@/lib/supabase/client'
import { useMessageNotifications } from '@/components/providers/MessageNotificationProvider'

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
  { name: 'Question Banks', href: '/teacher/question-banks', icon: 'library_books' },
  { name: 'Submissions', href: '/teacher/submissions', icon: 'assignment_turned_in' },
  { name: 'Grading Queue', href: '/teacher/grading', icon: 'grading' },
  { name: 'Gradebook', href: '/teacher/gradebook', icon: 'score' },
  { name: 'Report Cards', href: '/teacher/report-cards', icon: 'description' },
  { name: 'Attendance', href: '/teacher/attendance', icon: 'fact_check' },
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

export default function TeacherSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [teacher, setTeacher] = useState<TeacherData | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Get unread message count
  const { unreadCount: messageUnreadCount } = useMessageNotifications()

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const supabase = createClient()

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get profile
        const { data: profile } = await supabase
          .from('school_profiles')
          .select('id, full_name, avatar_url')
          .eq('auth_user_id', user.id)
          .single()

        if (!profile) return

        // Get teacher profile
        const { data: teacherProfile } = await supabase
          .from('teacher_profiles')
          .select('department')
          .eq('profile_id', profile.id)
          .single()

        setTeacher({
          full_name: profile.full_name,
          email: user.email || '',
          avatar_url: profile.avatar_url,
          department: teacherProfile?.department || null,
        })
      } catch (error) {
        console.error('Error fetching teacher data:', error)
      }
    }

    fetchTeacherData()
  }, [])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <aside className="w-64 bg-white dark:bg-card-dark border-r border-slate-200 dark:border-slate-700 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <BrandLogo size="lg" />
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Teacher Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
          {teacher?.avatar_url ? (
            <img
              src={teacher.avatar_url}
              alt={teacher.full_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
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

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px]">
            logout
          </span>
          <span className="font-medium text-sm">
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </span>
        </button>
      </div>
    </aside>
  )
}
