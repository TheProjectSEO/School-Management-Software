import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getQueueItem, getQuestionDetails } from '@/lib/dal/grading-queue'
import GradingItemClient from './GradingItemClient'

export const metadata = {
  title: 'Grade Item | MSU Teacher Portal',
  description: 'Grade a single queue item'
}

interface Props {
  params: Promise<{ itemId: string }>
}

export default async function GradingItemPage({ params }: Props) {
  const { itemId } = await params
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

  // Get the queue item
  const item = await getQueueItem(itemId)

  if (!item) {
    notFound()
  }

  // Get question details
  const questionDetails = await getQuestionDetails(item.question_id)

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
        <Link
          href="/teacher/grading"
          className="hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-rounded text-lg">arrow_back</span>
          Back to Queue
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-300">Grade Item</span>
      </nav>

      <GradingItemClient
        item={item}
        questionDetails={questionDetails}
        teacherId={teacherProfile.id}
      />
    </div>
  )
}
