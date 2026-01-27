'use client'

import { useState, useMemo } from 'react'
import Button from '@/components/ui/Button'
import type { GradebookAssessment } from '@/lib/dal/types/gradebook'

interface GradebookStudent {
  student_id: string
  student_name: string
  lrn?: string
  profile_id: string
}

interface BulkGradeModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
  assessments: GradebookAssessment[]
  students: GradebookStudent[]
  onSave: () => void
}

interface ParsedRow {
  identifier: string
  score: number | null
  matched: boolean
  studentId?: string
  studentName?: string
  error?: string
}

export default function BulkGradeModal({
  isOpen,
  onClose,
  courseId,
  assessments,
  students,
  onSave,
}: BulkGradeModalProps) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('')
  const [pastedData, setPastedData] = useState('')
  const [identifierColumn, setIdentifierColumn] = useState<'name' | 'lrn'>('name')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'input' | 'preview'>('input')

  // Selected assessment
  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId)

  // Parse pasted data
  const parsedRows = useMemo((): ParsedRow[] => {
    if (!pastedData.trim()) return []

    const lines = pastedData
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    return lines.map((line) => {
      // Try to split by tab, comma, or multiple spaces
      const parts = line.split(/[\t,]|\s{2,}/).map((p) => p.trim())

      if (parts.length < 2) {
        return {
          identifier: line,
          score: null,
          matched: false,
          error: 'Invalid format - expected: identifier, score',
        }
      }

      const identifier = parts[0]
      const scoreStr = parts[parts.length - 1] // Last column is the score
      const score = parseFloat(scoreStr)

      if (isNaN(score)) {
        return {
          identifier,
          score: null,
          matched: false,
          error: `Invalid score: "${scoreStr}"`,
        }
      }

      // Try to match with a student
      let matchedStudent: GradebookStudent | undefined

      if (identifierColumn === 'name') {
        // Fuzzy match by name
        const normalizedIdentifier = identifier.toLowerCase().trim()
        matchedStudent = students.find((s) =>
          s.student_name.toLowerCase().includes(normalizedIdentifier) ||
          normalizedIdentifier.includes(s.student_name.toLowerCase())
        )
      } else {
        // Exact match by LRN
        matchedStudent = students.find(
          (s) => s.lrn?.toLowerCase() === identifier.toLowerCase()
        )
      }

      return {
        identifier,
        score,
        matched: !!matchedStudent,
        studentId: matchedStudent?.student_id,
        studentName: matchedStudent?.student_name,
      }
    })
  }, [pastedData, identifierColumn, students])

  // Statistics
  const matchedCount = parsedRows.filter((r) => r.matched).length
  const unmatchedCount = parsedRows.filter((r) => !r.matched && !r.error).length
  const errorCount = parsedRows.filter((r) => r.error).length

  // Handle submission
  const handleSubmit = async () => {
    if (!selectedAssessmentId) {
      setError('Please select an assessment')
      return
    }

    const validEntries = parsedRows.filter(
      (r) => r.matched && r.score !== null && r.studentId
    )

    if (validEntries.length === 0) {
      setError('No valid entries to submit')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/teacher/gradebook/bulk-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          assessmentId: selectedAssessmentId,
          entries: validEntries.map((e) => ({
            studentId: e.studentId,
            score: e.score,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save grades')
      }

      const result = await response.json()

      if (result.failed > 0) {
        setError(`${result.success} grades saved, ${result.failed} failed`)
      } else {
        onSave()
        handleReset()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form
  const handleReset = () => {
    setSelectedAssessmentId('')
    setPastedData('')
    setStep('input')
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Bulk Grade Entry
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Import grades from a spreadsheet by pasting data.
            </p>
          </div>
          <button
            onClick={() => {
              onClose()
              handleReset()
            }}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
              close
            </span>
          </button>
        </div>

        <div className="p-6 space-y-6">
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

          {step === 'input' && (
            <>
              {/* Step 1: Select Assessment */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Select Assessment
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose an assessment...</option>
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.title} ({assessment.total_points} pts) -{' '}
                      {assessment.type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Choose Identifier */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Match Students By
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="identifier"
                      value="name"
                      checked={identifierColumn === 'name'}
                      onChange={() => setIdentifierColumn('name')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-slate-900 dark:text-slate-100">
                      Student Name
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="identifier"
                      value="lrn"
                      checked={identifierColumn === 'lrn'}
                      onChange={() => setIdentifierColumn('lrn')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-slate-900 dark:text-slate-100">
                      LRN (Learner Reference Number)
                    </span>
                  </label>
                </div>
              </div>

              {/* Step 3: Paste Data */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Paste Grade Data
                </label>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  Paste data from Excel or Google Sheets. Format: Student
                  {identifierColumn === 'name' ? ' Name' : ' LRN'} [tab/comma]
                  Score
                </p>
                <textarea
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder={`Example:\n${
                    identifierColumn === 'name'
                      ? 'Juan Dela Cruz\t85\nMaria Santos\t92'
                      : '123456789012\t85\n987654321098\t92'
                  }`}
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-none"
                />
              </div>

              {/* Preview Stats */}
              {parsedRows.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {matchedCount}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-500">
                      Matched
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                      {unmatchedCount}
                    </div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-500">
                      Not Found
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                      {errorCount}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-500">
                      Errors
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'preview' && (
            <>
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Preview: {selectedAssessment?.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {matchedCount} grades will be submitted
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('input')}>
                  <span className="material-symbols-outlined text-lg mr-2">
                    arrow_back
                  </span>
                  Edit Data
                </Button>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Input
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Matched Student
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {parsedRows.map((row, index) => (
                      <tr
                        key={index}
                        className={
                          row.matched
                            ? 'bg-green-50/50 dark:bg-green-900/10'
                            : row.error
                            ? 'bg-red-50/50 dark:bg-red-900/10'
                            : 'bg-yellow-50/50 dark:bg-yellow-900/10'
                        }
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`material-symbols-outlined ${
                              row.matched
                                ? 'text-green-600'
                                : row.error
                                ? 'text-red-600'
                                : 'text-yellow-600'
                            }`}
                          >
                            {row.matched
                              ? 'check_circle'
                              : row.error
                              ? 'error'
                              : 'help'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-slate-900 dark:text-slate-100">
                          {row.identifier}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.matched ? (
                            <span className="text-slate-900 dark:text-slate-100">
                              {row.studentName}
                            </span>
                          ) : row.error ? (
                            <span className="text-red-600 dark:text-red-400">
                              {row.error}
                            </span>
                          ) : (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              No match found
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {row.score !== null ? (
                            <span className="text-slate-900 dark:text-slate-100">
                              {row.score}
                              <span className="text-slate-400 text-sm">
                                /{selectedAssessment?.total_points}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose()
                handleReset()
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            {step === 'input' && (
              <Button
                onClick={() => setStep('preview')}
                disabled={!selectedAssessmentId || matchedCount === 0}
              >
                <span className="material-symbols-outlined text-lg mr-2">
                  preview
                </span>
                Preview ({matchedCount})
              </Button>
            )}

            {step === 'preview' && (
              <Button onClick={handleSubmit} disabled={isSubmitting || matchedCount === 0}>
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
                      upload
                    </span>
                    Submit {matchedCount} Grades
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
