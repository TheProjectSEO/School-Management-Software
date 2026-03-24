'use client'

import { useRouter } from 'next/navigation'

interface JoinLiveButtonProps {
  sessionId: string
  isPlayful?: boolean
}

export default function JoinLiveButton({ sessionId, isPlayful = false }: JoinLiveButtonProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(`/student/live-sessions/${sessionId}`)}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
        isPlayful
          ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:from-green-500 hover:to-emerald-600'
          : 'bg-green-600 text-white hover:bg-green-700'
      }`}
    >
      <span className="material-symbols-outlined text-base">videocam</span>
      Join Live
    </button>
  )
}
