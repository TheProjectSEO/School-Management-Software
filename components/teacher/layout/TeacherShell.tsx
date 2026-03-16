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
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-[#7B1113] shrink-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="flex-1" />

          {/* User + Logout */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm font-medium text-white/90 truncate max-w-[160px]">
              {displayName}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="group flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isLoggingOut ? 'animate-spin' : 'group-hover:rotate-180'}`}>
                {isLoggingOut ? 'autorenew' : 'logout'}
              </span>
              <span className="hidden sm:block">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-bg-light dark:bg-bg-dark">
          <div className="mx-auto max-w-7xl p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
