import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTeacherProfile } from '@/lib/dal/teacher'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import AssessmentBuilder from '@/components/teacher/AssessmentBuilder'

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

  // TODO: Fetch assessment details
  const assessment = {
    id: assessmentId,
    title: 'New Assessment',
    type: 'quiz',
    due_date: null,
    time_limit_minutes: null,
    max_attempts: 1,
    instructions: '',
    total_points: 0
  }

  return <AssessmentBuilder assessment={assessment} />
}

export default function AssessmentBuilderPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AssessmentBuilderContent assessmentId={params.assessmentId} />
    </Suspense>
  )
}
