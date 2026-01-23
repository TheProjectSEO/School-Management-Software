'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

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

type AssessmentDraft = {
  title: string
  type: 'quiz' | 'exam' | 'assignment' | 'project'
  instructions: string
  due_date?: string
  time_limit_minutes?: number | null
  max_attempts?: number | null
  publish_now?: boolean
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
  const [isGenerating, setIsGenerating] = useState(false)
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft | null>(null)
  const [assessmentDraft, setAssessmentDraft] = useState<AssessmentDraft | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await fetch('/api/teacher/subjects')
        if (!res.ok) return
        const data = await res.json()
        setSubjects(data.subjects || [])
      } catch (error) {
        console.error('Failed to load subjects:', error)
      } finally {
        setLoadingSubjects(false)
      }
    }

    loadSubjects()
  }, [])

  useEffect(() => {
    const preselected = searchParams.get('courseId')
    if (preselected) {
      setCourseId(preselected)
    }
  }, [searchParams])

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
        const response = await fetch('/api/teacher/ai/generate-module', {
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

        const response = await fetch('/api/teacher/ai/generate-quiz', {
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
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          alert(data.error || 'Failed to generate assessment')
        } else {
          setAssessmentDraft({
            title: `${topic} Assessment`,
            type: 'quiz',
            instructions: '',
            due_date: '',
            time_limit_minutes: null,
            max_attempts: 1,
            publish_now: false,
            questions: data.questions || [],
          })
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
      const response = await fetch('/api/teacher/ai/save-module', {
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
      }
    } catch (error) {
      console.error('Save module error:', error)
      alert('Failed to save module')
    }
  }

  const handleSaveAssessment = async () => {
    if (!assessmentDraft) return
    setSaveStatus(null)
    try {
      const response = await fetch('/api/teacher/ai/save-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: assessmentDraft.title,
          type: assessmentDraft.type,
          instructions: assessmentDraft.instructions,
          dueDate: assessmentDraft.due_date || null,
          timeLimitMinutes: assessmentDraft.time_limit_minutes,
          maxAttempts: assessmentDraft.max_attempts,
          publishNow: assessmentDraft.publish_now,
          questions: assessmentDraft.questions,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        alert(data.error || 'Failed to save assessment')
      } else {
        setSaveStatus('Assessment saved successfully.')
      }
    } catch (error) {
      console.error('Save assessment error:', error)
      alert('Failed to save assessment')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            AI Planner
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create modules and assessments with AI, then edit before saving.
          </p>
        </div>
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
            <div className="grid gap-4 md:grid-cols-2">
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
                  <option value="quiz">Quiz</option>
                  <option value="exam">Exam</option>
                  <option value="assignment">Assignment</option>
                  <option value="project">Project</option>
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

            <Button onClick={handleSaveAssessment}>Save Assessment</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
