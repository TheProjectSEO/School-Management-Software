'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface AttendanceDashboardProps {
  teacherId: string
}

type AttendanceStatus = 'P' | 'L' | 'A' | 'E'

interface StudentAttendance {
  id: string
  name: string
  lrn: string
  status: AttendanceStatus | null
  timeIn: string | null
  notes: string | null
}

export default function AttendanceDashboard({ teacherId }: AttendanceDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSection, setSelectedSection] = useState('')
  const [students, setStudents] = useState<StudentAttendance[]>([
    {
      id: '1',
      name: 'Juan Dela Cruz',
      lrn: '123456789012',
      status: 'P',
      timeIn: '08:15 AM',
      notes: null
    },
    {
      id: '2',
      name: 'Maria Santos',
      lrn: '123456789013',
      status: 'L',
      timeIn: '08:35 AM',
      notes: null
    },
    {
      id: '3',
      name: 'Jose Rizal',
      lrn: '123456789014',
      status: null,
      timeIn: null,
      notes: null
    }
  ])

  const statusColors: Record<AttendanceStatus, string> = {
    P: 'success',
    L: 'warning',
    A: 'error',
    E: 'info'
  }

  const statusLabels: Record<AttendanceStatus, string> = {
    P: 'Present',
    L: 'Late',
    A: 'Absent',
    E: 'Excused'
  }

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudents(students.map(student =>
      student.id === studentId ? { ...student, status } : student
    ))
  }

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    console.log('Exporting to CSV...')
  }

  const stats = {
    present: students.filter(s => s.status === 'P').length,
    late: students.filter(s => s.status === 'L').length,
    absent: students.filter(s => s.status === 'A').length,
    excused: students.filter(s => s.status === 'E').length,
    total: students.length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Attendance
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track and manage student attendance
          </p>
        </div>
        <Button onClick={handleExportCSV}>
          <span className="material-symbols-outlined text-lg">download</span>
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-2xl">
                check_circle
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.present}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Present
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-600 text-2xl">
                schedule
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.late}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Late
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-2xl">
                cancel
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.absent}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Absent
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-2xl">
                verified
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.excused}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Excused
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                groups
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.total}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sections</option>
              <option value="1">Grade 7 - Newton</option>
              <option value="2">Grade 8 - Einstein</option>
              <option value="3">Grade 9 - Curie</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Student Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                  LRN
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Time In
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">
                          person
                        </span>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {student.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {student.lrn}
                  </td>
                  <td className="px-4 py-4">
                    {student.status ? (
                      <Badge variant={statusColors[student.status] as any}>
                        {statusLabels[student.status]}
                      </Badge>
                    ) : (
                      <Badge variant="default">Not Set</Badge>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {student.timeIn || '-'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleStatusChange(student.id, 'P')}
                        className="p-2 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Mark Present"
                      >
                        <span className="material-symbols-outlined text-green-600">
                          check_circle
                        </span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'L')}
                        className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                        title="Mark Late"
                      >
                        <span className="material-symbols-outlined text-yellow-600">
                          schedule
                        </span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'A')}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Mark Absent"
                      >
                        <span className="material-symbols-outlined text-red-600">
                          cancel
                        </span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(student.id, 'E')}
                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Mark Excused"
                      >
                        <span className="material-symbols-outlined text-blue-600">
                          verified
                        </span>
                      </button>
                      <button
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Add Note"
                      >
                        <span className="material-symbols-outlined text-slate-600">
                          edit_note
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
