'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface GradebookCellProps {
  studentId: string
  assessmentId: string
  submissionId?: string
  score?: number
  maxScore: number
  status: string
  pendingGradingCount?: number
  onSave: (
    studentId: string,
    assessmentId: string,
    score: number | null
  ) => Promise<boolean>
  onViewGradingQueue?: (submissionId: string) => void
  disabled?: boolean
}

export default function GradebookCell({
  studentId,
  assessmentId,
  submissionId,
  score,
  maxScore,
  status,
  pendingGradingCount = 0,
  onSave,
  onViewGradingQueue,
  disabled = false,
}: GradebookCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<string>(score?.toString() ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [hasError, setHasError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Calculate percentage
  const percentage = score !== undefined ? (score / maxScore) * 100 : null

  // Determine color based on percentage
  const getColorClasses = () => {
    if (percentage === null) {
      return 'text-slate-400 dark:text-slate-500'
    }
    if (percentage >= 90) {
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
    }
    if (percentage >= 70) {
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
    }
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Reset edit value when score changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(score?.toString() ?? '')
    }
  }, [score, isEditing])

  // Handle save
  const handleSave = useCallback(async () => {
    if (disabled || isSaving) return

    const trimmedValue = editValue.trim()
    const newScore = trimmedValue === '' ? null : parseFloat(trimmedValue)

    // Validate
    if (newScore !== null) {
      if (isNaN(newScore) || newScore < 0) {
        setHasError(true)
        return
      }
      if (newScore > maxScore) {
        // Allow scores above max (extra credit) but show warning
        console.warn('Score exceeds max points')
      }
    }

    // Check if value actually changed
    const currentScore = score ?? null
    if (newScore === currentScore) {
      setIsEditing(false)
      setHasError(false)
      return
    }

    setIsSaving(true)
    setHasError(false)

    try {
      const success = await onSave(studentId, assessmentId, newScore)
      if (success) {
        setIsEditing(false)
      } else {
        setHasError(true)
      }
    } catch (error) {
      console.error('Error saving score:', error)
      setHasError(true)
    } finally {
      setIsSaving(false)
    }
  }, [
    disabled,
    isSaving,
    editValue,
    maxScore,
    score,
    onSave,
    studentId,
    assessmentId,
  ])

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(score?.toString() ?? '')
      setHasError(false)
    } else if (e.key === 'Tab') {
      // Allow tab to save and move to next cell
      handleSave()
    }
  }

  // Handle blur (save on blur)
  const handleBlur = () => {
    handleSave()
  }

  // Handle cell click to start editing
  const handleCellClick = () => {
    if (!disabled && !isSaving) {
      setIsEditing(true)
    }
  }

  // Render editing state
  if (isEditing) {
    return (
      <div className="relative px-1">
        <input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value)
            setHasError(false)
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          min={0}
          step={0.5}
          className={cn(
            'w-full h-8 px-2 text-center text-sm font-medium rounded border-2 transition-colors',
            'focus:outline-none',
            hasError
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-primary bg-white dark:bg-slate-800',
            isSaving && 'opacity-50 cursor-wait'
          )}
        />
        {isSaving && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 rounded">
            <span className="material-symbols-outlined text-primary text-sm animate-spin">
              progress_activity
            </span>
          </div>
        )}
      </div>
    )
  }

  // Handle click on pending grading badge
  const handlePendingClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (submissionId && onViewGradingQueue) {
      onViewGradingQueue(submissionId)
    }
  }

  // Render display state
  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCellClick}
        disabled={disabled}
        className={cn(
          'w-full h-10 px-2 flex items-center justify-center rounded transition-all',
          'hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
          disabled && 'cursor-not-allowed opacity-50',
          getColorClasses()
        )}
      >
        {score !== undefined ? (
          <div className="text-center">
            <div className="text-sm font-semibold">
              {score}
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-0.5">
                /{maxScore}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
        )}
      </button>

      {/* Pending grading indicator */}
      {pendingGradingCount > 0 && (
        <button
          type="button"
          onClick={handlePendingClick}
          className={cn(
            'absolute -top-1 -right-1 flex items-center justify-center',
            'w-5 h-5 rounded-full text-[10px] font-bold',
            'bg-amber-500 text-white shadow-sm',
            'hover:bg-amber-600 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1'
          )}
          title={`${pendingGradingCount} item${pendingGradingCount > 1 ? 's' : ''} pending manual grading`}
        >
          {pendingGradingCount > 9 ? '9+' : pendingGradingCount}
        </button>
      )}
    </div>
  )
}
