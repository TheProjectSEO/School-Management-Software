import { redirect } from 'next/navigation'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { GradingQueuePage } from '@/components/teacher/grading'

export const metadata = {
  title: 'Grading Queue | MSU Teacher Portal',
  description: 'Review and grade student submissions that require manual review'
}

export default async function GradingPage() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  return (
    <div>
      <GradingQueuePage teacherId={teacherProfile.id} />
    </div>
  )
}
