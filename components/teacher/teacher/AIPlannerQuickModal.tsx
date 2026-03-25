'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { authFetch } from "@/lib/utils/authFetch";

type QuickModuleDraft = {
  title: string
  description: string
  learning_objectives: string[]
  lessons: { title: string; content: string; duration_minutes?: number | null }[]
}

type QuickAssessmentDraft = {
  title: string
  type: 'quiz' | 'exam' | 'assignment' | 'project'
  questions: {
    question_text: string
    question_type: 'multiple_choice' | 'true_false' | 'short_answer'
    points: number
    explanation?: string
    correct_answer?: string | null
    options?: { text: string; isCorrect: boolean }[]
  }[]
}

type CourseModule = { id: string; title: string; description?: string; learning_objectives?: string[] }
type CourseLesson = { id: string; title: string; content?: string; module_id: string; module_title: string }

export default function AIPlannerQuickModal({
  courseId,
  courseName,
  gradeLevel,
}: {
  courseId: string
  courseName: string
  gradeLevel?: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [planType, setPlanType] = useState<'module' | 'assessment'>('module')
  const [topic, setTopic] = useState('')
  const [lessonCount, setLessonCount] = useState(3)
  const [questionCount, setQuestionCount] = useState(5)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [moduleDraft, setModuleDraft] = useState<QuickModuleDraft | null>(null)
  const [assessmentDraft, setAssessmentDraft] = useState<QuickAssessmentDraft | null>(null)
  const [courseModules, setCourseModules] = useState<CourseModule[]>([])
  const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [baseModuleId, setBaseModuleId] = useState('')
  const [baseLessonId, setBaseLessonId] = useState('')

  useEffect(() => {
    if (!open || !courseId) return
    setLoadingModules(true)
    authFetch(`/api/teacher/content/modules?course_id=${courseId}&include_lessons=true`)
      .then((res) => res.json())
      .then((data) => {
        const mods: CourseModule[] = []
        const lessons: CourseLesson[] = []
        for (const mod of data.modules || []) {
          mods.push({ id: mod.id, title: mod.title, description: mod.description || '', learning_objectives: mod.learning_objectives || [] })
          for (const lesson of mod.lessons || []) {
            lessons.push({ id: lesson.id, title: lesson.title, content: lesson.content || '', module_id: mod.id, module_title: mod.title })
          }
        }
        setCourseModules(mods)
        setCourseLessons(lessons)
      })
      .catch(() => {})
      .finally(() => setLoadingModules(false))
  }, [open, courseId])

  const handleGenerate = async () => {
    if (!topic) return
    setIsGenerating(true)
    try {
      if (planType === 'module') {
        const res = await authFetch('/api/teacher/ai/generate-module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            courseName,
            gradeLevel,
            lessonCount,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error || 'Failed to generate module')
        } else {
          setModuleDraft(data.draft)
          setAssessmentDraft(null)
        }
      } else {
        const baseModule = courseModules.find((m) => m.id === baseModuleId)
        const baseLesson = courseLessons.find((l) => l.id === baseLessonId)
        const res = await authFetch('/api/teacher/ai/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            courseName,
            gradeLevel,
            questionCount,
            difficulty,
            questionTypes: ['multiple_choice', 'true_false', 'short_answer'],
            includeTags: true,
            moduleTitle: baseModule?.title || null,
            moduleDescription: baseModule?.description || null,
            moduleLearningObjectives: baseModule?.learning_objectives || null,
            lessonTitle: baseLesson?.title || null,
            lessonContent: baseLesson?.content || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error || 'Failed to generate assessment')
        } else {
          const draftTitle = baseLesson
            ? `${baseLesson.title} Assessment`
            : baseModule
            ? `${baseModule.title} Assessment`
            : `${topic} Assessment`
          setAssessmentDraft({
            title: draftTitle,
            type: 'quiz',
            questions: data.questions || [],
          })
          setModuleDraft(null)
        }
      }
    } catch (error) {
      console.error('Quick AI generate error:', error)
      alert('Failed to generate')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    try {
      if (planType === 'module' && moduleDraft) {
        const res = await authFetch('/api/teacher/ai/save-module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            title: moduleDraft.title,
            description: moduleDraft.description,
            learningObjectives: moduleDraft.learning_objectives,
            lessons: moduleDraft.lessons,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error || 'Failed to save module')
        } else {
          alert('Module saved.')
          setOpen(false)
        }
      }

      if (planType === 'assessment' && assessmentDraft) {
        const res = await authFetch('/api/teacher/ai/save-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            title: assessmentDraft.title,
            type: assessmentDraft.type,
            publishNow: false,
            questions: assessmentDraft.questions,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error || 'Failed to save assessment')
        } else {
          alert('Assessment saved.')
          setOpen(false)
        }
      }
    } catch (error) {
      console.error('Quick AI save error:', error)
      alert('Failed to save')
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <span className="material-symbols-outlined text-lg">auto_awesome</span>
        Quick AI Plan
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Quick AI Plan" size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Plan Type</label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as 'module' | 'assessment')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="module">Module</option>
              <option value="assessment">Assessment</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="e.g., Linear Functions"
            />
          </div>

          {planType === 'module' ? (
            <div>
              <label className="text-sm font-semibold text-slate-700">Lesson Count</label>
              <input
                type="number"
                min={1}
                value={lessonCount}
                onChange={(e) => setLessonCount(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Module <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={baseModuleId}
                    onChange={(e) => {
                      const id = e.target.value
                      setBaseModuleId(id)
                      setBaseLessonId('')
                      const mod = courseModules.find((m) => m.id === id)
                      if (mod) setTopic(mod.title)
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    disabled={loadingModules}
                  >
                    <option value="">{loadingModules ? 'Loading...' : 'Custom topic'}</option>
                    {courseModules.map((mod) => (
                      <option key={mod.id} value={mod.id}>{mod.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Lesson <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={baseLessonId}
                    onChange={(e) => {
                      const id = e.target.value
                      setBaseLessonId(id)
                      const lesson = courseLessons.find((l) => l.id === id)
                      if (lesson) setTopic(lesson.title)
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    disabled={loadingModules}
                  >
                    <option value="">All lessons</option>
                    {(baseModuleId
                      ? courseLessons.filter((l) => l.module_id === baseModuleId)
                      : courseLessons
                    ).map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {!baseModuleId ? `${lesson.module_title} — ` : ''}{lesson.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Question Count</label>
                  <input
                    type="number"
                    min={1}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={!topic || isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Draft'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/teacher/ai-planner?courseId=${courseId}`)}
            >
              Open Full Planner
            </Button>
          </div>

          {moduleDraft && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold text-slate-900">{moduleDraft.title}</h3>
              <p className="text-sm text-slate-600">{moduleDraft.description}</p>
              <ul className="text-sm list-disc pl-5 text-slate-600">
                {moduleDraft.lessons.map((lesson) => (
                  <li key={lesson.title}>{lesson.title}</li>
                ))}
              </ul>
            </div>
          )}

          {assessmentDraft && (
            <div className="rounded-lg border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold text-slate-900">{assessmentDraft.title}</h3>
              <p className="text-sm text-slate-600">
                {assessmentDraft.questions.length} questions generated
              </p>
            </div>
          )}

          {(moduleDraft || assessmentDraft) && (
            <Button onClick={handleSave}>Save Draft</Button>
          )}
        </div>
      </Modal>
    </>
  )
}
