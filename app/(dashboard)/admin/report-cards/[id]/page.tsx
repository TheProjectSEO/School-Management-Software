'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/utils/authFetch'
import type { ReportCard, ReportCardGrade, TeacherRemark } from '@/lib/types/report-card'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', icon: 'edit_note' },
  pending_review: { label: 'Pending Review', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'hourglass_empty' },
  approved: { label: 'Approved', bg: 'bg-blue-100', text: 'text-blue-800', icon: 'check_circle' },
  released: { label: 'Released', bg: 'bg-green-100', text: 'text-green-800', icon: 'visibility' },
}

const STANDING_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  presidents_list: { label: "President's List", bg: 'bg-purple-100', text: 'text-purple-800' },
  deans_list: { label: "Dean's List", bg: 'bg-blue-100', text: 'text-blue-800' },
  good_standing: { label: 'Good Standing', bg: 'bg-green-100', text: 'text-green-800' },
  probation: { label: 'Academic Probation', bg: 'bg-orange-100', text: 'text-orange-800' },
  suspension: { label: 'Suspension', bg: 'bg-red-100', text: 'text-red-800' },
}

export default function AdminReportCardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [reportCard, setReportCard] = useState<ReportCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'grades' | 'attendance' | 'remarks'>('grades')

  useEffect(() => {
    authFetch(`/api/admin/report-cards/${id}`)
      .then(r => r.json())
      .then(data => setReportCard(data.reportCard || null))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const doAction = async (action: 'approve' | 'release') => {
    setActionLoading(true)
    setMessage(null)
    try {
      const res = await authFetch(`/api/admin/report-cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: action === 'approve' ? 'Report card approved.' : 'Report card released to student.' })
        // Refresh
        const updated = await authFetch(`/api/admin/report-cards/${id}`).then(r => r.json())
        setReportCard(updated.reportCard || null)
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed.' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#7B1113] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!reportCard) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-4xl text-gray-300">description</span>
        <p className="text-gray-500 mt-2">Report card not found.</p>
        <Link href="/admin/report-cards" className="mt-4 inline-block text-sm text-[#7B1113] underline">← Back to Report Cards</Link>
      </div>
    )
  }

  const { student_info, grades, gpa, attendance, teacher_remarks, status, grading_period } = reportCard
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const standingCfg = STANDING_CONFIG[gpa?.academic_standing || 'good_standing'] || STANDING_CONFIG.good_standing

  const canApprove = status === 'draft' || status === 'pending_review'
  const canRelease = status === 'approved'

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/report-cards" className="hover:text-[#7B1113]">Report Cards</Link>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-gray-900 font-medium">{student_info?.full_name || 'Student'}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#7B1113] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {(student_info?.full_name || 'S')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{student_info?.full_name || 'Unknown Student'}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span>LRN: {student_info?.lrn || '—'}</span>
                <span>·</span>
                <span>Grade {student_info?.grade_level || '—'}</span>
                <span>·</span>
                <span>{student_info?.section_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                  <span className="material-symbols-outlined text-[14px]">{statusCfg.icon}</span>
                  {statusCfg.label}
                </span>
                {gpa && (
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${standingCfg.bg} ${standingCfg.text}`}>
                    {standingCfg.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Admin actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {canApprove && (
              <button
                onClick={() => doAction('approve')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Approve
              </button>
            )}
            {canRelease && (
              <button
                onClick={() => doAction('release')}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                Release to Student
              </button>
            )}
            {status === 'released' && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Released
              </span>
            )}
          </div>
        </div>

        {/* Grading period info */}
        {grading_period && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-gray-400">calendar_today</span>
              <span className="font-medium">{grading_period.name}</span>
            </div>
            {grading_period.academic_year && (
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-gray-400">school</span>
                <span>A.Y. {grading_period.academic_year}</span>
              </div>
            )}
            {reportCard.generated_at && (
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-gray-400">schedule</span>
                <span>Generated {new Date(reportCard.generated_at).toLocaleDateString()}</span>
              </div>
            )}
            {reportCard.approved_at && (
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-gray-400">verified</span>
                <span>Approved {new Date(reportCard.approved_at).toLocaleDateString()}</span>
              </div>
            )}
            {reportCard.released_at && (
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-gray-400">send</span>
                <span>Released {new Date(reportCard.released_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* GPA + Attendance summary strip */}
      {gpa && attendance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Term GPA', value: gpa.term_gpa?.toFixed(2) ?? '—', icon: 'grade' },
            { label: 'Cumulative GPA', value: gpa.cumulative_gpa?.toFixed(2) ?? '—', icon: 'auto_graph' },
            { label: 'Attendance Rate', value: `${(attendance.attendance_rate ?? 0).toFixed(1)}%`, icon: 'event_available' },
            { label: 'Days Present', value: `${attendance.present_days ?? 0} / ${attendance.total_days ?? 0}`, icon: 'calendar_month' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-[#7B1113]">{stat.icon}</span>
              <div>
                <div className="text-xs text-gray-500">{stat.label}</div>
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(['grades', 'attendance', 'remarks'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-[#7B1113] text-[#7B1113]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab === 'grades' ? 'Grades' : tab === 'attendance' ? 'Attendance' : 'Remarks'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* GRADES TAB */}
          {activeTab === 'grades' && (
            grades && grades.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Subject</th>
                    <th className="pb-2 font-medium">Code</th>
                    <th className="pb-2 font-medium">Teacher</th>
                    <th className="pb-2 font-medium text-right">Credits</th>
                    <th className="pb-2 font-medium text-right">Grade</th>
                    <th className="pb-2 font-medium text-right">Letter</th>
                    <th className="pb-2 font-medium text-right">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {(grades as ReportCardGrade[]).map((g, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 font-medium text-gray-900">{g.course_name || g.subject_name || '—'}</td>
                      <td className="py-2.5 text-gray-500">{g.subject_code || '—'}</td>
                      <td className="py-2.5 text-gray-500">{g.teacher_name || '—'}</td>
                      <td className="py-2.5 text-right text-gray-600">{g.credit_hours ?? '—'}</td>
                      <td className="py-2.5 text-right font-semibold text-gray-900">{g.numeric_grade ?? g.final_grade ?? g.grade ?? '—'}</td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${(g.numeric_grade ?? g.final_grade ?? 0) >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {g.letter_grade || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-gray-600">{g.gpa_points?.toFixed(1) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No grades recorded yet.</p>
            )
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            attendance ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Attendance Rate</span>
                  <span className="text-sm font-bold text-gray-900">{(attendance.attendance_rate ?? 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${(attendance.attendance_rate ?? 0) >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(attendance.attendance_rate ?? 0, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                  {[
                    { label: 'Total Days', value: attendance.total_days ?? 0, color: 'text-gray-900' },
                    { label: 'Present', value: attendance.present_days ?? 0, color: 'text-green-600' },
                    { label: 'Absent', value: attendance.absent_days ?? 0, color: 'text-red-600' },
                    { label: 'Late', value: attendance.late_days ?? 0, color: 'text-orange-600' },
                    { label: 'Excused', value: attendance.excused_days ?? 0, color: 'text-blue-600' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No attendance data recorded.</p>
            )
          )}

          {/* REMARKS TAB */}
          {activeTab === 'remarks' && (
            teacher_remarks && teacher_remarks.length > 0 ? (
              <div className="space-y-3">
                {(teacher_remarks as TeacherRemark[]).map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">{r.subject}</span>
                      <span className="text-xs text-gray-400">{r.teacher_name}</span>
                    </div>
                    <p className="text-sm text-gray-700">{r.remarks}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No teacher remarks yet.</p>
            )
          )}
        </div>
      </div>
    </div>
  )
}
