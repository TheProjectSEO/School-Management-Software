import TeacherSidebar from './TeacherSidebar'

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
  return (
    <div className="flex h-screen overflow-hidden">
      <TeacherSidebar initialTeacherData={teacherData} />
      <main className="flex-1 overflow-y-auto bg-bg-light dark:bg-bg-dark">
        {children}
      </main>
    </div>
  )
}
