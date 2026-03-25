'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { authFetch } from "@/lib/utils/authFetch";

type SubjectAssignment = {
  id: string
  subject: { id: string; name: string; subject_code?: string }
  section?: { id: string; name: string; grade_level?: string }
}

type ModuleDraft = {
  title: string
  description: string
  learning_objectives: string[]
  lessons: { title: string; content: string; duration_minutes?: number | null }[]
}

type CourseLesson = {
  id: string
  title: string
  content?: string
  module_id?: string
  module_title?: string
}

type CourseModule = {
  id: string
  title: string
  description?: string
  learning_objectives?: string[]
}

type AssessmentDraft = {
  title: string
  type: 'essay' | 'assignment' | 'short_quiz' | 'long_quiz' | 'exam'
  instructions: string
  due_date?: string
  time_limit_minutes?: number | null
  max_attempts?: number | null
  publish_now?: boolean
  lesson_id?: string
  grading_period_id?: string
  min_word_count?: number | null
  max_word_count?: number | null
  requires_file_upload?: boolean
  file_upload_instructions?: string | null
  allowed_file_types?: string
  questions: {
    question_text: string
    question_type: 'multiple_choice' | 'true_false' | 'short_answer'
    points: number
    explanation?: string
    correct_answer?: string | null
    options?: { text: string; isCorrect: boolean }[]
  }[]
}

export default function AIPlannerPage() {
  const searchParams = useSearchParams()
  const [subjects, setSubjects] = useState<SubjectAssignment[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [planType, setPlanType] = useState<'module' | 'assessment'>('module')
  const [courseId, setCourseId] = useState('')
  const [topic, setTopic] = useState('')
  const [lessonCount, setLessonCount] = useState(4)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [questionTypes, setQuestionTypes] = useState({
    multiple_choice: true,
    true_false: true,
    short_answer: false,
  })
  const [objectives, setObjectives] = useState('')
  const [assessmentType, setAssessmentType] = useState<AssessmentDraft['type']>('short_quiz')
  const [gradingPeriods, setGradingPeriods] = useState<{ id: string; name: string; is_active: boolean }[]>([])
  const [selectedGradingPeriodId, setSelectedGradingPeriodId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft | null>(null)
  const [assessmentDraft, setAssessmentDraft] = useState<AssessmentDraft | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [courseModules, setCourseModules] = useState<CourseModule[]>([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [selectedModuleId, setSelectedModuleId] = useState('')
  // Pre-generation: module/lesson to base the assessment on
  const [baseModuleId, setBaseModuleId] = useState('')
  const [baseLessonId, setBaseLessonId] = useState('')
  const [assessmentIdempotencyKey, setAssessmentIdempotencyKey] = useState('')
  const [isSavingAssessment, setIsSavingAssessment] = useState(false)
  const [assessmentSaved, setAssessmentSaved] = useState(false)

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await authFetch('/api/teacher/subjects')
        if (!res.ok) return
        const data = await res.json()
        setSubjects(data.subjects || [])
      } catch (error) {
        console.error('Failed to load subjects:', error)
      } finally {
        setLoadingSubjects(false)
      }
    }

    async function loadGradingPeriods() {
      try {
        const res = await authFetch('/api/teacher/grading-periods')
        if (!res.ok) return
        const data = await res.json()
        setGradingPeriods(data.periods || [])
        const active = (data.periods || []).find((p: { is_active: boolean }) => p.is_active)
        if (active) setSelectedGradingPeriodId(active.id)
      } catch (error) {
        console.error('Failed to load grading periods:', error)
      }
    }

    loadSubjects()
    loadGradingPeriods()
  }, [])

  useEffect(() => {
    const preselected = searchParams.get('courseId')
    if (preselected) {
      setCourseId(preselected)
    }
  }, [searchParams])

  // Load lessons + modules when course changes (for assessment pickers)
  useEffect(() => {
    if (!courseId) {
      setCourseLessons([])
      setCourseModules([])
      setSelectedModuleId('')
      setBaseModuleId('')
      setBaseLessonId('')
      return
    }
    async function loadLessonsAndModules() {
      setLoadingLessons(true)
      setLoadingModules(true)
      try {
        const res = await authFetch(`/api/teacher/content/modules?course_id=${courseId}&include_lessons=true`)
        if (!res.ok) return
        const data = await res.json()
        const lessons: CourseLesson[] = []
        const modules: CourseModule[] = []
        for (const mod of data.modules || []) {
          modules.push({
            id: mod.id,
            title: mod.title,
            description: mod.description || '',
            learning_objectives: Array.isArray(mod.learning_objectives) ? mod.learning_objectives : [],
          })
          for (const lesson of mod.lessons || []) {
            lessons.push({
              id: lesson.id,
              title: lesson.title,
              content: lesson.content || '',
              module_id: mod.id,
              module_title: mod.title,
            })
          }
        }
        setCourseLessons(lessons)
        setCourseModules(modules)
      } catch (error) {
        console.error('Failed to load lessons/modules:', error)
      } finally {
        setLoadingLessons(false)
        setLoadingModules(false)
      }
    }
    loadLessonsAndModules()
  }, [courseId])

  const selectedCourse = useMemo(
    () => subjects.find((s) => s.subject.id === courseId),
    [subjects, courseId]
  )

  const handleGenerate = async () => {
    if (!courseId || !topic) return
    setIsGenerating(true)
    setSaveStatus(null)

    try {
      if (planType === 'module') {
        const response = await authFetch('/api/teacher/ai/generate-module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            courseName: selectedCourse?.subject?.name,
            gradeLevel: selectedCourse?.section?.grade_level,
            learningObjectives: objectives
              .split('\n')
              .map((o) => o.trim())
              .filter(Boolean),
            lessonCount,
            durationMinutes,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          alert(data.error || 'Failed to generate module')
        } else {
          setModuleDraft(data.draft)
          setAssessmentDraft(null)
        }
      } else {
        const types = Object.entries(questionTypes)
          .filter(([, enabled]) => enabled)
          .map(([key]) => key)

        const baseModule = courseModules.find((m) => m.id === baseModuleId)
        const baseLesson = courseLessons.find((l) => l.id === baseLessonId)

        const response = await authFetch('/api/teacher/ai/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            courseName: selectedCourse?.subject?.name,
            gradeLevel: selectedCourse?.section?.grade_level,
            questionCount,
            difficulty,
            questionTypes: types,
            includeTags: true,
            moduleTitle: baseModule?.title || null,
            moduleDescription: baseModule?.description || null,
            moduleLearningObjectives: baseModule?.learning_objectives || null,
            lessonTitle: baseLesson?.title || null,
            lessonContent: baseLesson?.content || null,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          alert(data.error || 'Failed to generate assessment')
        } else {
          const draftTitle = baseLesson
            ? `${baseLesson.title} Assessment`
            : baseModule
            ? `${baseModule.title} Assessment`
            : `${topic} Assessment`
          setAssessmentSaved(false)
          setAssessmentDraft({
            title: draftTitle,
            type: assessmentType,
            instructions: '',
            due_date: '',
            time_limit_minutes: null,
            max_attempts: 1,
            publish_now: false,
            lesson_id: baseLessonId || undefined,
            grading_period_id: selectedGradingPeriodId || undefined,
            questions: data.questions || [],
          })
          // Pre-select the base module in the draft linker
          if (baseModuleId) setSelectedModuleId(baseModuleId)
          setModuleDraft(null)
        }
      }
    } catch (error) {
      console.error('Generate draft error:', error)
      alert('Failed to generate draft')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveModule = async () => {
    if (!moduleDraft) return
    setSaveStatus(null)
    try {
      const response = await authFetch('/api/teacher/ai/save-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: moduleDraft.title,
          description: moduleDraft.description,
          learningObjectives: moduleDraft.learning_objectives,
          lessons: moduleDraft.lessons,
          durationMinutes,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        alert(data.error || 'Failed to save module')
      } else {
        setSaveStatus('Module saved successfully.')
        setSuccessMessage(`Module "${moduleDraft.title}" has been saved successfully with ${moduleDraft.lessons.length} lesson${moduleDraft.lessons.length !== 1 ? 's' : ''}.`)
        setShowSuccessModal(true)
      }
    } catch (error) {
      console.error('Save module error:', error)
      alert('Failed to save module')
    }
  }

  const handleSaveAssessment = async () => {
    if (!assessmentDraft || isSavingAssessment) return
    setIsSavingAssessment(true)
    setSaveStatus(null)

    // Generate stable idempotency key on first save attempt
    const key = assessmentIdempotencyKey || crypto.randomUUID()
    if (!assessmentIdempotencyKey) setAssessmentIdempotencyKey(key)

    try {
      const response = await authFetch('/api/teacher/ai/save-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonId: assessmentDraft.lesson_id || null,
          moduleId: selectedModuleId || null,
          idempotency_key: key,
          title: assessmentDraft.title,
          type: assessmentDraft.type,
          instructions: assessmentDraft.instructions,
          dueDate: assessmentDraft.due_date || null,
          timeLimitMinutes: assessmentDraft.time_limit_minutes,
          maxAttempts: assessmentDraft.max_attempts,
          publishNow: assessmentDraft.publish_now,
          questions: assessmentDraft.questions,
          gradingPeriodId: assessmentDraft.grading_period_id || null,
          minWordCount: assessmentDraft.min_word_count ?? null,
          maxWordCount: assessmentDraft.max_word_count ?? null,
          requiresFileUpload: assessmentDraft.requires_file_upload ?? false,
          fileUploadInstructions: assessmentDraft.file_upload_instructions ?? null,
          allowedFileTypes: assessmentDraft.allowed_file_types ?? 'any',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAssessmentIdempotencyKey('') // reset so retry gets a fresh key
        alert(data.error || 'Failed to save assessment')
      } else {
        setSaveStatus('Assessment saved successfully.')
        setSuccessMessage(`Assessment "${assessmentDraft.title}" has been saved successfully with ${assessmentDraft.questions.length} question${assessmentDraft.questions.length !== 1 ? 's' : ''}.`)
        setShowSuccessModal(true)
        setAssessmentSaved(true)
        setAssessmentIdempotencyKey('') // reset for next draft
      }
    } catch (error) {
      console.error('Save assessment error:', error)
      setAssessmentIdempotencyKey('') // reset so retry works
      alert('Failed to save assessment')
    } finally {
      setIsSavingAssessment(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSuccessModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Saved Successfully!</h3>
            <p className="text-slate-500 text-sm mb-6">{successMessage}</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-2.5 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          AI Planner
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
          Create modules and assessments with AI, then edit before saving.
        </p>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Plan Type</label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as 'module' | 'assessment')}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="module">Module Plan</option>
              <option value="assessment">Assessment Plan</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Course</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              disabled={loadingSubjects}
            >
              <option value="">{loadingSubjects ? 'Loading...' : 'Select course'}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.subject.id}>
                  {subject.subject.name} {subject.subject.subject_code ? `(${subject.subject.subject_code})` : ''}
                  {subject.section?.name ? ` - ${subject.section.name}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-700">Topic or Theme</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="e.g., Quadratic Equations"
          />
        </div>

        {planType === 'module' ? (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
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
            <div>
              <label className="text-sm font-semibold text-slate-700">Total Duration (min)</label>
              <input
                type="number"
                min={10}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Learning Objectives</label>
              <textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 h-24"
                placeholder="One objective per line"
              />
            </div>
          </div>
        ) : (
          <>
            {/* Module / Lesson basis */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Base on Module <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  value={baseModuleId}
                  onChange={(e) => {
                    const id = e.target.value
                    setBaseModuleId(id)
                    setBaseLessonId('')
                    // Auto-fill topic from module title
                    const mod = courseModules.find((m) => m.id === id)
                    if (mod) setTopic(mod.title)
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loadingModules || !courseId}
                >
                  <option value="">{!courseId ? 'Select course first' : loadingModules ? 'Loading...' : 'None — use custom topic'}</option>
                  {courseModules.map((mod) => (
                    <option key={mod.id} value={mod.id}>{mod.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Specific Lesson / Topic <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select
                  value={baseLessonId}
                  onChange={(e) => {
                    const id = e.target.value
                    setBaseLessonId(id)
                    // Auto-fill topic from lesson title
                    const lesson = courseLessons.find((l) => l.id === id)
                    if (lesson) setTopic(lesson.title)
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loadingLessons || !courseId}
                >
                  <option value="">{!courseId ? 'Select course first' : loadingLessons ? 'Loading...' : 'None — cover whole module'}</option>
                  {(baseModuleId
                    ? courseLessons.filter((l) => l.module_id === baseModuleId)
                    : courseLessons
                  ).map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {!baseModuleId && lesson.module_title ? `${lesson.module_title} — ` : ''}{lesson.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700">Assessment Type</label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value as AssessmentDraft['type'])}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <optgroup label="Written Work">
                    <option value="essay">Essay</option>
                    <option value="assignment">Assignment</option>
                  </optgroup>
                  <optgroup label="Performance Task">
                    <option value="short_quiz">Short Quiz</option>
                    <option value="long_quiz">Long Quiz</option>
                  </optgroup>
                  <optgroup label="Quarterly Assessment">
                    <option value="exam">Exam</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Grading Period</label>
                <select
                  value={selectedGradingPeriodId}
                  onChange={(e) => setSelectedGradingPeriodId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">None</option>
                  {gradingPeriods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.is_active ? ' ✓' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
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
              <div>
                <label className="text-sm font-semibold text-slate-700">Question Types</label>
                <div className="mt-2 space-y-2 text-sm">
                  {Object.entries(questionTypes).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          setQuestionTypes((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                      />
                      {key.replace('_', ' ')}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleGenerate} disabled={!courseId || !topic || isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Draft'}
          </Button>
          {saveStatus && <span className="text-sm text-green-700">{saveStatus}</span>}
        </div>
      </Card>

      {moduleDraft && (
        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Module Draft</h2>
            <div>
              <label className="text-sm font-semibold text-slate-700">Title</label>
              <input
                value={moduleDraft.title}
                onChange={(e) => setModuleDraft({ ...moduleDraft, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <textarea
                value={moduleDraft.description}
                onChange={(e) => setModuleDraft({ ...moduleDraft, description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 h-24"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Learning Objectives</label>
              <textarea
                value={moduleDraft.learning_objectives.join('\n')}
                onChange={(e) =>
                  setModuleDraft({
                    ...moduleDraft,
                    learning_objectives: e.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 h-24"
              />
            </div>
            <div className="space-y-3">
              {moduleDraft.lessons.map((lesson, index) => (
                <div key={`${lesson.title}-${index}`} className="rounded-lg border border-slate-200 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Lesson Title</label>
                      <input
                        value={lesson.title}
                        onChange={(e) => {
                          const updated = [...moduleDraft.lessons]
                          updated[index] = { ...lesson, title: e.target.value }
                          setModuleDraft({ ...moduleDraft, lessons: updated })
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Duration (min)</label>
                      <input
                        type="number"
                        value={lesson.duration_minutes || 0}
                        onChange={(e) => {
                          const updated = [...moduleDraft.lessons]
                          updated[index] = {
                            ...lesson,
                            duration_minutes: Number(e.target.value),
                          }
                          setModuleDraft({ ...moduleDraft, lessons: updated })
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs font-semibold text-slate-600">Lesson Content</label>
                    <textarea
                      value={lesson.content}
                      onChange={(e) => {
                        const updated = [...moduleDraft.lessons]
                        updated[index] = { ...lesson, content: e.target.value }
                        setModuleDraft({ ...moduleDraft, lessons: updated })
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 h-24"
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleSaveModule}>Save Module</Button>
          </div>
        </Card>
      )}

      {assessmentDraft && (
        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Assessment Draft</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">Title</label>
                <input
                  value={assessmentDraft.title}
                  onChange={(e) => setAssessmentDraft({ ...assessmentDraft, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Type</label>
                <select
                  value={assessmentDraft.type}
                  onChange={(e) =>
                    setAssessmentDraft({
                      ...assessmentDraft,
                      type: e.target.value as AssessmentDraft['type'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <optgroup label="Written Work">
                    <option value="essay">Essay</option>
                    <option value="assignment">Assignment</option>
                  </optgroup>
                  <optgroup label="Performance Task">
                    <option value="short_quiz">Short Quiz</option>
                    <option value="long_quiz">Long Quiz</option>
                  </optgroup>
                  <optgroup label="Quarterly Assessment">
                    <option value="exam">Exam</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Grading Period</label>
                <select
                  value={assessmentDraft.grading_period_id || ''}
                  onChange={(e) =>
                    setAssessmentDraft({ ...assessmentDraft, grading_period_id: e.target.value || undefined })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">None</option>
                  {gradingPeriods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.is_active ? ' ✓' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Link to Module</label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loadingModules}
                >
                  <option value="">{loadingModules ? 'Loading...' : 'None (course-level)'}</option>
                  {courseModules.map((mod) => (
                    <option key={mod.id} value={mod.id}>{mod.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Linked Lesson</label>
                <select
                  value={assessmentDraft.lesson_id || ''}
                  onChange={(e) =>
                    setAssessmentDraft({ ...assessmentDraft, lesson_id: e.target.value || undefined })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  disabled={loadingLessons}
                >
                  <option value="">{loadingLessons ? 'Loading...' : 'None (course-level)'}</option>
                  {(selectedModuleId
                    ? courseLessons.filter((l) => l.module_id === selectedModuleId)
                    : courseLessons
                  ).map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {!selectedModuleId && lesson.module_title ? `${lesson.module_title} — ` : ''}{lesson.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Instructions</label>
              <textarea
                value={assessmentDraft.instructions}
                onChange={(e) =>
                  setAssessmentDraft({ ...assessmentDraft, instructions: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 h-24"
              />
            </div>

            {/* Essay: Word Count Requirement */}
            {assessmentDraft.type === 'essay' && (
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">text_fields</span>
                  Word Count Requirement
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Min Words</label>
                    <input
                      type="number"
                      min={0}
                      value={assessmentDraft.min_word_count ?? ''}
                      onChange={(e) => setAssessmentDraft({ ...assessmentDraft, min_word_count: parseInt(e.target.value) || null })}
                      placeholder="No minimum"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Max Words</label>
                    <input
                      type="number"
                      min={0}
                      value={assessmentDraft.max_word_count ?? ''}
                      onChange={(e) => setAssessmentDraft({ ...assessmentDraft, max_word_count: parseInt(e.target.value) || null })}
                      placeholder="No maximum"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Assignment: File Upload */}
            {assessmentDraft.type === 'assignment' && (
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={assessmentDraft.requires_file_upload ?? false}
                    onChange={(e) => setAssessmentDraft({ ...assessmentDraft, requires_file_upload: e.target.checked })}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">attach_file</span>
                    Require file upload from students
                  </span>
                </label>
                {assessmentDraft.requires_file_upload && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Allowed File Types</label>
                      <select
                        value={assessmentDraft.allowed_file_types ?? 'any'}
                        onChange={(e) => setAssessmentDraft({ ...assessmentDraft, allowed_file_types: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      >
                        <option value="any">Any files (images, PDF, documents, etc.)</option>
                        <option value="images">Images only (JPG, PNG, GIF, WEBP)</option>
                        <option value="pdf">PDF only</option>
                        <option value="documents">Documents (PDF, DOC, DOCX)</option>
                        <option value="images,pdf">Images and PDF</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Upload Instructions (optional)</label>
                      <textarea
                        value={assessmentDraft.file_upload_instructions ?? ''}
                        onChange={(e) => setAssessmentDraft({ ...assessmentDraft, file_upload_instructions: e.target.value })}
                        rows={2}
                        placeholder="e.g. Upload your completed worksheet as a PDF."
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">Due Date</label>
                <input
                  type="datetime-local"
                  value={assessmentDraft.due_date || ''}
                  onChange={(e) =>
                    setAssessmentDraft({ ...assessmentDraft, due_date: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Time Limit (min)</label>
                <input
                  type="number"
                  value={assessmentDraft.time_limit_minutes || 0}
                  onChange={(e) =>
                    setAssessmentDraft({
                      ...assessmentDraft,
                      time_limit_minutes: Number(e.target.value) || null,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Max Attempts</label>
                <input
                  type="number"
                  value={assessmentDraft.max_attempts || 1}
                  onChange={(e) =>
                    setAssessmentDraft({
                      ...assessmentDraft,
                      max_attempts: Number(e.target.value) || 1,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={assessmentDraft.publish_now || false}
                onChange={(e) =>
                  setAssessmentDraft({ ...assessmentDraft, publish_now: e.target.checked })
                }
              />
              Publish immediately for students
            </label>

            <div className="space-y-3">
              {assessmentDraft.questions.map((question, index) => (
                <div key={`${question.question_text}-${index}`} className="rounded-lg border border-slate-200 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Question</label>
                      <textarea
                        value={question.question_text}
                        onChange={(e) => {
                          const updated = [...assessmentDraft.questions]
                          updated[index] = { ...question, question_text: e.target.value }
                          setAssessmentDraft({ ...assessmentDraft, questions: updated })
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 h-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Type</label>
                        <select
                          value={question.question_type}
                          onChange={(e) => {
                            const updated = [...assessmentDraft.questions]
                            updated[index] = {
                              ...question,
                              question_type: e.target.value as AssessmentDraft['questions'][number]['question_type'],
                            }
                            setAssessmentDraft({ ...assessmentDraft, questions: updated })
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false">True/False</option>
                          <option value="short_answer">Short Answer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Points</label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => {
                            const updated = [...assessmentDraft.questions]
                            updated[index] = { ...question, points: Number(e.target.value) }
                            setAssessmentDraft({ ...assessmentDraft, questions: updated })
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {question.question_type === 'multiple_choice' && (
                    <div className="mt-3 space-y-2">
                      {question.options?.map((option, optionIndex) => (
                        <div key={`${option.text}-${optionIndex}`} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={option.isCorrect}
                            onChange={() => {
                              const updated = [...assessmentDraft.questions]
                              const options = (question.options || []).map((opt, idx) => ({
                                ...opt,
                                isCorrect: idx === optionIndex,
                              }))
                              updated[index] = { ...question, options }
                              setAssessmentDraft({ ...assessmentDraft, questions: updated })
                            }}
                          />
                          <input
                            value={option.text}
                            onChange={(e) => {
                              const updated = [...assessmentDraft.questions]
                              const options = (question.options || []).slice()
                              options[optionIndex] = { ...option, text: e.target.value }
                              updated[index] = { ...question, options }
                              setAssessmentDraft({ ...assessmentDraft, questions: updated })
                            }}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {question.question_type !== 'multiple_choice' && (
                    <div className="mt-3">
                      <label className="text-xs font-semibold text-slate-600">Correct Answer</label>
                      <input
                        value={question.correct_answer || ''}
                        onChange={(e) => {
                          const updated = [...assessmentDraft.questions]
                          updated[index] = { ...question, correct_answer: e.target.value }
                          setAssessmentDraft({ ...assessmentDraft, questions: updated })
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveAssessment} disabled={isSavingAssessment || assessmentSaved}>
                {isSavingAssessment ? 'Saving...' : assessmentSaved ? 'Saved' : 'Save Assessment'}
              </Button>
              {assessmentSaved && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Assessment saved successfully!
                </span>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
