import TeacherShell from '@/components/teacher/layout/TeacherShell'
import { LiveSessionProvider } from '@/contexts/LiveSessionContext'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { MessageNotificationProvider } from '@/components/teacher/providers/MessageNotificationProvider'
import { Toaster } from '@/components/teacher/ui/Toaster'
import { TeacherGuard } from '@/components/auth/RoleGuard'
import { getCurrentUser } from '@/lib/auth/session'

export const revalidate = 60; // 1 minute - profile data

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get teacher profile for notification provider
  const teacherProfile = await getTeacherProfile()
  // Get current user for email from JWT
  const currentUser = await getCurrentUser()

  const profileId = teacherProfile?.profile_id || null
  const teacherId = teacherProfile?.id || null
  const userName = teacherProfile?.profile?.full_name || "Teacher"
  const userEmail = currentUser?.email || ""
  const avatarUrl = teacherProfile?.profile?.avatar_url || null
  const department = teacherProfile?.department || null

  // Build teacher data for sidebar
  const teacherData = {
    full_name: userName,
    email: userEmail,
    avatar_url: avatarUrl,
    department: department,
  }

  return (
    <TeacherGuard redirectTo="/login">
      <MessageNotificationProvider
        profileId={profileId}
        teacherId={teacherId}
        userName={userName}
      >
        <LiveSessionProvider>
          <TeacherShell teacherData={teacherData}>{children}</TeacherShell>
        </LiveSessionProvider>
        <Toaster />
      </MessageNotificationProvider>
    </TeacherGuard>
  )
}
