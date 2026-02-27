'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { DepEdSubjectType } from '@/lib/grading/deped-engine'
import { SUBJECT_TYPE_LABELS } from '@/lib/grading/deped-engine'

// ============================================================================
// Types
// ============================================================================

interface StudentQuarterRow {
  student_id: string
  student_name: string
  lrn: string
  // WW
  ww_total_score: number | null
  ww_highest_score: number | null
  ww_percentage_score: number | null
  ww_weighted_score: number | null
  // PT
  pt_total_score: number | null
  pt_highest_score: number | null
  pt_percentage_score: number | null
  pt_weighted_score: number | null
  // QA
  qa_total_score: number | null
  qa_highest_score: number | null
  qa_percentage_score: number | null
  qa_weighted_score: number | null
  // Result
  initial_grade: number | null
  transmuted_grade: number | null
  quarterly_grade: number | null
  is_locked: boolean
  is_released: boolean
}

interface DepEdGradebookViewProps {
  courseId: string
  periodId: string
  schoolId: string
  courseName: string
  periodName: string
  subjectType: DepEdSubjectType
  students: StudentQuarterRow[]
  onRecompute: () => void
  onRelease: () => void
}

// ============================================================================
// Helpers
// ============================================================================

function fmt(n: number | null, decimals = 2): string {
  if (n === null || n === undefined) return '—'
  return Number(n).toFixed(decimals)
}

function gradeColor(grade: number | null): string {
  if (grade === null) return 'text-slate-400'
  if (grade >= 90) return 'text-emerald-600 dark:text-emerald-400 font-bold'
  if (grade >= 85) return 'text-blue-600 dark:text-blue-400 font-semibold'
  if (grade >= 80) return 'text-sky-600 dark:text-sky-400'
  if (grade >= 75) return 'text-slate-700 dark:text-slate-300'
  return 'text-red-600 dark:text-red-400 font-semibold'
}

function passFailBadge(grade: number | null) {
  if (grade === null) return null
  const passed = grade >= 75
  return (
    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
      passed
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
    }`}>
      {passed ? 'P' : 'F'}
    </span>
  )
}

// ============================================================================
// Component
// ============================================================================

export default function DepEdGradebookView({
  courseId,
  periodId,
  schoolId,
  courseName,
  periodName,
  subjectType,
  students,
  onRecompute,
  onRelease,
}: DepEdGradebookViewProps) {
  const [loading, setLoading] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const computedCount = students.filter((s) => s.quarterly_grade !== null).length
  const releasedCount = students.filter((s) => s.is_released).length
  const passCount = students.filter((s) => (s.quarterly_grade ?? 0) >= 75).length
  const classAvg = students.length > 0
    ? students.filter((s) => s.quarterly_grade !== null).reduce((sum, s) => sum + (s.quarterly_grade ?? 0), 0) /
      (students.filter((s) => s.quarterly_grade !== null).length || 1)
    : 0

  // Weight labels
  const weights =
    subjectType === 'academic'
      ? { ww: '30%', pt: '50%', qa: '20%' }
      : { ww: '20%', pt: '60%', qa: '20%' }

  async function handleCompute() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/teacher/gradebook/deped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, periodId, schoolId }),
      })
      const data = await res.json()
      if (data.success || res.status === 207) {
        setMessage({
          type: data.failed > 0 ? 'error' : 'success',
          text: `Computed ${data.success} grades.${data.failed > 0 ? ` ${data.failed} failed.` : ''}`,
        })
        onRecompute()
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Computation failed.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleRelease() {
    setReleasing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/teacher/gradebook/deped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, periodId, schoolId, action: 'release' }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Grades released to students.' })
        onRelease()
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Release failed.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setReleasing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Subject type + weights info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">calculate</span>
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {SUBJECT_TYPE_LABELS[subjectType]}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                DepEd K-12 — {periodName}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-slate-900 dark:text-slate-100">{computedCount}/{students.length}</div>
              <div className="text-xs text-slate-500">Computed</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-900 dark:text-slate-100">{releasedCount}</div>
              <div className="text-xs text-slate-500">Released</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-emerald-600">{passCount}</div>
              <div className="text-xs text-slate-500">Passed</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                {computedCount > 0 ? classAvg.toFixed(1) : '—'}
              </div>
              <div className="text-xs text-slate-500">Class Avg</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCompute}
              disabled={loading}
            >
              {loading ? (
                <span className="material-symbols-outlined text-lg mr-2 animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-lg mr-2">calculate</span>
              )}
              {loading ? 'Computing…' : 'Compute Grades'}
            </Button>
            <Button
              size="sm"
              onClick={handleRelease}
              disabled={releasing || computedCount === 0}
            >
              <span className="material-symbols-outlined text-lg mr-2">publish</span>
              {releasing ? 'Releasing…' : 'Release to Students'}
            </Button>
          </div>
        </div>

        {/* Status message */}
        {message && (
          <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {message.text}
          </div>
        )}
      </Card>

      {/* Grade Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {/* Component group header */}
              <tr className="bg-slate-100 dark:bg-slate-800/60">
                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-100 dark:bg-slate-800/60 min-w-[180px]" rowSpan={2}>
                  Student
                </th>
                <th className="px-3 py-2 text-center text-xs font-bold text-blue-600 dark:text-blue-400 uppercase border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20" colSpan={4}>
                  Written Work ({weights.ww})
                </th>
                <th className="px-3 py-2 text-center text-xs font-bold text-violet-600 dark:text-violet-400 uppercase border-b border-slate-200 dark:border-slate-700 bg-violet-50 dark:bg-violet-900/20" colSpan={4}>
                  Performance Task ({weights.pt})
                </th>
                <th className="px-3 py-2 text-center text-xs font-bold text-amber-600 dark:text-amber-400 uppercase border-b border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/20" colSpan={4}>
                  Quarterly Assessment ({weights.qa})
                </th>
                <th className="px-3 py-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700" colSpan={3}>
                  Computed Grade
                </th>
              </tr>
              {/* Sub-headers */}
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                {/* WW */}
                <th className="px-2 py-1.5 text-center bg-blue-50/60 dark:bg-blue-900/10">Score</th>
                <th className="px-2 py-1.5 text-center bg-blue-50/60 dark:bg-blue-900/10">/ Highest</th>
                <th className="px-2 py-1.5 text-center bg-blue-50/60 dark:bg-blue-900/10">PS%</th>
                <th className="px-2 py-1.5 text-center bg-blue-50/60 dark:bg-blue-900/10 border-r border-slate-200 dark:border-slate-700">WS</th>
                {/* PT */}
                <th className="px-2 py-1.5 text-center bg-violet-50/60 dark:bg-violet-900/10">Score</th>
                <th className="px-2 py-1.5 text-center bg-violet-50/60 dark:bg-violet-900/10">/ Highest</th>
                <th className="px-2 py-1.5 text-center bg-violet-50/60 dark:bg-violet-900/10">PS%</th>
                <th className="px-2 py-1.5 text-center bg-violet-50/60 dark:bg-violet-900/10 border-r border-slate-200 dark:border-slate-700">WS</th>
                {/* QA */}
                <th className="px-2 py-1.5 text-center bg-amber-50/60 dark:bg-amber-900/10">Score</th>
                <th className="px-2 py-1.5 text-center bg-amber-50/60 dark:bg-amber-900/10">/ Highest</th>
                <th className="px-2 py-1.5 text-center bg-amber-50/60 dark:bg-amber-900/10">PS%</th>
                <th className="px-2 py-1.5 text-center bg-amber-50/60 dark:bg-amber-900/10 border-r border-slate-200 dark:border-slate-700">WS</th>
                {/* Computed */}
                <th className="px-2 py-1.5 text-center">Initial</th>
                <th className="px-2 py-1.5 text-center">Transmuted</th>
                <th className="px-2 py-1.5 text-center font-bold text-slate-700 dark:text-slate-200">Quarter Grade</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-10 text-center text-slate-400 text-sm">
                    No students enrolled. Click "Compute Grades" after entering scores.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr
                    key={student.student_id}
                    className={`
                      ${idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/50 dark:bg-slate-800/20'}
                      hover:bg-primary/5 transition-colors
                    `}
                  >
                    {/* Student info */}
                    <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10 border-r border-slate-100 dark:border-slate-800">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                        {student.student_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{student.lrn || '—'}</div>
                      <div className="flex gap-1 mt-0.5">
                        {student.is_released && (
                          <span className="text-[10px] px-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Released
                          </span>
                        )}
                        {student.is_locked && (
                          <span className="text-[10px] px-1 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            Locked
                          </span>
                        )}
                      </div>
                    </td>

                    {/* WW */}
                    <td className="px-2 py-2.5 text-center text-slate-700 dark:text-slate-300 bg-blue-50/30 dark:bg-blue-900/5">
                      {fmt(student.ww_total_score, 0)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-500 bg-blue-50/30 dark:bg-blue-900/5">
                      {fmt(student.ww_highest_score, 0)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-700 dark:text-slate-300 bg-blue-50/30 dark:bg-blue-900/5">
                      {fmt(student.ww_percentage_score)}
                    </td>
                    <td className="px-2 py-2.5 text-center font-semibold text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/5 border-r border-slate-200 dark:border-slate-700">
                      {fmt(student.ww_weighted_score)}
                    </td>

                    {/* PT */}
                    <td className="px-2 py-2.5 text-center text-slate-700 dark:text-slate-300 bg-violet-50/30 dark:bg-violet-900/5">
                      {fmt(student.pt_total_score, 0)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-500 bg-violet-50/30 dark:bg-violet-900/5">
                      {fmt(student.pt_highest_score, 0)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-700 dark:text-slate-300 bg-violet-50/30 dark:bg-violet-900/5">
                      {fmt(student.pt_percentage_score)}
                    </td>
                    <td className="px-2 py-2.5 text-center font-semibold text-violet-700 dark:text-violet-400 bg-violet-50/30 dark:bg-violet-900/5 border-r border-slate-200 dark:border-slate-700">
                      {fmt(student.pt_weighted_score)}
                    </td>

                    {/* QA */}
                    <td className="px-2 py-2.5 text-center text-slate-700 dark:text-slate-300 bg-amber-50/30 dark:bg-amber-900/5">
                      {fmt(student.qa_total_score, 0)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-500 bg-amber-50/30 dark:bg-amber-900/5">
                      {fmt(student.qa_highest_score, 0)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-700 dark:text-slate-300 bg-amber-50/30 dark:bg-amber-900/5">
                      {fmt(student.qa_percentage_score)}
                    </td>
                    <td className="px-2 py-2.5 text-center font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-900/5 border-r border-slate-200 dark:border-slate-700">
                      {fmt(student.qa_weighted_score)}
                    </td>

                    {/* Computed */}
                    <td className="px-2 py-2.5 text-center text-slate-600 dark:text-slate-400">
                      {fmt(student.initial_grade)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-600 dark:text-slate-400">
                      {fmt(student.transmuted_grade)}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`text-base ${gradeColor(student.quarterly_grade)}`}>
                        {student.quarterly_grade ?? '—'}
                      </span>
                      {passFailBadge(student.quarterly_grade)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Totals footer */}
            {students.length > 0 && computedCount > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <td className="px-4 py-2 sticky left-0 bg-slate-100 dark:bg-slate-800">
                    Class Average ({computedCount} students)
                  </td>
                  <td colSpan={3} />
                  <td className="px-2 py-2 text-center text-blue-700 dark:text-blue-400">
                    {fmt(students.reduce((s, r) => s + (r.ww_weighted_score ?? 0), 0) / (computedCount || 1))}
                  </td>
                  <td colSpan={3} />
                  <td className="px-2 py-2 text-center text-violet-700 dark:text-violet-400">
                    {fmt(students.reduce((s, r) => s + (r.pt_weighted_score ?? 0), 0) / (computedCount || 1))}
                  </td>
                  <td colSpan={3} />
                  <td className="px-2 py-2 text-center text-amber-700 dark:text-amber-400">
                    {fmt(students.reduce((s, r) => s + (r.qa_weighted_score ?? 0), 0) / (computedCount || 1))}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {fmt(students.reduce((s, r) => s + (r.initial_grade ?? 0), 0) / (computedCount || 1))}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {fmt(students.reduce((s, r) => s + (r.transmuted_grade ?? 0), 0) / (computedCount || 1))}
                  </td>
                  <td className="px-2 py-2 text-center font-bold text-slate-900 dark:text-slate-100">
                    {classAvg.toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 px-1">
        <span><strong>PS%</strong> = Percentage Score = (Score / Highest) × 100</span>
        <span><strong>WS</strong> = Weighted Score = PS% × Weight</span>
        <span><strong>Initial</strong> = WW·WS + PT·WS + QA·WS</span>
        <span><strong>Transmuted</strong> = DepEd lookup table applied to Initial Grade</span>
        <span><strong>Quarter Grade</strong> = Transmuted, rounded to whole number (min 60, max 100)</span>
        <span className="text-emerald-600 font-semibold">P = Passed (≥75)</span>
        <span className="text-red-600 font-semibold">F = Failed (&lt;75)</span>
      </div>
    </div>
  )
}
