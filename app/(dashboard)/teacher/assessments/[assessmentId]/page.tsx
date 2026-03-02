export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ assessmentId: string }>
}

export default async function AssessmentDetailPage({ params }: PageProps) {
  const { assessmentId } = await params
  // Redirect to builder page
  redirect(`/teacher/assessments/${assessmentId}/builder`)
}
