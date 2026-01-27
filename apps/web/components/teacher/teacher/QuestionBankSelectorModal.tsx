'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface BankQuestion {
  id: string
  question_text: string
  question_type: string
  points: number
  difficulty?: string
  tags?: string[]
}

interface QuestionBank {
  id: string
  name: string
  description?: string
  question_count: number
  questions?: BankQuestion[]
}

interface QuestionBankSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (questions: BankQuestion[]) => void
  courseId: string
}

export default function QuestionBankSelectorModal({
  isOpen,
  onClose,
  onSelect,
  courseId,
}: QuestionBankSelectorModalProps) {
  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Fetch question banks
  useEffect(() => {
    if (isOpen) {
      fetchBanks()
    }
  }, [isOpen, courseId])

  const fetchBanks = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/teacher/question-banks?course_id=${courseId}`)
      const data = await response.json()
      setBanks(data.banks || [])
    } catch (error) {
      console.error('Error fetching banks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBankQuestions = async (bankId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/teacher/question-banks/${bankId}/questions`)
      const data = await response.json()

      const bank = banks.find(b => b.id === bankId)
      if (bank) {
        setSelectedBank({ ...bank, questions: data.questions || [] })
      }
    } catch (error) {
      console.error('Error fetching bank questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleQuestion = (questionId: string) => {
    const newSelected = new Set(selectedQuestions)
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId)
    } else {
      newSelected.add(questionId)
    }
    setSelectedQuestions(newSelected)
  }

  const toggleAll = () => {
    if (!selectedBank?.questions) return

    const filteredQuestions = getFilteredQuestions()
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)))
    }
  }

  const handleSelect = () => {
    if (!selectedBank?.questions) return

    const questions = selectedBank.questions.filter(q => selectedQuestions.has(q.id))
    onSelect(questions)
    onClose()
    // Reset state
    setSelectedBank(null)
    setSelectedQuestions(new Set())
    setSearchQuery('')
  }

  const getFilteredQuestions = () => {
    if (!selectedBank?.questions) return []

    return selectedBank.questions.filter(q => {
      // Search filter
      if (searchQuery && !q.question_text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      // Difficulty filter
      if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) {
        return false
      }
      // Type filter
      if (filterType !== 'all' && q.question_type !== filterType) {
        return false
      }
      return true
    })
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'success'
      case 'medium': return 'warning'
      case 'hard': return 'danger'
      default: return 'info'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'radio_button_checked'
      case 'true_false': return 'done'
      case 'short_answer': return 'short_text'
      case 'essay': return 'article'
      default: return 'quiz'
    }
  }

  const filteredQuestions = getFilteredQuestions()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Questions from Bank"
      size="xl"
    >
      <div className="space-y-6">
        {!selectedBank ? (
          /* Bank Selection View */
          <>
            <div className="mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose a question bank to select questions from
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : banks.length === 0 ? (
              <Card className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">
                  folder_off
                </span>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  No question banks found for this course
                </p>
                <Button variant="outline">
                  <span className="material-symbols-outlined text-lg">add</span>
                  Create Question Bank
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banks.map((bank) => (
                  <Card
                    key={bank.id}
                    className="hover:border-primary cursor-pointer transition-all"
                    onClick={() => fetchBankQuestions(bank.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-2xl">
                          folder
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 truncate">
                          {bank.name}
                        </h3>
                        {bank.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                            {bank.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="info">
                            {bank.question_count} {bank.question_count === 1 ? 'question' : 'questions'}
                          </Badge>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-primary flex-shrink-0">
                        arrow_forward
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Question Selection View */
          <>
            {/* Bank Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setSelectedBank(null)
                  setSelectedQuestions(new Set())
                  setSearchQuery('')
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {selectedBank.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedQuestions.size} of {filteredQuestions.length} selected
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Types</option>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="essay">Essay</option>
                </select>
              </div>
            </div>

            {/* Select All Button */}
            <div className="flex items-center justify-between py-2">
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedQuestions.size === filteredQuestions.length ? 'Deselect All' : 'Select All'}
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Showing {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Questions List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <Card className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                  search_off
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  No questions match your filters
                </p>
              </Card>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-3">
                {filteredQuestions.map((question) => (
                  <Card
                    key={question.id}
                    className={`cursor-pointer transition-all ${
                      selectedQuestions.has(question.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleQuestion(question.id)}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(question.id)}
                        onChange={() => toggleQuestion(question.id)}
                        className="mt-1 w-4 h-4 text-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-lg text-primary">
                            {getTypeIcon(question.question_type)}
                          </span>
                          <Badge variant={getDifficultyColor(question.difficulty)}>
                            {question.difficulty || 'medium'}
                          </Badge>
                          <Badge variant="default">{question.points} pts</Badge>
                        </div>
                        <p className="text-slate-900 dark:text-slate-100 font-medium line-clamp-2">
                          {question.question_text}
                        </p>
                        {question.tags && question.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {question.tags.map((tag) => (
                              <Badge key={tag} variant="info" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => setSelectedBank(null)}>
                Back
              </Button>
              <Button
                onClick={handleSelect}
                disabled={selectedQuestions.size === 0}
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Add {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
