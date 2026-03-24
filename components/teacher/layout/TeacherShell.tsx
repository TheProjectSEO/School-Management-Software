'use client'

import { useState } from 'react'
import Image from 'next/image'
import TeacherSidebar from './TeacherSidebar'
import { useAuth } from '@/hooks/useAuth'
import { useLiveSession } from '@/contexts/LiveSessionContext'
import { FloatingVideoPanel } from '@/components/live-sessions/FloatingVideoPanel'

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
  const { session, isFloating, setFloating, clearSession } = useLiveSession()

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
        <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-[#7B1113] shrink-0 gap-3">
          {/* Hamburger + Logo — mobile only */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <Image src="/brand/logo.png" alt="MSU" width={32} height={32} className="h-8 w-auto object-contain" />
            <span className="text-white font-bold text-sm tracking-wide">MSU</span>
          </div>

          <div className="flex-1" />

          {/* Profile + Logout */}
          <div className="flex items-center gap-2">
            {/* Avatar circle */}
            {teacherData?.avatar_url ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40 shrink-0">
                <Image src={teacherData.avatar_url} alt={displayName} width={32} height={32} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/25 border border-white/40 flex items-center justify-center text-white font-bold text-xs shrink-0 select-none">
                {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            <span className="hidden sm:block text-sm font-medium text-white/90 truncate max-w-[140px]">
              {displayName}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="group flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
          <div className="w-full p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>

      {isFloating && session && (
        <FloatingVideoPanel
          roomUrl={session.roomUrl}
          token={session.token}
          title={session.title}
          onExpand={() => setFloating(false)}
          onClose={clearSession}
        />
      )}
    </div>
  )
}
