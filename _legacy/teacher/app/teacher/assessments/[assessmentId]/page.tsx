import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTeacherProfile } from '@/lib/dal/teacher'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export const metadata = {
  title: 'Assessment Builder | MSU Teacher Portal',
  description: 'Create and edit assessments, quizzes, and exams'
}

interface PageProps {
  params: {
    assessmentId: string
  }
}

async function AssessmentBuilderContent({ assessmentId }: { assessmentId: string }) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  redirect(`/teacher/assessments/${assessmentId}/builder`)
  return null // Never reached, but satisfies TypeScript
}

export default function AssessmentBuilderPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AssessmentBuilderContent assessmentId={params.assessmentId} />
    </Suspense>
  )
}
