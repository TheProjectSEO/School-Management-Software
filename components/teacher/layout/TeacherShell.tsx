'use client'

import { useState } from 'react'
import TeacherSidebar from './TeacherSidebar'
import { useAuth } from '@/hooks/useAuth'

interface TeacherData {
  full_name: string
  email: string
  avatar_url: string | null
  department: string | null
}

interface TeacherShellProps {
  children: React.ReactNode
  teacherData?: TeacherData
}

export default function TeacherShell({ children, teacherData }: TeacherShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const displayName = teacherData?.full_name || 'Teacher'

  return (
    <div className="flex h-screen overflow-hidden">
      <TeacherSidebar
        initialTeacherData={teacherData}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col md:ml-64 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-700 shrink-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="flex-1" />

          {/* User + Logout */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 truncate max-w-[160px]">
              {displayName}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className="hidden sm:block">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-bg-light dark:bg-bg-dark">
          {children}
        </main>
      </div>
    </div>
  )
}
