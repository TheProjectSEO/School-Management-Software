'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface QuestionBank {
  id: string
  name: string
  description: string | null
  course_id: string
  course?: {
    id: string
    name: string
  }
  created_at: string
}

interface BankQuestion {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  explanation: string | null
  choices_json?: {
    options: { text: string; is_correct: boolean }[]
  }
  answer_key_json?: {
    correct_answer: string
  }
}

export default function QuestionBankDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bankId = params.bankId as string

  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadBank()
  }, [bankId])

  const loadBank = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/teacher/question-banks/${bankId}`)
      if (!response.ok) throw new Error('Failed to load question bank')
      const data = await response.json()
      setBank(data.bank)
      setQuestions(data.questions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question bank')
    } finally {
      setIsLoading(false)
    }
  }

  const addQuestion = async (question: Partial<BankQuestion>) => {
    try {
      setIsSaving(true)
      const response = await fetch(`/api/teacher/question-banks/${bankId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question)
      })
      if (!response.ok) throw new Error('Failed to add question')
      const newQuestion = await response.json()
      setQuestions([...questions, newQuestion])
      setShowAddModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add question')
    } finally {
      setIsSaving(false)
    }
  }

  const updateQuestion = async (questionId: string, updates: Partial<BankQuestion>) => {
    try {
      setIsSaving(true)
      const response = await fetch(`/api/teacher/question-banks/${bankId}/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update question')
      const updated = await response.json()
      setQuestions(questions.map(q => q.id === questionId ? updated : q))
      setEditingQuestion(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return
    try {
      const response = await fetch(`/api/teacher/question-banks/${bankId}/questions/${questionId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete question')
      setQuestions(questions.filter(q => q.id !== questionId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question')
    }
  }

  const filteredQuestions = questions.filter(q => {
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false
    if (filterType !== 'all' && q.question_type !== filterType) return false
    if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !bank) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg">
          {error || 'Question bank not found'}
        </div>
        <Link href="/teacher/question-banks" className="mt-4 inline-block text-primary hover:underline">
          Back to Question Banks
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101822]">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a2634] border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/teacher/question-banks"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {bank.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {bank.course?.name} • {questions.length} questions
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-[#961517] transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white dark:bg-[#1a2634] border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True/False</option>
            <option value="short_answer">Short Answer</option>
            <option value="essay">Essay</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-4">quiz</span>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No questions found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {questions.length === 0
                ? 'Start building your question bank by adding questions.'
                : 'Try adjusting your filters.'}
            </p>
            {questions.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-[#961517] transition-colors"
              >
                Add First Question
              </button>
            )}
          </div>
        ) : (
          filteredQuestions.map((question, index) => (
            <div
              key={question.id}
              className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    #{index + 1}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {question.question_type.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                    {question.points} pts
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingQuestion(question.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    onClick={() => deleteQuestion(question.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>

              <p className="text-slate-900 dark:text-white font-medium mb-3">
                {question.question_text}
              </p>

              {question.question_type === 'multiple_choice' && question.choices_json?.options && (
                <div className="space-y-1 mb-3">
                  {question.choices_json.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        option.is_correct
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {option.is_correct ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      {option.text}
                    </div>
                  ))}
                </div>
              )}

              {question.tags && question.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {question.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {question.explanation && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Explanation:</span> {question.explanation}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <AddQuestionModal
          onClose={() => setShowAddModal(false)}
          onAdd={addQuestion}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}

interface AddQuestionModalProps {
  onClose: () => void
  onAdd: (question: Partial<BankQuestion>) => void
  isSaving: boolean
}

function AddQuestionModal({ onClose, onAdd, isSaving }: AddQuestionModalProps) {
  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState<BankQuestion['question_type']>('multiple_choice')
  const [points, setPoints] = useState(1)
  const [difficulty, setDifficulty] = useState<BankQuestion['difficulty']>('medium')
  const [options, setOptions] = useState([
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ])
  const [explanation, setExplanation] = useState('')
  const [tags, setTags] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      question_text: questionText,
      question_type: questionType,
      points,
      difficulty,
      explanation: explanation || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      choices_json: questionType === 'multiple_choice' ? { options } : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a2634] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Question</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Question
            </label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={3}
              required
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type
              </label>
              <select
                value={questionType}
                onChange={e => setQuestionType(e.target.value as BankQuestion['question_type'])}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="short_answer">Short Answer</option>
                <option value="essay">Essay</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Points
              </label>
              <input
                type="number"
                value={points}
                onChange={e => setPoints(parseInt(e.target.value) || 1)}
                min={1}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as BankQuestion['difficulty'])}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {questionType === 'multiple_choice' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={option.is_correct}
                      onChange={() => {
                        setOptions(options.map((o, i) => ({ ...o, is_correct: i === index })))
                      }}
                      className="text-primary"
                    />
                    <input
                      type="text"
                      value={option.text}
                      onChange={e => {
                        const newOptions = [...options]
                        newOptions[index].text = e.target.value
                        setOptions(newOptions)
                      }}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Explanation (optional)
            </label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="algebra, equations, basics"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !questionText}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-[#961517] transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : 'Add Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
