'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import QuestionEditorModal from './QuestionEditorModal'
import QuestionBankSelectorModal from './QuestionBankSelectorModal'

interface Question {
  id?: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  choices_json?: any[]
  answer_key_json?: any
  points: number
  difficulty?: 'easy' | 'medium' | 'hard'
  tags?: string[]
  explanation?: string
  order?: number
}

interface AssessmentBuilderProps {
  assessment: any
}

export default function AssessmentBuilder({ assessment }: AssessmentBuilderProps) {
  const [formData, setFormData] = useState({
    title: assessment.title || '',
    type: assessment.type || 'quiz',
    due_date: assessment.due_date || '',
    time_limit_minutes: assessment.time_limit_minutes || '',
    max_attempts: assessment.max_attempts || 1,
    instructions: assessment.instructions || '',
    course_id: assessment.course_id || '',
  })

  const [questions, setQuestions] = useState<Question[]>(assessment.questions || [])
  const [showQuestionEditor, setShowQuestionEditor] = useState(false)
  const [showBankSelector, setShowBankSelector] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  const handleSaveQuestion = (question: Question) => {
    if (editingQuestion) {
      // Update existing question
      setQuestions(questions.map(q =>
        q.id === editingQuestion.id ? { ...question, id: editingQuestion.id } : q
      ))
      setEditingQuestion(null)
    } else {
      // Add new question
      setQuestions([...questions, { ...question, id: crypto.randomUUID(), order: questions.length }])
    }
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setShowQuestionEditor(true)
  }

  const handleDeleteQuestion = (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      setQuestions(questions.filter(q => q.id !== questionId))
    }
  }

  const handleAddFromBank = (selectedQuestions: any[]) => {
    const newQuestions = selectedQuestions.map((q, index) => ({
      ...q,
      id: crypto.randomUUID(),
      order: questions.length + index
    }))
    setQuestions([...questions, ...newQuestions])
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex >= 0 && targetIndex < newQuestions.length) {
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]]
      // Update order
      newQuestions.forEach((q, i) => q.order = i)
      setQuestions(newQuestions)
    }
  }

  const getTotalPoints = () => {
    return questions.reduce((sum, q) => sum + q.points, 0)
  }

  const handleSave = async () => {
    try {
      const assessmentData = {
        ...formData,
        questions,
        total_points: getTotalPoints(),
        status: 'draft'
      }

      const url = assessment.id
        ? `/api/teacher/assessments/${assessment.id}`
        : '/api/teacher/assessments'

      const response = await fetch(url, {
        method: assessment.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save assessment')
      }

      const { assessment: savedAssessment } = await response.json()
      alert('Assessment saved successfully!')

      // Redirect to assessment list or refresh
      if (!assessment.id) {
        window.location.href = `/teacher/assessments/${savedAssessment.id}`
      }
    } catch (error) {
      console.error('Error saving assessment:', error)
      alert(error instanceof Error ? error.message : 'Failed to save assessment')
    }
  }

  const handlePublish = async () => {
    if (questions.length === 0) {
      alert('Please add at least one question before publishing')
      return
    }

    if (!confirm('Are you sure you want to publish this assessment? Students will be able to see it.')) {
      return
    }

    try {
      const assessmentData = {
        ...formData,
        questions,
        total_points: getTotalPoints(),
        status: 'published'
      }

      const url = assessment.id
        ? `/api/teacher/assessments/${assessment.id}`
        : '/api/teacher/assessments'

      const response = await fetch(url, {
        method: assessment.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to publish assessment')
      }

      const { assessment: publishedAssessment } = await response.json()
      alert('Assessment published successfully!')

      // Redirect to assessment list or refresh
      window.location.href = `/teacher/assessments/${publishedAssessment.id}`
    } catch (error) {
      console.error('Error publishing assessment:', error)
      alert(error instanceof Error ? error.message : 'Failed to publish assessment')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Assessment Builder
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create and configure assessments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSave}>
            <span className="material-symbols-outlined text-lg">save</span>
            Save Draft
          </Button>
          <Button onClick={handlePublish}>
            <span className="material-symbols-outlined text-lg">publish</span>
            Publish
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">settings</span>
              <span>Settings</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="questions">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">quiz</span>
              <span>Questions</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="bank-rules">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">smart_toy</span>
              <span>Bank Rules</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="preview">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">visibility</span>
              <span>Preview</span>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Basic Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Assessment Title
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter assessment title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project</option>
                    <option value="midterm">Midterm Exam</option>
                    <option value="final">Final Exam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Instructions
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Enter instructions for students"
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Due Date
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Time Limit (minutes)
                  </label>
                  <Input
                    type="number"
                    value={formData.time_limit_minutes}
                    onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value })}
                    placeholder="Leave empty for no time limit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Maximum Attempts
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_attempts}
                    onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Rubric
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">No rubric</option>
                    <option value="1">Essay Rubric</option>
                    <option value="2">Project Rubric</option>
                  </select>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Questions
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {questions.length} question{questions.length !== 1 ? 's' : ''} • {getTotalPoints()} total points
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowBankSelector(true)}>
                  <span className="material-symbols-outlined text-base">library_add</span>
                  Add from Bank
                </Button>
                <Button size="sm" onClick={() => {
                  setEditingQuestion(null)
                  setShowQuestionEditor(true)
                }}>
                  <span className="material-symbols-outlined text-base">add</span>
                  Create New
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.length > 0 ? (
                questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Drag Handle & Order Number */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 w-6 text-center">
                          {index + 1}
                        </span>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveQuestion(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">arrow_upward</span>
                          </button>
                          <button
                            onClick={() => moveQuestion(index, 'down')}
                            disabled={index === questions.length - 1}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">arrow_downward</span>
                          </button>
                        </div>
                      </div>

                      {/* Question Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="info">
                            {question.question_type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="default">{question.points} pts</Badge>
                          {question.difficulty && (
                            <Badge variant={
                              question.difficulty === 'easy' ? 'success' :
                              question.difficulty === 'hard' ? 'danger' : 'warning'
                            }>
                              {question.difficulty}
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 font-medium mb-2">
                          {question.question_text}
                        </p>
                        {question.tags && question.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {question.tags.map((tag) => (
                              <Badge key={tag} variant="info" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEditQuestion(question)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id!)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-red-600"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* Empty State */
                <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                  <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">
                    quiz
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    No questions added yet
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" onClick={() => setShowBankSelector(true)}>
                      <span className="material-symbols-outlined text-lg">library_add</span>
                      Add from Bank
                    </Button>
                    <Button onClick={() => {
                      setEditingQuestion(null)
                      setShowQuestionEditor(true)
                    }}>
                      <span className="material-symbols-outlined text-lg">add</span>
                      Create New Question
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Bank Rules Tab */}
        <TabsContent value="bank-rules">
          <Card>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Randomization Rules
            </h2>
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600">info</span>
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Question Bank Randomization
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Configure how questions are selected from banks for each student attempt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="randomize"
                    className="w-4 h-4 text-primary"
                  />
                  <label htmlFor="randomize" className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Enable random question selection
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Number of questions to select from bank
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="10"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="shuffle"
                    className="w-4 h-4 text-primary"
                  />
                  <label htmlFor="shuffle" className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Shuffle answer options
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="seed"
                    className="w-4 h-4 text-primary"
                  />
                  <label htmlFor="seed" className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Use seed mode (same questions for all attempts by a student)
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">visibility</span>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Student Preview
              </h2>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 bg-slate-50 dark:bg-slate-900">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {formData.title || 'Assessment Title'}
                </h3>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">category</span>
                    <span className="capitalize">{formData.type}</span>
                  </div>
                  {formData.time_limit_minutes && (
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      <span>{formData.time_limit_minutes} minutes</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">replay</span>
                    <span>{formData.max_attempts} attempt{formData.max_attempts > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {formData.instructions && (
                <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Instructions
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400">
                    {formData.instructions}
                  </p>
                </div>
              )}

              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                Questions will appear here
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <QuestionEditorModal
        isOpen={showQuestionEditor}
        onClose={() => {
          setShowQuestionEditor(false)
          setEditingQuestion(null)
        }}
        onSave={handleSaveQuestion}
        question={editingQuestion}
      />

      <QuestionBankSelectorModal
        isOpen={showBankSelector}
        onClose={() => setShowBankSelector(false)}
        onSelect={handleAddFromBank}
        courseId={formData.course_id}
      />
    </div>
  )
}
