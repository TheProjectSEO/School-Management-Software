import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTeacherProfile } from '@/lib/dal/teacher'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import MessagesInterface from '@/components/teacher/MessagesInterface'

export const metadata = {
  title: 'Messages | MSU Teacher Portal',
  description: 'Communicate with students and parents'
}

async function MessagesInterfaceContent() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  return (
    <MessagesInterface
      teacherId={teacherProfile.id}
      profileId={teacherProfile.profile_id}
      schoolId={teacherProfile.school_id}
    />
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MessagesInterfaceContent />
    </Suspense>
  )
}
