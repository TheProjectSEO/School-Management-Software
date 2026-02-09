import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Legacy redirect: /teacher/content/modules/[id] → /teacher/subjects/[courseId]/modules/[id]
 */
export default async function LegacyModuleRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: moduleId } = await params

  // Look up the course_id for this module to build the correct URL
  const supabase = await createClient()
  const { data } = await supabase
    .from('modules')
    .select('course_id')
    .eq('id', moduleId)
    .single()

  if (data?.course_id) {
    redirect(`/teacher/subjects/${data.course_id}/modules/${moduleId}`)
  }

  // Fallback if module not found
  redirect('/teacher/subjects')
}
