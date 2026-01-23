import TeacherSidebar from './TeacherSidebar'

interface TeacherShellProps {
  children: React.ReactNode
}

export default function TeacherShell({ children }: TeacherShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <TeacherSidebar />
      <main className="flex-1 overflow-y-auto bg-bg-light dark:bg-bg-dark">
        {children}
      </main>
    </div>
  )
}
