import { redirect, notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth/session'
import { getGradingItem } from '@/lib/dal/grading'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import GradingItemClient from './GradingItemClient'

export const metadata = {
  title: 'Grade Submission | Teacher Portal',
  description: 'Grade student submissions and provide feedback'
}

interface PageProps {
  params: Promise<{ itemId: string }>
}

async function GradingContent({ itemId }: { itemId: string }) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'teacher') {
    redirect('/login')
  }

  const gradingItem = await getGradingItem(itemId, user.profile_id)

  if (!gradingItem) {
    notFound()
  }

  return <GradingItemClient item={gradingItem} />
}

export default async function GradingItemPage({ params }: PageProps) {
  const { itemId } = await params

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101822]">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <GradingContent itemId={itemId} />
      </Suspense>
    </div>
  )
}
