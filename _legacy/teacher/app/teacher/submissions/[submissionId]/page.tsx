import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { getSubmissionDetail } from '@/lib/dal/assessments'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import SubmissionReview from '@/components/teacher/SubmissionReview'

export const metadata = {
  title: 'Review Submission | MSU Teacher Portal',
  description: 'Grade student submissions and provide feedback'
}

interface PageProps {
  params: {
    submissionId: string
  }
}

async function SubmissionReviewContent({ submissionId }: { submissionId: string }) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/teacher/login')
  }

  const submission = await getSubmissionDetail(submissionId, teacherProfile.id)

  if (!submission) {
    redirect('/teacher/submissions')
  }

  return <SubmissionReview submission={submission} />
}

export default function SubmissionReviewPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SubmissionReviewContent submissionId={params.submissionId} />
    </Suspense>
  )
}
