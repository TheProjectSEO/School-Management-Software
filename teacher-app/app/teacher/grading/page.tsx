import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GradingQueuePage } from '@/components/teacher/grading'

export const metadata = {
  title: 'Grading Queue | MSU Teacher Portal',
  description: 'Review and grade student submissions that require manual review'
}

export default async function GradingPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Get teacher profile
  const { data: teacherProfile } = await supabase
    .from('teacher_profiles')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single()

  if (!teacherProfile) {
    redirect('/login')
  }

  return (
    <div className="p-6">
      <GradingQueuePage teacherId={teacherProfile.id} />
    </div>
  )
}
