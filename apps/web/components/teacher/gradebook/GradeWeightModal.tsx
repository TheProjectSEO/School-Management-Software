'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import type { GradeWeightConfig, AssessmentTypeForWeighting } from '@/lib/dal/types/gradebook'

interface GradeWeightModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  periodId: string
  currentWeights: GradeWeightConfig[]
  onSave: () => void
}

interface WeightFormData {
  assessment_type: AssessmentTypeForWeighting
  weight_percent: number
  drop_lowest: number
  enabled: boolean
}

const ASSESSMENT_TYPES: {
  type: AssessmentTypeForWeighting
  label: string
  icon: string
}[] = [
  { type: 'quiz', label: 'Quizzes', icon: 'quiz' },
  { type: 'exam', label: 'Exams', icon: 'school' },
  { type: 'assignment', label: 'Assignments', icon: 'assignment' },
  { type: 'project', label: 'Projects', icon: 'folder' },
  { type: 'participation', label: 'Participation', icon: 'groups' },
  { type: 'midterm', label: 'Midterm', icon: 'event' },
  { type: 'final', label: 'Final Exam', icon: 'flag' },
]

export default function GradeWeightModal({
  isOpen,
  onClose,
  courseId,
  periodId,
  currentWeights,
  onSave,
}: GradeWeightModalProps) {
  const [weights, setWeights] = useState<WeightFormData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form data from current weights
  useEffect(() => {
    const initialWeights = ASSESSMENT_TYPES.map((at) => {
      const existing = currentWeights.find(
        (w) => w.assessment_type === at.type
      )
      return {
        assessment_type: at.type,
        weight_percent: existing?.weight_percent ?? 0,
        drop_lowest: existing?.drop_lowest ?? 0,
        enabled: (existing?.weight_percent ?? 0) > 0,
      }
    })
    setWeights(initialWeights)
  }, [currentWeights, isOpen])

  // Calculate total weight
  const totalWeight = weights
    .filter((w) => w.enabled)
    .reduce((sum, w) => sum + w.weight_percent, 0)

  const isValidTotal = Math.abs(totalWeight - 100) < 0.01

  // Handle weight change
  const handleWeightChange = (
    type: AssessmentTypeForWeighting,
    field: keyof WeightFormData,
    value: number | boolean
  ) => {
    setWeights((prev) =>
      prev.map((w) => {
        if (w.assessment_type === type) {
          const updated = { ...w, [field]: value }
          // If disabling, reset weight to 0
          if (field === 'enabled' && !value) {
            updated.weight_percent = 0
          }
          // If enabling with 0 weight, set a default
          if (field === 'enabled' && value && w.weight_percent === 0) {
            updated.weight_percent = 10
          }
          return updated
        }
        return w
      })
    )
    setError(null)
  }

  // Auto-distribute weights evenly
  const distributeEvenly = () => {
    const enabledCount = weights.filter((w) => w.enabled).length
    if (enabledCount === 0) return

    const evenWeight = Math.floor(100 / enabledCount)
    const remainder = 100 - evenWeight * enabledCount

    setWeights((prev) => {
      let remainderApplied = 0
      return prev.map((w) => {
        if (w.enabled) {
          const extra = remainderApplied < remainder ? 1 : 0
          remainderApplied++
          return { ...w, weight_percent: evenWeight + extra }
        }
        return w
      })
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isValidTotal) {
      setError('Weights must sum to 100%')
      return
    }

    setIsSubmitting(true)

    try {
      const enabledWeights = weights
        .filter((w) => w.enabled && w.weight_percent > 0)
        .map((w) => ({
          course_id: courseId,
          grading_period_id: periodId,
          assessment_type: w.assessment_type,
          weight_percent: w.weight_percent,
          drop_lowest: w.drop_lowest,
        }))

      const response = await fetch('/api/teacher/gradebook/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          periodId,
          weights: enabledWeights,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save weight configuration')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Grade Weight Configuration
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Configure how different assessment types contribute to the final grade.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
              close
            </span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                  error
                </span>
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Total Weight Indicator */}
          <div
            className={`flex items-center justify-between p-4 rounded-lg ${
              isValidTotal
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`material-symbols-outlined ${
                  isValidTotal
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isValidTotal ? 'check_circle' : 'warning'}
              </span>
              <span
                className={`font-medium ${
                  isValidTotal
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                Total: {totalWeight}%
              </span>
            </div>
            <button
              type="button"
              onClick={distributeEvenly}
              className="text-sm text-primary hover:underline font-medium"
            >
              Distribute Evenly
            </button>
          </div>

          {/* Weight Configuration */}
          <div className="space-y-4">
            {ASSESSMENT_TYPES.map((at) => {
              const weight = weights.find((w) => w.assessment_type === at.type)
              if (!weight) return null

              return (
                <div
                  key={at.type}
                  className={`p-4 rounded-lg border transition-colors ${
                    weight.enabled
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Enable Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={weight.enabled}
                        onChange={(e) =>
                          handleWeightChange(at.type, 'enabled', e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>

                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        weight.enabled
                          ? 'bg-primary/10'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined ${
                          weight.enabled
                            ? 'text-primary'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {at.icon}
                      </span>
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-semibold ${
                          weight.enabled
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {at.label}
                      </div>
                    </div>

                    {/* Weight Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={weight.weight_percent}
                        onChange={(e) =>
                          handleWeightChange(
                            at.type,
                            'weight_percent',
                            parseInt(e.target.value)
                          )
                        }
                        disabled={!weight.enabled}
                        className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-primary"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={weight.weight_percent}
                        onChange={(e) =>
                          handleWeightChange(
                            at.type,
                            'weight_percent',
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={!weight.enabled}
                        className="w-16 h-9 px-2 text-center text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Drop Lowest Option */}
                  {weight.enabled && (
                    <div className="mt-4 pl-16 flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={weight.drop_lowest > 0}
                          onChange={(e) =>
                            handleWeightChange(
                              at.type,
                              'drop_lowest',
                              e.target.checked ? 1 : 0
                            )
                          }
                          className="w-4 h-4 text-primary bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-primary"
                        />
                        Drop lowest
                      </label>
                      {weight.drop_lowest > 0 && (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={weight.drop_lowest}
                          onChange={(e) =>
                            handleWeightChange(
                              at.type,
                              'drop_lowest',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-14 h-8 px-2 text-center text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      )}
                      {weight.drop_lowest > 0 && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          score{weight.drop_lowest > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValidTotal}>
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-lg mr-2 animate-spin">
                    progress_activity
                  </span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg mr-2">
                    save
                  </span>
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
