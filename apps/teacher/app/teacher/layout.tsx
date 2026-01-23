import TeacherShell from '@/components/layout/TeacherShell'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { MessageNotificationProvider } from '@/components/providers/MessageNotificationProvider'
import { Toaster } from '@/components/ui/Toaster'

export const revalidate = 60; // 1 minute - profile data

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get teacher profile for notification provider
  const teacherProfile = await getTeacherProfile()

  const profileId = teacherProfile?.profile_id || null
  const teacherId = teacherProfile?.id || null
  const userName = teacherProfile?.profile?.full_name || "Teacher"

  return (
    <MessageNotificationProvider
      profileId={profileId}
      teacherId={teacherId}
      userName={userName}
    >
      <TeacherShell>{children}</TeacherShell>
      <Toaster />
    </MessageNotificationProvider>
  )
}
