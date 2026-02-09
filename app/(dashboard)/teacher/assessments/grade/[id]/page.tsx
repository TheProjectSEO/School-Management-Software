import { redirect } from 'next/navigation'

/**
 * Legacy redirect: /teacher/assessments/grade/[id] → /teacher/grading/[id]
 */
export default async function LegacyGradeRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/teacher/grading/${id}`)
}
