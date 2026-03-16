'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from "@/lib/utils/authFetch";

interface Announcement {
  id: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  target_type: string
  target_section_ids: string[]
  target_grade_levels: string[]
  target_course_ids: string[]
  is_published: boolean
  expires_at: string | null
}

export default function EditAnnouncementPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const response = await authFetch(`/api/teacher/announcements/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/teacher/announcements')
            return
          }
          throw new Error('Failed to fetch announcement')
        }

        const data = await response.json()
        const announcement: Announcement = data.announcement

        if (announcement.is_published) {
          router.push(`/teacher/announcements/${id}`)
          return
        }

        setTitle(announcement.title)
        setContent(announcement.content)
        setPriority(announcement.priority)
        setExpiresAt(announcement.expires_at ? announcement.expires_at.slice(0, 16) : '')
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnnouncement()
  }, [id, router])

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!content.trim()) {
      setError('Content is required')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await authFetch(`/api/teacher/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          priority,
          expires_at: expiresAt || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update announcement')
      }

      setSuccess('Announcement saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!content.trim()) {
      setError('Content is required')
      return
    }

    setIsPublishing(true)
    setError(null)

    try {
      // First save
      const saveResponse = await authFetch(`/api/teacher/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          priority,
          expires_at: expiresAt || null
        })
      })

      if (!saveResponse.ok) {
        const data = await saveResponse.json()
        throw new Error(data.error || 'Failed to save announcement')
      }

      // Then publish
      const publishResponse = await authFetch(`/api/teacher/announcements/${id}/publish`, {
        method: 'POST'
      })

      if (!publishResponse.ok) {
        const data = await publishResponse.json()
        throw new Error(data.error || 'Failed to publish announcement')
      }

      router.push(`/teacher/announcements/${id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return
    }

    try {
      const response = await authFetch(`/api/teacher/announcements/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete announcement')
      }

      router.push('/teacher/announcements')
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/teacher/announcements/${id}`}
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors mb-4"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Announcement
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Edit Announcement
        </h1>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title..."
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Message
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement here..."
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Priority
            </label>
            <div className="flex flex-wrap gap-2">
              {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    priority === p
                      ? p === 'urgent'
                        ? 'bg-red-500 text-white'
                        : p === 'high'
                        ? 'bg-orange-500 text-white'
                        : p === 'normal'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Expires At */}
          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Expires At (optional)
            </label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              Delete
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || isPublishing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">save</span>
                    Save Draft
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={isSubmitting || isPublishing}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">send</span>
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
