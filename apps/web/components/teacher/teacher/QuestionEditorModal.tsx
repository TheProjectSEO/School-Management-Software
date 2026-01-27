'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'

interface Choice {
  id: string
  text: string
  is_correct: boolean
}

interface Question {
  id?: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  choices_json?: Choice[]
  answer_key_json?: any
  points: number
  difficulty?: 'easy' | 'medium' | 'hard'
  tags?: string[]
  explanation?: string
}

interface QuestionEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (question: Question) => void
  question?: Question | null
  bankId?: string
}

export default function QuestionEditorModal({
  isOpen,
  onClose,
  onSave,
  question,
  bankId,
}: QuestionEditorModalProps) {
  const [formData, setFormData] = useState<Question>({
    question_text: '',
    question_type: 'multiple_choice',
    points: 1,
    difficulty: 'medium',
    tags: [],
    explanation: '',
  })

  const [choices, setChoices] = useState<Choice[]>([
    { id: 'a', text: '', is_correct: false },
    { id: 'b', text: '', is_correct: false },
    { id: 'c', text: '', is_correct: false },
    { id: 'd', text: '', is_correct: false },
  ])

  const [tagInput, setTagInput] = useState('')

  // Initialize form data when question changes
  useEffect(() => {
    if (question) {
      setFormData(question)
      if (question.choices_json) {
        setChoices(question.choices_json)
      }
    } else {
      // Reset form
      setFormData({
        question_text: '',
        question_type: 'multiple_choice',
        points: 1,
        difficulty: 'medium',
        tags: [],
        explanation: '',
      })
      setChoices([
        { id: 'a', text: '', is_correct: false },
        { id: 'b', text: '', is_correct: false },
        { id: 'c', text: '', is_correct: false },
        { id: 'd', text: '', is_correct: false },
      ])
    }
  }, [question, isOpen])

  const handleQuestionTypeChange = (type: Question['question_type']) => {
    setFormData({ ...formData, question_type: type })

    if (type === 'true_false') {
      setChoices([
        { id: 'true', text: 'True', is_correct: false },
        { id: 'false', text: 'False', is_correct: false },
      ])
    } else if (type === 'multiple_choice' && choices.length < 4) {
      setChoices([
        { id: 'a', text: '', is_correct: false },
        { id: 'b', text: '', is_correct: false },
        { id: 'c', text: '', is_correct: false },
        { id: 'd', text: '', is_correct: false },
      ])
    }
  }

  const handleChoiceChange = (id: string, text: string) => {
    setChoices(choices.map(c => c.id === id ? { ...c, text } : c))
  }

  const handleCorrectChoiceChange = (id: string, isMultiSelect = false) => {
    if (isMultiSelect) {
      setChoices(choices.map(c =>
        c.id === id ? { ...c, is_correct: !c.is_correct } : c
      ))
    } else {
      setChoices(choices.map(c => ({
        ...c,
        is_correct: c.id === id
      })))
    }
  }

  const addChoice = () => {
    const nextId = String.fromCharCode(97 + choices.length) // a, b, c, d, e, etc.
    setChoices([...choices, { id: nextId, text: '', is_correct: false }])
  }

  const removeChoice = (id: string) => {
    if (choices.length > 2) {
      setChoices(choices.filter(c => c.id !== id))
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()]
      })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag)
    })
  }

  const handleSave = () => {
    // Build answer key based on question type
    let answer_key_json: any = null

    if (formData.question_type === 'multiple_choice' || formData.question_type === 'true_false') {
      answer_key_json = {
        correct_ids: choices.filter(c => c.is_correct).map(c => c.id)
      }
    }

    const questionToSave: Question = {
      ...formData,
      choices_json: ['multiple_choice', 'true_false'].includes(formData.question_type)
        ? choices
        : undefined,
      answer_key_json,
    }

    onSave(questionToSave)
    onClose()
  }

  const isValid = () => {
    if (!formData.question_text.trim()) return false
    if (formData.question_type === 'multiple_choice' || formData.question_type === 'true_false') {
      if (choices.some(c => !c.text.trim())) return false
      if (!choices.some(c => c.is_correct)) return false
    }
    return true
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={question ? 'Edit Question' : 'Create New Question'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Question Type */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
            Question Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'multiple_choice', label: 'Multiple Choice', icon: 'radio_button_checked' },
              { value: 'true_false', label: 'True/False', icon: 'done' },
              { value: 'short_answer', label: 'Short Answer', icon: 'short_text' },
              { value: 'essay', label: 'Essay', icon: 'article' },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => handleQuestionTypeChange(type.value as Question['question_type'])}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  formData.question_type === type.value
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                }`}
              >
                <span className="material-symbols-outlined text-2xl text-primary">
                  {type.icon}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
            Question Text *
          </label>
          <textarea
            value={formData.question_text}
            onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
            placeholder="Enter your question here..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Choices (for MCQ and True/False) */}
        {(formData.question_type === 'multiple_choice' || formData.question_type === 'true_false') && (
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Answer Choices *
            </label>
            <div className="space-y-3">
              {choices.map((choice, index) => (
                <div key={choice.id} className="flex items-start gap-3">
                  <div className="flex items-center pt-3">
                    <input
                      type={formData.question_type === 'multiple_choice' ? 'radio' : 'radio'}
                      name="correct_answer"
                      checked={choice.is_correct}
                      onChange={() => handleCorrectChoiceChange(choice.id)}
                      className="w-4 h-4 text-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={choice.text}
                      onChange={(e) => handleChoiceChange(choice.id, e.target.value)}
                      placeholder={`Choice ${choice.id.toUpperCase()}`}
                      disabled={formData.question_type === 'true_false'}
                    />
                  </div>
                  {formData.question_type === 'multiple_choice' && choices.length > 2 && (
                    <button
                      onClick={() => removeChoice(choice.id)}
                      className="p-2 mt-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {formData.question_type === 'multiple_choice' && (
              <Button
                variant="outline"
                size="sm"
                onClick={addChoice}
                className="mt-3"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add Choice
              </Button>
            )}
          </div>
        )}

        {/* Points, Difficulty, Tags */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Points
            </label>
            <Input
              type="number"
              min="1"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Difficulty
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Question['difficulty'] })}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
            Tags
          </label>
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Type a tag and press Enter"
            />
            <Button size="sm" onClick={addTag}>
              Add
            </Button>
          </div>
          {formData.tags && formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="info" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag}
                  <span className="material-symbols-outlined text-sm ml-1">close</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
            Explanation (shown after submission)
          </label>
          <textarea
            value={formData.explanation || ''}
            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
            placeholder="Provide an explanation for the correct answer..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid()}>
            <span className="material-symbols-outlined text-lg">save</span>
            {question ? 'Update Question' : 'Create Question'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
