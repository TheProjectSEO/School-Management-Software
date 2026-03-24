'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/utils/authFetch'

export default function SubmitReportCardButton({ reportCardId }: { reportCardId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const res = await authFetch('/api/teacher/report-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_for_review',
          report_card_ids: [reportCardId],
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit for review')
      }
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit for review')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <button
      onClick={handleSubmit}
      disabled={isSubmitting}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-[#5a0c0e] transition-colors disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-[18px]">
        {isSubmitting ? 'progress_activity' : 'send'}
      </span>
      {isSubmitting ? 'Submitting...' : 'Submit for Review'}
    </button>
  )
}
