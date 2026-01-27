'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Section {
  id: string
  name: string
  grade_level: string
  student_count: number
}

interface AnnouncementFormProps {
  sections: Section[]
  preSelectedSectionId?: string
}

export default function AnnouncementForm({ sections, preSelectedSectionId }: AnnouncementFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [selectedSections, setSelectedSections] = useState<string[]>(
    preSelectedSectionId ? [preSelectedSectionId] : []
  )
  const [autoPublish, setAutoPublish] = useState(true)

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const selectAllSections = () => {
    setSelectedSections(sections.map(s => s.id))
  }

  const clearAllSections = () => {
    setSelectedSections([])
  }

  const totalStudents = sections
    .filter(s => selectedSections.includes(s.id))
    .reduce((sum, s) => sum + s.student_count, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    if (!content.trim()) {
      setError('Please enter the announcement content')
      return
    }

    if (selectedSections.length === 0) {
      setError('Please select at least one section')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/teacher/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          target_type: 'section',
          target_section_ids: selectedSections,
          priority,
          auto_publish: autoPublish
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create announcement')
      }

      setSuccess(true)
      setTitle('')
      setContent('')
      setPriority('normal')
      if (!preSelectedSectionId) {
        setSelectedSections([])
      }

      // Refresh the page to show the new announcement
      router.refresh()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
          Announcement created successfully!
        </div>
      )}

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
          rows={4}
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

      {/* Target Sections */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Target Sections
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllSections}
              className="text-xs text-primary hover:underline"
            >
              Select All
            </button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={clearAllSections}
              className="text-xs text-slate-500 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        {sections.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No sections available. You need to be assigned to sections first.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => handleSectionToggle(section.id)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedSections.includes(section.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded flex items-center justify-center ${
                    selectedSections.includes(section.id)
                      ? 'bg-primary text-white'
                      : 'border border-slate-300 dark:border-slate-600'
                  }`}>
                    {selectedSections.includes(section.id) && (
                      <span className="material-symbols-outlined text-sm">check</span>
                    )}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{section.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Grade {section.grade_level} - {section.student_count} students
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedSections.length > 0 && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {selectedSections.length} section{selectedSections.length !== 1 ? 's' : ''} selected - {totalStudents} student{totalStudents !== 1 ? 's' : ''} will receive this announcement
          </p>
        )}
      </div>

      {/* Auto Publish */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setAutoPublish(!autoPublish)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            autoPublish ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              autoPublish ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <label className="text-sm text-slate-700 dark:text-slate-300">
          Publish immediately
        </label>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">send</span>
              {autoPublish ? 'Send Announcement' : 'Save as Draft'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
