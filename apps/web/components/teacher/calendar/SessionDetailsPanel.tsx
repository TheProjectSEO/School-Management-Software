'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import type { LiveSession, AssessmentDueDate } from '@/lib/dal/teacher'

interface SessionDetailsPanelProps {
  session?: LiveSession | null
  assessment?: AssessmentDueDate | null
  onClose: () => void
  onEdit?: (session: LiveSession) => void
  onDelete?: (sessionId: string) => Promise<void>
}

export default function SessionDetailsPanel({
  session,
  assessment,
  onClose,
  onEdit,
  onDelete
}: SessionDetailsPanelProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!session && !assessment) return null

  const handleDelete = async () => {
    if (!session || !onDelete) return

    setIsDeleting(true)
    try {
      await onDelete(session.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete session:', error)
      alert('Failed to delete session. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Session Details Panel
  if (session) {
    const statusVariant = getStatusVariant(session.status)
    const statusColor = getStatusColor(session.status)

    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div
          className="p-6 border-b border-slate-200 dark:border-slate-700"
          style={{
            background: `linear-gradient(135deg, ${statusColor}15 0%, ${statusColor}05 100%)`
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <Badge variant={statusVariant} className="text-sm px-3 py-1">
              {session.status.toUpperCase()}
            </Badge>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
                close
              </span>
            </button>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {session.title}
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {session.course.name} ({session.course.subject_code})
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Schedule */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary">
                  schedule
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Schedule
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(session.scheduled_start).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(session.scheduled_start).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                  {session.scheduled_end && (
                    <> - {new Date(session.scheduled_end).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}</>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Section */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-blue-500">
                  groups
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Section
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {session.section.name} - Grade {session.section.grade_level}
                </div>
              </div>
            </div>
          </Card>

          {/* Module (if applicable) */}
          {session.module && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-purple-500">
                    folder
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Module
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {session.module.title}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Description */}
          {session.description && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-slate-500">
                    description
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Description
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {session.description}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Provider */}
          {session.provider && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-green-500">
                    videocam
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Video Platform
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                    {session.provider}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Join URL */}
          {session.join_url && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-blue-500">
                    link
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Join URL
                  </div>
                  <a
                    href={session.join_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      open_in_new
                    </span>
                    Open Meeting Link
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Recording URL (if ended) */}
          {session.recording_url && session.status === 'ended' && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-red-500">
                    play_circle
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Recording
                  </div>
                  <a
                    href={session.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      open_in_new
                    </span>
                    Watch Recording
                  </a>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Actions */}
        {session.status === 'scheduled' && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
            {!showDeleteConfirm ? (
              <>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => onEdit?.(session)}
                >
                  <span className="material-symbols-outlined text-lg mr-2">
                    edit
                  </span>
                  Edit Session
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <span className="material-symbols-outlined text-lg mr-2">
                    delete
                  </span>
                  Delete Session
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Are you sure you want to delete this session? This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Assessment Details Panel
  if (assessment) {
    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
          <div className="flex items-start justify-between mb-4">
            <Badge variant="warning" className="text-sm px-3 py-1">
              {assessment.type.toUpperCase()}
            </Badge>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
                close
              </span>
            </button>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {assessment.title}
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {assessment.course.name} ({assessment.course.subject_code})
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Due Date */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">
                  event
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Due Date
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(assessment.due_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(assessment.due_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Points */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-blue-500">
                  grade
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Total Points
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {assessment.total_points} points
                </div>
              </div>
            </div>
          </Card>

          {/* Description */}
          {assessment.description && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-slate-500">
                    description
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Description
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {assessment.description}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              // Navigate to assessment page
              window.location.href = `/teacher/assessments/${assessment.id}`
            }}
          >
            <span className="material-symbols-outlined text-lg mr-2">
              assignment
            </span>
            View Assessment
          </Button>
        </div>
      </div>
    )
  }

  return null
}

// Helper functions
function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'scheduled':
      return 'info'
    case 'live':
      return 'success'
    case 'ended':
      return 'default'
    case 'cancelled':
      return 'danger'
    default:
      return 'default'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return '#3b82f6' // blue
    case 'live':
      return '#10b981' // green
    case 'ended':
      return '#6b7280' // gray
    case 'cancelled':
      return '#ef4444' // red
    default:
      return '#6b7280'
  }
}
