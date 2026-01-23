'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import LessonEditor from './LessonEditor'

interface Lesson {
  id: string
  title: string
  content_type: string
  video_type: string | null
  duration_minutes: number | null
  order: number
  is_published: boolean
}

interface Module {
  id: string
  course_id: string
  title: string
  description: string
  duration_minutes: number | null
  order: number
  is_published: boolean
  lessons?: Lesson[]
}

interface ModuleEditorProps {
  module: Module
  subjectId: string
}

export default function ModuleEditor({ module, subjectId }: ModuleEditorProps) {
  const router = useRouter()
  const [isPreview, setIsPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingLessons, setIsFetchingLessons] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Lesson editor modal state
  const [showLessonEditor, setShowLessonEditor] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)

  const [formData, setFormData] = useState({
    title: module.title || '',
    description: module.description || '',
    duration_minutes: module.duration_minutes?.toString() || '',
  })

  const [lessons, setLessons] = useState<Lesson[]>(module.lessons || [])

  // Fetch lessons when component mounts
  useEffect(() => {
    fetchLessons()
  }, [module.id])

  const fetchLessons = async () => {
    setIsFetchingLessons(true)
    try {
      const response = await fetch(`/api/content/lessons?module_id=${module.id}`)
      if (response.ok) {
        const data = await response.json()
        setLessons(data.lessons || [])
      }
    } catch (err) {
      console.error('Failed to fetch lessons:', err)
    } finally {
      setIsFetchingLessons(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/content/modules/${module.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          is_published: false,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSuccess('Draft saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/content/modules/${module.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          is_published: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to publish')
      }

      setSuccess('Module published successfully!')
      setTimeout(() => {
        setSuccess(null)
        router.push(`/teacher/subjects/${subjectId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddLesson = () => {
    setEditingLesson(null)
    setShowLessonEditor(true)
  }

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson as any)
    setShowLessonEditor(true)
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return

    try {
      const response = await fetch(`/api/content/lessons/${lessonId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete lesson')
      }

      setLessons(prev => prev.filter(l => l.id !== lessonId))
      setSuccess('Lesson deleted')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lesson')
    }
  }

  const handleLessonSave = (savedLesson: any) => {
    // Update or add lesson in the list
    setLessons(prev => {
      const existing = prev.find(l => l.id === savedLesson.id)
      if (existing) {
        return prev.map(l => l.id === savedLesson.id ? savedLesson : l)
      }
      return [...prev, savedLesson]
    })
    setShowLessonEditor(false)
    setEditingLesson(null)
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return 'play_circle'
      case 'reading': return 'article'
      case 'quiz': return 'quiz'
      case 'activity': return 'assignment'
      default: return 'description'
    }
  }

  const totalDuration = lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/teacher/subjects/${subjectId}`)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                Module Editor
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Edit module content and settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {module.is_published ? (
              <Badge variant="success">Published</Badge>
            ) : (
              <Badge variant="warning">Draft</Badge>
            )}
            <Button variant="outline" onClick={() => setIsPreview(!isPreview)}>
              <span className="material-symbols-outlined text-lg">
                {isPreview ? 'edit' : 'visibility'}
              </span>
              {isPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-lg">save</span>
              )}
              Save Draft
            </Button>
            <Button onClick={handlePublish} disabled={isLoading}>
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-lg">publish</span>
              )}
              Publish
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <span className="material-symbols-outlined">check_circle</span>
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Two-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-6">
            <Card>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Module Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Module Title
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter module title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter module description"
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Duration (minutes)
                  </label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="45"
                  />
                  {totalDuration > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Total lesson duration: {totalDuration} minutes
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Lessons Section */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Lessons ({lessons.length})
                </h2>
                <Button size="sm" onClick={handleAddLesson}>
                  <span className="material-symbols-outlined text-base">add</span>
                  Add Lesson
                </Button>
              </div>

              {isFetchingLessons ? (
                <div className="flex items-center justify-center py-8">
                  <span className="material-symbols-outlined animate-spin text-2xl text-slate-400">
                    refresh
                  </span>
                </div>
              ) : lessons.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                  <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                    video_library
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No lessons yet. Add your first lesson.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons
                    .sort((a, b) => a.order - b.order)
                    .map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-slate-400 cursor-move">
                              drag_indicator
                            </span>
                            <span className="material-symbols-outlined text-primary">
                              {getContentTypeIcon(lesson.content_type)}
                            </span>
                            <div>
                              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                                {lesson.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500 capitalize">
                                  {lesson.content_type}
                                </span>
                                {lesson.duration_minutes && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs text-slate-500">
                                      {lesson.duration_minutes} min
                                    </span>
                                  </>
                                )}
                                {lesson.video_type && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <Badge variant="info" className="text-xs">
                                      {lesson.video_type}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {lesson.is_published ? (
                              <Badge variant="success">Published</Badge>
                            ) : (
                              <Badge variant="warning">Draft</Badge>
                            )}
                            <button
                              onClick={() => handleEditLesson(lesson)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-red-600"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>

            {/* Transcript Section */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Transcript
                </h2>
                <Button size="sm" variant="outline">
                  <span className="material-symbols-outlined text-base">upload</span>
                  Upload
                </Button>
              </div>
              <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                  description
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No transcript uploaded
                </p>
              </div>
            </Card>

            {/* Notes Section */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Notes
                </h2>
                <Button size="sm" variant="outline">
                  <span className="material-symbols-outlined text-base">upload</span>
                  Upload
                </Button>
              </div>
              <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                  note
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No notes uploaded
                </p>
              </div>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">visibility</span>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Student Preview
                </h2>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 bg-slate-50 dark:bg-slate-900">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {formData.title || 'Module Title'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {formData.description || 'Module description will appear here.'}
                </p>
                {(formData.duration_minutes || totalDuration > 0) && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    <span>{formData.duration_minutes || totalDuration} minutes</span>
                  </div>
                )}
                <div className="space-y-3">
                  {lessons.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">
                      No lessons added yet
                    </p>
                  ) : (
                    lessons
                      .sort((a, b) => a.order - b.order)
                      .map((lesson) => (
                        <div
                          key={lesson.id}
                          className="p-4 bg-white dark:bg-slate-800 rounded-lg flex items-center gap-3"
                        >
                          <span className="material-symbols-outlined text-primary">
                            {getContentTypeIcon(lesson.content_type)}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">
                              {lesson.title}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {lesson.duration_minutes ? `${lesson.duration_minutes} minutes` : 'No duration set'}
                            </p>
                          </div>
                          {!lesson.is_published && (
                            <Badge variant="warning">Draft</Badge>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Lesson Editor Modal */}
      {showLessonEditor && (
        <LessonEditor
          lesson={editingLesson as any}
          moduleId={module.id}
          onSave={handleLessonSave}
          onClose={() => {
            setShowLessonEditor(false)
            setEditingLesson(null)
          }}
          isModal
        />
      )}
    </>
  )
}
