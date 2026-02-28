'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import { HONORS_LABELS } from '@/lib/grading/deped-engine'
import { authFetch } from "@/lib/utils/authFetch";

type HonorsEntry = {
  student_id: string
  student_name: string
  lrn: string
  section_name: string
  general_average: number
  honors_status: string
  subject_grades: Array<{ course_name: string; final_grade: number }>
}

type Course = {
  id: string
  name: string
  subject_code: string | null
  grade_level: string | null
}

type FinalGradeRow = {
  id: string
  student_id: string
  q1_grade: number | null
  q2_grade: number | null
  q3_grade: number | null
  q4_grade: number | null
  final_grade: number | null
  is_released: boolean
}

const CURRENT_YEAR = new Date().getFullYear()
const DEFAULT_YEAR = `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`

const HONORS_ORDER = ['with_highest_honors', 'with_high_honors', 'with_honors']
const HONORS_COLORS: Record<string, string> = {
  with_highest_honors: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
  with_high_honors:    'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
  with_honors:         'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400',
}

type Tab = 'honors' | 'final'

export default function AdminGradesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('honors')
  const [academicYear, setAcademicYear] = useState(DEFAULT_YEAR)
  const [honorsList, setHonorsList] = useState<HonorsEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [computing, setComputing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  // Final grades tab state
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [finalGrades, setFinalGrades] = useState<FinalGradeRow[]>([])
  const [finalLoading, setFinalLoading] = useState(false)
  const [finalComputing, setFinalComputing] = useState(false)
  const [finalReleasing, setFinalReleasing] = useState(false)
  const [finalMessage, setFinalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    authFetch('/api/admin/courses')
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {})
  }, [])

  async function fetchFinalGrades() {
    if (!selectedCourseId || !academicYear) return
    setFinalLoading(true)
    setFinalMessage(null)
    try {
      const res = await authFetch(`/api/admin/grades/deped/final?courseId=${selectedCourseId}&academicYear=${encodeURIComponent(academicYear)}`)
      const data = await res.json()
      if (data.success) {
        setFinalGrades(data.finalGrades ?? [])
        if (!data.finalGrades?.length) {
          setFinalMessage({ type: 'error', text: 'No final grades computed yet. Click "Compute Final Grades" first.' })
        }
      } else {
        setFinalMessage({ type: 'error', text: data.error ?? 'Failed to load final grades.' })
      }
    } catch {
      setFinalMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setFinalLoading(false)
    }
  }

  async function computeFinalGrades() {
    if (!selectedCourseId || !academicYear) return
    setFinalComputing(true)
    setFinalMessage(null)
    try {
      const res = await authFetch('/api/admin/grades/deped/final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourseId, academicYear }),
      })
      const data = await res.json()
      if (data.success || res.status === 207) {
        setFinalMessage({
          type: data.failed > 0 ? 'error' : 'success',
          text: `Computed ${data.computed} final grade(s).${data.failed > 0 ? ` ${data.failed} failed.` : ''} Load grades to view results.`,
        })
      } else {
        setFinalMessage({ type: 'error', text: data.error ?? 'Computation failed.' })
      }
    } catch {
      setFinalMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setFinalComputing(false)
    }
  }

  async function releaseFinalGrades() {
    if (!selectedCourseId || !academicYear) return
    setFinalReleasing(true)
    setFinalMessage(null)
    try {
      const res = await authFetch('/api/admin/grades/deped/final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourseId, academicYear, action: 'release' }),
      })
      const data = await res.json()
      if (data.success) {
        setFinalMessage({ type: 'success', text: 'Final grades released to students.' })
        fetchFinalGrades()
      } else {
        setFinalMessage({ type: 'error', text: data.error ?? 'Release failed.' })
      }
    } catch {
      setFinalMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setFinalReleasing(false)
    }
  }

  async function fetchHonors() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await authFetch(`/api/admin/grades/deped?academicYear=${academicYear}&action=honors`)
      const data = await res.json()
      if (data.success) {
        setHonorsList(data.honors ?? [])
        if (data.honors.length === 0) {
          setMessage({ type: 'error', text: 'No honors records found. Run "Compute General Averages" first.' })
        }
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to load honors.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setLoading(false)
    }
  }

  async function computeGeneralAverages() {
    setComputing(true)
    setMessage(null)
    try {
      const res = await authFetch('/api/admin/grades/deped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYear, action: 'general_average' }),
      })
      const data = await res.json()
      if (data.success || res.status === 207) {
        setMessage({
          type: data.failed > 0 ? 'error' : 'success',
          text: `Computed ${data.success} general averages.${data.failed > 0 ? ` ${data.failed} failed.` : ''} Now load the honors list.`,
        })
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Computation failed.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setComputing(false)
    }
  }

  // Group honors by status
  const grouped = HONORS_ORDER.reduce((acc, status) => {
    acc[status] = honorsList.filter((h) => h.honors_status === status)
    return acc
  }, {} as Record<string, HonorsEntry[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          Grades & Honors
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Compute final grades, general averages, and honors list per academic year.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(['honors', 'final'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab === 'honors' ? 'Honors & General Averages' : 'Final Grades (per Course)'}
          </button>
        ))}
      </div>

      {/* ── HONORS TAB ── */}
      {activeTab === 'honors' && (
        <>
      {/* Controls */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Academic Year
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2024-2025"
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-36"
            />
          </div>

          <button
            onClick={computeGeneralAverages}
            disabled={computing || !academicYear}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-lg">
              {computing ? 'progress_activity' : 'calculate'}
            </span>
            {computing ? 'Computing…' : 'Compute General Averages'}
          </button>

          <button
            onClick={fetchHonors}
            disabled={loading || !academicYear}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-lg">workspace_premium</span>
            {loading ? 'Loading…' : 'Load Honors List'}
          </button>
        </div>

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

      {/* Honors Summary */}
      {honorsList.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HONORS_ORDER.map((status) => (
              <div key={status} className={`p-5 rounded-xl border-2 ${HONORS_COLORS[status]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-2xl">workspace_premium</span>
                  <span className="font-bold text-lg">{grouped[status].length}</span>
                </div>
                <div className="font-semibold text-sm">{HONORS_LABELS[status]}</div>
              </div>
            ))}
          </div>

          {/* Honors tables per level */}
          {HONORS_ORDER.map((status) => {
            const group = grouped[status]
            if (group.length === 0) return null
            return (
              <Card key={status} className="p-0 overflow-hidden">
                <div className={`px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 ${
                  status === 'with_highest_honors' ? 'bg-yellow-50 dark:bg-yellow-900/10' :
                  status === 'with_high_honors'    ? 'bg-blue-50 dark:bg-blue-900/10' :
                                                     'bg-emerald-50 dark:bg-emerald-900/10'
                }`}>
                  <span className="material-symbols-outlined text-xl">workspace_premium</span>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    {HONORS_LABELS[status]} — {group.length} student{group.length !== 1 ? 's' : ''}
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Student</th>
                      <th className="px-3 py-2.5 text-left">LRN</th>
                      <th className="px-3 py-2.5 text-left">Section</th>
                      <th className="px-3 py-2.5 text-center">General Average</th>
                      <th className="px-3 py-2.5 text-center">Subjects</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.map((student) => (
                      <>
                        <tr
                          key={student.student_id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          onClick={() =>
                            setExpandedStudent(
                              expandedStudent === student.student_id ? null : student.student_id
                            )
                          }
                        >
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                            {student.student_name}
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-500 text-xs">
                            {student.lrn || '—'}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                            {student.section_name || '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-lg font-extrabold text-primary">
                              {student.general_average}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button className="text-primary text-xs font-semibold flex items-center gap-1 mx-auto">
                              <span className="material-symbols-outlined text-base">
                                {expandedStudent === student.student_id ? 'expand_less' : 'expand_more'}
                              </span>
                              {student.subject_grades.length} subjects
                            </button>
                          </td>
                        </tr>

                        {/* Expanded subject breakdown */}
                        {expandedStudent === student.student_id && (
                          <tr key={`${student.student_id}-expanded`}>
                            <td colSpan={5} className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {student.subject_grades.map((sg, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                                  >
                                    <span className="text-slate-700 dark:text-slate-300 truncate pr-2">
                                      {sg.course_name}
                                    </span>
                                    <span className={`font-bold flex-shrink-0 ${
                                      sg.final_grade >= 90 ? 'text-emerald-600' :
                                      sg.final_grade >= 75 ? 'text-slate-900 dark:text-slate-100' :
                                      'text-red-600'
                                    }`}>
                                      {sg.final_grade}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          })}
        </>
      )}
        </>
      )}

      {/* ── FINAL GRADES TAB ── */}
      {activeTab === 'final' && (
        <>
          <Card>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2024-2025"
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-36"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Course / Subject
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => { setSelectedCourseId(e.target.value); setFinalGrades([]) }}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-52"
                >
                  <option value="">Select a course…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.subject_code ? ` (${c.subject_code})` : ''}{c.grade_level ? ` — Grade ${c.grade_level}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={computeFinalGrades}
                disabled={finalComputing || !selectedCourseId || !academicYear}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {finalComputing ? 'progress_activity' : 'calculate'}
                </span>
                {finalComputing ? 'Computing…' : 'Compute Final Grades'}
              </button>

              <button
                onClick={fetchFinalGrades}
                disabled={finalLoading || !selectedCourseId || !academicYear}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                {finalLoading ? 'Loading…' : 'Load Grades'}
              </button>

              {finalGrades.length > 0 && (
                <button
                  onClick={releaseFinalGrades}
                  disabled={finalReleasing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                  {finalReleasing ? 'Releasing…' : 'Release to Students'}
                </button>
              )}
            </div>

            {finalMessage && (
              <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
                finalMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {finalMessage.text}
              </div>
            )}
          </Card>

          {finalGrades.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Final Grades — {finalGrades.length} student{finalGrades.length !== 1 ? 's' : ''}
                </h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  finalGrades.every((g) => g.is_released)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {finalGrades.every((g) => g.is_released) ? 'Released' : 'Not Released'}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Student ID</th>
                    <th className="px-3 py-2.5 text-center">Q1</th>
                    <th className="px-3 py-2.5 text-center">Q2</th>
                    <th className="px-3 py-2.5 text-center">Q3</th>
                    <th className="px-3 py-2.5 text-center">Q4</th>
                    <th className="px-3 py-2.5 text-center">Final</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {finalGrades.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.student_id.slice(0, 8)}…</td>
                      <td className="px-3 py-3 text-center">{row.q1_grade ?? '—'}</td>
                      <td className="px-3 py-3 text-center">{row.q2_grade ?? '—'}</td>
                      <td className="px-3 py-3 text-center">{row.q3_grade ?? '—'}</td>
                      <td className="px-3 py-3 text-center">{row.q4_grade ?? '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-extrabold ${
                          (row.final_grade ?? 0) >= 90 ? 'text-emerald-600' :
                          (row.final_grade ?? 0) >= 75 ? 'text-slate-900 dark:text-slate-100' :
                          'text-red-600'
                        }`}>
                          {row.final_grade ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          row.is_released ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {row.is_released ? 'Released' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
