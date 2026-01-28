'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import CalendarView from '@/components/calendar/CalendarView'
import CreateSessionModal, { type SessionFormData } from '@/components/calendar/CreateSessionModal'
import SessionDetailsPanel from '@/components/calendar/SessionDetailsPanel'
import type { LiveSession, AssessmentDueDate, TeacherSubject } from '@/lib/dal/teacher'

interface CalendarClientProps {
  teacherId: string
  sessions: LiveSession[]
  assessments: AssessmentDueDate[]
  subjects: TeacherSubject[]
}

export default function CalendarClient({
  teacherId,
  sessions: initialSessions,
  assessments,
  subjects
}: CalendarClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [sessions, setSessions] = useState(initialSessions)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null)
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentDueDate | null>(null)

  const handleCreateSession = async (data: SessionFormData) => {
    try {
      const response = await fetch('/api/teacher/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create session')
      }

      const newSession = await response.json()

      // Optimistically update the UI
      setSessions([...sessions, newSession])

      // Refresh the page data
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Error creating session:', error)
      throw error
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/teacher/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete session')
      }

      // Optimistically update the UI
      setSessions(sessions.filter(s => s.id !== sessionId))

      // Refresh the page data
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Error deleting session:', error)
      throw error
    }
  }

  const handleSelectSession = (session: LiveSession) => {
    setSelectedSession(session)
    setSelectedAssessment(null)
  }

  const handleSelectAssessment = (assessment: AssessmentDueDate) => {
    setSelectedAssessment(assessment)
    setSelectedSession(null)
  }

  const handleCloseDetails = () => {
    setSelectedSession(null)
    setSelectedAssessment(null)
  }

  return (
    <>
      <CalendarView
        sessions={sessions}
        assessments={assessments}
        onCreateSession={() => setShowCreateModal(true)}
        onSelectSession={handleSelectSession}
        onSelectAssessment={handleSelectAssessment}
      />

      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        subjects={subjects}
        onSubmit={handleCreateSession}
      />

      <SessionDetailsPanel
        session={selectedSession}
        assessment={selectedAssessment}
        onClose={handleCloseDetails}
        onEdit={(session) => {
          // TODO: Implement edit functionality
          console.log('Edit session:', session)
        }}
        onDelete={handleDeleteSession}
      />
    </>
  )
}
