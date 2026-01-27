'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

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

  const handleGenerate = async () => {
    if (!topic) return
    setIsGenerating(true)
    try {
      if (planType === 'module') {
        const res = await fetch('/api/teacher/ai/generate-module', {
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
        const res = await fetch('/api/teacher/ai/generate-quiz', {
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
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error || 'Failed to generate assessment')
        } else {
          setAssessmentDraft({
            title: `${topic} Assessment`,
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
        const res = await fetch('/api/teacher/ai/save-module', {
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
        const res = await fetch('/api/teacher/ai/save-assessment', {
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
