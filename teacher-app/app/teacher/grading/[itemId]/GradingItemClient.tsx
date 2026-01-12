'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import Card from '@/components/ui/Card'
import { GradingPanel } from '@/components/teacher/grading'
import { GradingQueueItem } from '@/lib/dal/grading-queue'

interface GradingItemClientProps {
  item: GradingQueueItem
  questionDetails: {
    question_text: string
    question_type: string
    choices_json: any
    answer_key_json: any
    points: number
  } | null
  teacherId: string
}

export default function GradingItemClient({
  item,
  questionDetails,
  teacherId
}: GradingItemClientProps) {
  const router = useRouter()

  // Grade handler
  const handleGrade = useCallback(async (itemId: string, points: number, feedback: string) => {
    const response = await fetch(`/api/teacher/grading/queue/${itemId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, feedback })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to save grade')
    }
  }, [])

  // Flag handler
  const handleFlag = useCallback(async (itemId: string, reason: string) => {
    const response = await fetch(`/api/teacher/grading/queue/${itemId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to flag item')
    }
  }, [])

  // Next item handler - fetch next from queue and navigate
  const handleNext = useCallback(async () => {
    try {
      const response = await fetch('/api/teacher/grading/queue?status=pending&limit=1')
      const data = await response.json()

      if (data.success && data.items.length > 0) {
        const nextItem = data.items.find((i: any) => i.id !== item.id) || data.items[0]
        if (nextItem && nextItem.id !== item.id) {
          router.push(`/teacher/grading/${nextItem.id}`)
          return
        }
      }

      // No more items - go back to queue
      router.push('/teacher/grading')
    } catch (error) {
      console.error('Error fetching next item:', error)
      router.push('/teacher/grading')
    }
  }, [item.id, router])

  // Close handler - go back to queue
  const handleClose = useCallback(() => {
    router.push('/teacher/grading')
  }, [router])

  return (
    <Card className="h-[calc(100vh-200px)] overflow-hidden">
      <GradingPanel
        item={item}
        questionDetails={questionDetails}
        onGrade={handleGrade}
        onFlag={handleFlag}
        onNext={handleNext}
        onClose={handleClose}
      />
    </Card>
  )
}
