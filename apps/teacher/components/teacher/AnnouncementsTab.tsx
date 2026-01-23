'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import CreateAnnouncementModal from './CreateAnnouncementModal'

interface Announcement {
  id: string
  title: string
  content: string
  target_type: 'section' | 'grade' | 'course' | 'school'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_published: boolean
  published_at: string | null
  expires_at: string | null
  target_count?: number
  read_count?: number
  created_at: string
}

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isPublishing, setIsPublishing] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/announcements')
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements || [])
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnnouncementCreated = (announcement: Announcement) => {
    setAnnouncements(prev => [announcement, ...prev])
    setShowCreateModal(false)
  }

  const handlePublish = async (id: string) => {
    setIsPublishing(id)
    try {
      const response = await fetch(`/api/announcements/${id}/publish`, {
        method: 'POST'
      })
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(prev =>
          prev.map(a => a.id === id ? data.announcement : a)
        )
      }
    } catch (err) {
      console.error('Failed to publish:', err)
    } finally {
      setIsPublishing(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    setIsDeleting(id)
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setAnnouncements(prev => prev.filter(a => a.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setIsDeleting(null)
    }
  }

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case 'section': return 'Sections'
      case 'grade': return 'Grade Levels'
      case 'course': return 'Courses'
      case 'school': return 'All Students'
      default: return type
    }
  }

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case 'section': return 'groups'
      case 'grade': return 'school'
      case 'course': return 'book'
      case 'school': return 'domain'
      default: return 'campaign'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="danger">Urgent</Badge>
      case 'high':
        return <Badge variant="warning">High</Badge>
      case 'normal':
        return <Badge variant="info">Normal</Badge>
      case 'low':
        return <Badge variant="default">Low</Badge>
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="material-symbols-outlined animate-spin">refresh</span>
          <span>Loading announcements...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Announcements
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Send messages to your students by section, grade, or course
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-outlined text-lg">add</span>
            New Announcement
          </Button>
        </div>

        {/* Announcements List */}
        {announcements.length === 0 ? (
          <EmptyState
            icon="campaign"
            title="No announcements yet"
            description="Create your first announcement to communicate with students."
          />
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0 ${
                    announcement.is_published
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  }`}>
                    <span className="material-symbols-outlined">
                      {getTargetTypeIcon(announcement.target_type)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {announcement.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={announcement.is_published ? 'success' : 'warning'}>
                            {announcement.is_published ? 'Published' : 'Draft'}
                          </Badge>
                          {getPriorityBadge(announcement.priority)}
                          <span className="text-xs text-slate-500">
                            {getTargetTypeLabel(announcement.target_type)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preview of content */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                      {announcement.content}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm text-slate-500 mb-4">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">group</span>
                        <span>{announcement.target_count || 0} recipients</span>
                      </div>
                      {announcement.is_published && (
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">visibility</span>
                          <span>{announcement.read_count || 0} read</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        <span>
                          {announcement.is_published && announcement.published_at
                            ? `Published ${formatDate(announcement.published_at)}`
                            : `Created ${formatDate(announcement.created_at)}`
                          }
                        </span>
                      </div>
                      {announcement.expires_at && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <span className="material-symbols-outlined text-base">timer</span>
                          <span>Expires {formatDate(announcement.expires_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {!announcement.is_published && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handlePublish(announcement.id)}
                            disabled={isPublishing === announcement.id}
                          >
                            {isPublishing === announcement.id ? (
                              <>
                                <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                                Publishing...
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-base">send</span>
                                Publish
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm">
                            <span className="material-symbols-outlined text-base">edit</span>
                            Edit
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(announcement.id)}
                        disabled={isDeleting === announcement.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {isDeleting === announcement.id ? (
                          <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                        ) : (
                          <span className="material-symbols-outlined text-base">delete</span>
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAnnouncementModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleAnnouncementCreated}
        />
      )}
    </>
  )
}
