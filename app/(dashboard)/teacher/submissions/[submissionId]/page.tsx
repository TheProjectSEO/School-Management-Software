export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth/session'
import { getSubmissionDetail } from '@/lib/dal/assessments'
import { createServiceClient } from '@/lib/supabase/service'
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

  // Look up teacher_profiles.id from school_profiles.id (profile_id)
  // getSubmissionDetail checks teacher_assignments.teacher_profile_id which is teacher_profiles.id,
  // NOT school_profiles.id (user.profile_id)
  const supabase = createServiceClient()
  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('id')
    .eq('profile_id', user.profile_id)
    .single()

  if (!teacherProfile) {
    redirect('/teacher/submissions')
  }

  const submission = await getSubmissionDetail(submissionId, teacherProfile.id)

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
