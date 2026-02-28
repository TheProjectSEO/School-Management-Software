'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/utils/authFetch'

interface JoinLiveButtonProps {
  sessionId: string
  isPlayful?: boolean
}

/**
 * Calls POST /api/student/live-sessions/[id]/join to acquire a Daily.co token
 * (and track participation), then redirects to the room URL.
 */
export default function JoinLiveButton({ sessionId, isPlayful = false }: JoinLiveButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/student/live-sessions/${sessionId}/join`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to join session.')
        return
      }
      // Append token to room URL so Daily.co uses it
      const url = data.token
        ? `${data.roomUrl}?t=${data.token}`
        : data.roomUrl
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleJoin}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
          isPlayful
            ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:from-green-500 hover:to-emerald-600'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        <span className="material-symbols-outlined text-base">videocam</span>
        {loading ? 'Connecting…' : 'Join Live'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
