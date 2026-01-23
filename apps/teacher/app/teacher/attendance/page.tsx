import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTeacherProfile } from '@/lib/dal/teacher'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AttendanceDashboard from '@/components/teacher/AttendanceDashboard'

export const metadata = {
  title: 'Attendance | MSU Teacher Portal',
  description: 'Track and manage student attendance'
}

async function AttendanceDashboardContent() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  return <AttendanceDashboard teacherId={teacherProfile.id} />
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AttendanceDashboardContent />
    </Suspense>
  )
}
