'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/teacher/ui/Modal'
import Button from '@/components/teacher/ui/Button'
import Input from '@/components/ui/Input'

type Module = {
  id: string
  title: string
  description: string | null
  order: number
  duration_minutes: number | null
  is_published: boolean
  lesson_count: number
  created_at: string
  updated_at: string
}

type Subject = {
  id: string
  name: string
  subject_code: string
  description: string | null
  cover_image_url: string | null
  section_name: string
  grade_level: string
  module_count: number
  student_count: number
}

export default function SubjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleDescription, setModuleDescription] = useState('')
  const [moduleDuration, setModuleDuration] = useState('')

  useEffect(() => {
    fetchSubjectData()
  }, [subjectId])

  const fetchSubjectData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch subject details
      const subjectRes = await fetch(`/api/teacher/subjects`)
      if (!subjectRes.ok) throw new Error('Failed to fetch subject')
      const subjectData = await subjectRes.json()
      const foundSubject = subjectData.subjects?.find((s: any) =>
        s.subject?.id === subjectId || s.id === subjectId
      )

      if (foundSubject) {
        // Transform the data
        setSubject({
          id: foundSubject.subject?.id || foundSubject.id,
          name: foundSubject.subject?.name || foundSubject.name,
          subject_code: foundSubject.subject?.subject_code || foundSubject.subject_code,
          description: foundSubject.subject?.description || foundSubject.description || null,
          cover_image_url: foundSubject.subject?.cover_image_url || foundSubject.cover_image_url || null,
          section_name: foundSubject.section?.name || '',
          grade_level: foundSubject.section?.grade_level || '',
          module_count: 0,
          student_count: 0
        })
      }

      // Fetch modules for this subject/course
      const modulesRes = await fetch(`/api/teacher/content/modules?course_id=${subjectId}`)
      if (!modulesRes.ok) throw new Error('Failed to fetch modules')
      const modulesData = await modulesRes.json()
      setModules(modulesData.modules || [])

    } catch (err: any) {
      console.error('Error fetching subject data:', err)
      setError(err.message || 'Failed to load subject data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateModule = async () => {
    if (!moduleTitle.trim()) return

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/teacher/content/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: subjectId,
          title: moduleTitle.trim(),
          description: moduleDescription.trim() || null,
          duration_minutes: moduleDuration ? parseInt(moduleDuration) : null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create module')
      }

      setIsCreateModalOpen(false)
      resetForm()
      await fetchSubjectData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateModule = async () => {
    if (!selectedModule || !moduleTitle.trim()) return

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/teacher/content/modules/${selectedModule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: moduleTitle.trim(),
          description: moduleDescription.trim() || null,
          duration_minutes: moduleDuration ? parseInt(moduleDuration) : null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update module')
      }

      setIsEditModalOpen(false)
      setSelectedModule(null)
      resetForm()
      await fetchSubjectData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteModule = async () => {
    if (!selectedModule) return

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/teacher/content/modules/${selectedModule.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete module')
      }

      setIsDeleteModalOpen(false)
      setSelectedModule(null)
      await fetchSubjectData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePublish = async (module: Module) => {
    try {
      const res = await fetch(`/api/teacher/content/modules/${module.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_published: !module.is_published
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update module')
      }

      await fetchSubjectData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const openEditModal = (module: Module) => {
    setSelectedModule(module)
    setModuleTitle(module.title)
    setModuleDescription(module.description || '')
    setModuleDuration(module.duration_minutes?.toString() || '')
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (module: Module) => {
    setSelectedModule(module)
    setIsDeleteModalOpen(true)
  }

  const resetForm = () => {
    setModuleTitle('')
    setModuleDescription('')
    setModuleDuration('')
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-red-400 mb-4">
            error
          </span>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Error Loading Subject
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error}
          </p>
          <Button onClick={() => router.push('/teacher/subjects')}>
            Back to Subjects
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Link href="/teacher" className="hover:text-primary transition-colors">
          Dashboard
        </Link>
        <span className="material-symbols-outlined text-base">chevron_right</span>
        <Link href="/teacher/subjects" className="hover:text-primary transition-colors">
          Subjects
        </Link>
        <span className="material-symbols-outlined text-base">chevron_right</span>
        <span className="text-slate-900 dark:text-slate-100 font-medium">
          {subject?.name || 'Subject'}
        </span>
      </nav>

      {/* Subject Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Cover Image */}
        <div className="w-full md:w-64 h-40 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0">
          {subject?.cover_image_url ? (
            <img
              src={subject.cover_image_url}
              alt={subject.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-primary text-6xl">
              book_2
            </span>
          )}
        </div>

        {/* Subject Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {subject?.name}
                </h1>
                <Badge variant="success">
                  Active
                </Badge>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {subject?.subject_code} | {subject?.section_name} - Grade {subject?.grade_level}
              </p>
            </div>
          </div>

          {subject?.description && (
            <p className="text-slate-600 dark:text-slate-400">
              {subject.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">article</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {modules.length}
              </span>
              <span className="text-slate-600 dark:text-slate-400">Modules</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">groups</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {subject?.student_count || 0}
              </span>
              <span className="text-slate-600 dark:text-slate-400">Students</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <span className="material-symbols-outlined text-lg mr-2">add</span>
          Add Module
        </Button>
        <Link href={`/teacher/ai-planner?courseId=${subjectId}`}>
          <Button variant="outline">
            <span className="material-symbols-outlined text-lg mr-2">auto_awesome</span>
            AI Generate Module
          </Button>
        </Link>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Course Modules
        </h2>

        {modules.length === 0 ? (
          <Card className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
              folder_open
            </span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No modules yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Create your first module to start organizing your course content.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <span className="material-symbols-outlined text-lg mr-2">add</span>
              Create First Module
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {modules.map((module, index) => (
              <Card key={module.id} className="hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Module Number */}
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary">
                      {index + 1}
                    </span>
                  </div>

                  {/* Module Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link
                          href={`/teacher/subjects/${subjectId}/modules/${module.id}`}
                          className="text-lg font-semibold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors"
                        >
                          {module.title}
                        </Link>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">play_lesson</span>
                            {module.lesson_count || 0} lessons
                          </span>
                          {module.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-base">schedule</span>
                              {module.duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={module.is_published ? 'success' : 'warning'} size="sm">
                        {module.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>

                    {module.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                        {module.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/teacher/subjects/${subjectId}/modules/${module.id}`}
                        className="text-sm text-primary hover:text-primary-hover font-medium transition-colors"
                      >
                        View Details
                      </Link>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        onClick={() => openEditModal(module)}
                        className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                      >
                        Edit
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        onClick={() => handleTogglePublish(module)}
                        className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                      >
                        {module.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        onClick={() => openDeleteModal(module)}
                        className="text-sm text-red-600 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Module Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          resetForm()
        }}
        title="Create New Module"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Module Title"
            placeholder="e.g., Introduction to Algebra"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              className="w-full h-24 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Describe what students will learn in this module..."
              value={moduleDescription}
              onChange={(e) => setModuleDescription(e.target.value)}
            />
          </div>

          <Input
            label="Duration (minutes)"
            type="number"
            placeholder="e.g., 60"
            value={moduleDuration}
            onChange={(e) => setModuleDuration(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateModule}
              disabled={!moduleTitle.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Module'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Module Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedModule(null)
          resetForm()
        }}
        title="Edit Module"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Module Title"
            placeholder="e.g., Introduction to Algebra"
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              className="w-full h-24 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Describe what students will learn in this module..."
              value={moduleDescription}
              onChange={(e) => setModuleDescription(e.target.value)}
            />
          </div>

          <Input
            label="Duration (minutes)"
            type="number"
            placeholder="e.g., 60"
            value={moduleDuration}
            onChange={(e) => setModuleDuration(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false)
                setSelectedModule(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateModule}
              disabled={!moduleTitle.trim() || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedModule(null)
        }}
        title="Delete Module"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete <strong>{selectedModule?.title}</strong>?
            This will also delete all lessons within this module. This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setSelectedModule(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteModule}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Module'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
