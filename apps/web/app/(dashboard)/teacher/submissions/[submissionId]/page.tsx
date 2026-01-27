import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth/session'
import { getSubmissionDetail } from '@/lib/dal/assessments'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import SubmissionReview from '@/components/teacher/teacher/SubmissionReview'

export const metadata = {
  title: 'Review Submission | Teacher Portal',
  description: 'Grade student submissions and provide feedback'
}

interface PageProps {
  params: Promise<{
    submissionId: string
  }>
}

async function SubmissionReviewContent({ submissionId }: { submissionId: string }) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'teacher') {
    redirect('/login')
  }

  const submission = await getSubmissionDetail(submissionId, user.profile_id)

  if (!submission) {
    redirect('/teacher/submissions')
  }

  return <SubmissionReview submission={submission} />
}

export default async function SubmissionReviewPage({ params }: PageProps) {
  const { submissionId } = await params

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <SubmissionReviewContent submissionId={submissionId} />
    </Suspense>
  )
}
