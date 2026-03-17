'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/utils/authFetch'

interface ReportCardItem {
  id: string
  student_id: string
  student_name: string
  student_lrn: string
  grade_level: string
  section_name: string
  status: 'pending_review' | 'approved' | 'released'
  generated_at: string
  approved_at?: string
  released_at?: string
  term_gpa: number
  has_remarks: boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  released: 'Released',
}

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  released: 'bg-green-100 text-green-800',
}

export default function AdminReportCardsPage() {
  const [reportCards, setReportCards] = useState<ReportCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending_review')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')

  const fetchReportCards = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const res = await authFetch(`/api/admin/report-cards?status=${statusFilter}`)
      const data = await res.json()
      setReportCards(data.reportCards || [])
    } catch (err) {
      console.error('Failed to fetch report cards:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchReportCards() }, [fetchReportCards])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === reportCards.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(reportCards.map(rc => rc.id)))
    }
  }

  const bulkAction = async (action: 'approve' | 'release') => {
    if (!selected.size) return
    setActionLoading(true)
    setMessage('')
    try {
      const res = await authFetch('/api/admin/report-cards/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], action }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage(`${data.updated} report card(s) ${action === 'approve' ? 'approved' : 'released'} successfully.`)
        fetchReportCards()
      } else {
        setMessage(data.error || 'Action failed.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const singleAction = async (id: string, action: 'approve' | 'release') => {
    setActionLoading(true)
    setMessage('')
    try {
      const res = await authFetch(`/api/admin/report-cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage(`Report card ${action === 'approve' ? 'approved' : 'released'}.`)
        fetchReportCards()
      } else {
        setMessage(data.error || 'Action failed.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Cards</h1>
          <p className="text-sm text-gray-500 mt-1">Review and release report cards submitted by teachers.</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['pending_review', 'approved', 'released', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === s
                ? 'border-[#7B1113] text-[#7B1113]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-sm text-blue-700 font-medium">{selected.size} selected</span>
          <button
            onClick={() => bulkAction('approve')}
            disabled={actionLoading || statusFilter !== 'pending_review'}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Approve Selected
          </button>
          <button
            onClick={() => bulkAction('release')}
            disabled={actionLoading || statusFilter !== 'approved'}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Release Selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-2 text-sm">
          {message}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : reportCards.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No report cards with status &quot;{STATUS_LABELS[statusFilter] || statusFilter}&quot;.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === reportCards.length && reportCards.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Section / Grade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">GPA</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Generated</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportCards.map(rc => (
                <tr key={rc.id} className={`hover:bg-gray-50 ${selected.has(rc.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(rc.id)}
                      onChange={() => toggleSelect(rc.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{rc.student_name}</div>
                    <div className="text-xs text-gray-400">{rc.student_lrn}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{rc.section_name}</div>
                    <div className="text-xs text-gray-400">Grade {rc.grade_level}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {rc.term_gpa ? rc.term_gpa.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rc.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[rc.status] || rc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {rc.generated_at ? new Date(rc.generated_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {rc.status === 'pending_review' && (
                        <button
                          onClick={() => singleAction(rc.id, 'approve')}
                          disabled={actionLoading}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {rc.status === 'approved' && (
                        <button
                          onClick={() => singleAction(rc.id, 'release')}
                          disabled={actionLoading}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Release
                        </button>
                      )}
                      {rc.status === 'released' && (
                        <span className="text-xs text-green-600 font-medium">✓ Released</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
