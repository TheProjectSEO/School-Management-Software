'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import CreateModuleModal from './CreateModuleModal'
import { ModuleWithDetails } from '@/lib/dal/teacher'

interface ModulesTabProps {
  modules: ModuleWithDetails[]
  subjectId: string
}

export default function ModulesTab({ modules, subjectId }: ModulesTabProps) {
  const router = useRouter()
  const [moduleList, setModuleList] = useState(modules)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isPublishing, setIsPublishing] = useState<string | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newModules = [...moduleList]
    const draggedModule = newModules[draggedIndex]
    newModules.splice(draggedIndex, 1)
    newModules.splice(index, 0, draggedModule)

    setDraggedIndex(index)
    setModuleList(newModules)
  }

  const handleDragEnd = async () => {
    setDraggedIndex(null)
    // Save new order to database
    try {
      await Promise.all(
        moduleList.map((module, index) =>
          fetch(`/api/content/modules/${module.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: index + 1 }),
          })
        )
      )
    } catch (error) {
      console.error('Failed to save module order:', error)
    }
  }

  const handlePublishModule = async (moduleId: string) => {
    setIsPublishing(moduleId)
    try {
      const response = await fetch(`/api/content/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: true }),
      })

      if (response.ok) {
        setModuleList(prev =>
          prev.map(m => m.id === moduleId ? { ...m, is_published: true } : m)
        )
      }
    } catch (error) {
      console.error('Failed to publish module:', error)
    } finally {
      setIsPublishing(null)
    }
  }

  const handleModuleCreated = (newModule: any) => {
    setModuleList(prev => [...prev, newModule])
    setShowCreateModal(false)
  }

  if (moduleList.length === 0) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateModal(true)}>
              <span className="material-symbols-outlined text-lg">add</span>
              Create Module
            </Button>
          </div>
        <EmptyState
          icon="article"
          title="No modules yet"
          description="Create your first module to start organizing course content."
        />
        </div>

        {showCreateModal && (
          <CreateModuleModal
            courseId={subjectId}
            subjectId={subjectId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleModuleCreated}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Drag modules to reorder them
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-outlined text-lg">add</span>
            Create Module
          </Button>
        </div>

      {/* Modules List */}
      <div className="space-y-4">
        {moduleList.map((module, index) => (
          <Card
            key={module.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`cursor-move transition-all ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Drag Handle */}
              <div className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">drag_indicator</span>
              </div>

              {/* Module Number */}
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-bold text-lg flex-shrink-0">
                {module.order}
              </div>

              {/* Module Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      {module.title}
                    </h3>
                    {module.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {module.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={module.is_published ? 'success' : 'warning'}>
                    {module.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>

                {/* Module Stats */}
                <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400 mb-4">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">
                      description
                    </span>
                    <span>{module.lesson_count} Lessons</span>
                  </div>
                  {module.duration_minutes && (
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">
                        schedule
                      </span>
                      <span>{module.duration_minutes} mins</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">
                      {module.has_transcript ? 'check_circle' : 'cancel'}
                    </span>
                    <span>Transcript</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">
                      {module.has_notes ? 'check_circle' : 'cancel'}
                    </span>
                    <span>Notes</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Link href={`/teacher/subjects/${subjectId}/modules/${module.id}`}>
                    <Button variant="outline" size="sm">
                      <span className="material-symbols-outlined text-base">edit</span>
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm">
                    <span className="material-symbols-outlined text-base">
                      visibility
                    </span>
                    Preview
                  </Button>
                  {!module.is_published && (
                    <Button
                      size="sm"
                      onClick={() => handlePublishModule(module.id)}
                      disabled={isPublishing === module.id}
                    >
                      {isPublishing === module.id ? (
                        <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                      ) : (
                        <span className="material-symbols-outlined text-base">publish</span>
                      )}
                      {isPublishing === module.id ? 'Publishing...' : 'Publish'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      </div>

      {showCreateModal && (
        <CreateModuleModal
          courseId={subjectId}
          subjectId={subjectId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleModuleCreated}
        />
      )}
    </>
  )
}
