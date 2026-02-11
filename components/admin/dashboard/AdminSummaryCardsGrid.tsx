'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StatCard from '@/components/admin/ui/StatCard'
import ChartCard from '@/components/admin/ui/ChartCard'
import EnrollmentChart from '@/components/admin/dashboard/EnrollmentChart'
import GradeDistributionChart from '@/components/admin/dashboard/GradeDistributionChart'
import AttendanceOverviewChart from '@/components/admin/dashboard/AttendanceOverviewChart'
import ActivityFeed from '@/components/admin/dashboard/ActivityFeed'
import Modal from '@/components/ui/Modal'

interface AdminSummaryCardsGridProps {
  stats: {
    totalStudents: number
    totalTeachers: number
    totalCourses: number
    activeEnrollments: number
    attendanceRate: number
  }
  enrollmentTrends: { month: string; enrollments: number }[]
  gradeDistribution: { grade: string; count: number }[]
  attendanceOverview: { name: string; value: number; color: string }[]
  recentActivities: {
    id: string
    action: string
    entity_type: string
    entity_id?: string
    admin_name: string
    created_at: string
  }[]
}

type SummaryWidgetKey = 'enrollment' | 'grades' | 'attendance' | 'activity'

const summaryConfig: {
  key: SummaryWidgetKey
  label: string
  icon: string
  color: string
  bgColor: string
  modalTitle: string
}[] = [
  {
    key: 'enrollment',
    label: 'Enrollment Trends',
    icon: 'trending_up',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    modalTitle: 'Enrollment Trends',
  },
  {
    key: 'grades',
    label: 'Grade Distribution',
    icon: 'bar_chart',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    modalTitle: 'Grade Distribution',
  },
  {
    key: 'attendance',
    label: 'Attendance Overview',
    icon: 'fact_check',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    modalTitle: 'Attendance Overview',
  },
  {
    key: 'activity',
    label: 'Recent Activity',
    icon: 'history',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    modalTitle: 'Recent Activity',
  },
]

export default function AdminSummaryCardsGrid({
  stats,
  enrollmentTrends,
  gradeDistribution,
  attendanceOverview,
  recentActivities,
}: AdminSummaryCardsGridProps) {
  const router = useRouter()
  const [openWidget, setOpenWidget] = useState<SummaryWidgetKey | null>(null)

  const statCards = [
    {
      label: 'Total Students',
      value: stats.totalStudents,
      icon: 'school',
      color: 'bg-blue-500',
      href: '/admin/users/students',
    },
    {
      label: 'Total Teachers',
      value: stats.totalTeachers,
      icon: 'person',
      color: 'bg-green-500',
      href: '/admin/users/teachers',
    },
    {
      label: 'Active Courses',
      value: stats.totalCourses,
      icon: 'menu_book',
      color: 'bg-purple-500',
      href: '/admin/courses',
    },
    {
      label: 'Active Enrollments',
      value: stats.activeEnrollments,
      icon: 'assignment_ind',
      color: 'bg-orange-500',
      href: '/admin/enrollments',
    },
  ]

  const totalGraded = gradeDistribution.reduce((sum, g) => sum + g.count, 0)
  const latestMonthEnrollments = enrollmentTrends.length > 0
    ? enrollmentTrends[enrollmentTrends.length - 1].enrollments
    : 0

  const counts: Record<SummaryWidgetKey, string> = {
    enrollment: latestMonthEnrollments.toLocaleString(),
    grades: totalGraded.toLocaleString(),
    attendance: `${stats.attendanceRate}%`,
    activity: recentActivities.length.toLocaleString(),
  }

  const modalContent: Record<SummaryWidgetKey, React.ReactNode> = {
    enrollment: (
      <ChartCard
        title="Enrollment Trends"
        subtitle="Monthly enrollment count"
        action={
          <Link href="/admin/reports/progress" className="text-sm text-primary hover:underline">
            View Report
          </Link>
        }
      >
        <EnrollmentChart data={enrollmentTrends} />
      </ChartCard>
    ),
    grades: (
      <ChartCard
        title="Grade Distribution"
        subtitle="Current grading period"
        action={
          <Link href="/admin/reports/grades" className="text-sm text-primary hover:underline">
            View Report
          </Link>
        }
      >
        <GradeDistributionChart data={gradeDistribution} />
      </ChartCard>
    ),
    attendance: (
      <ChartCard
        title="Attendance Overview"
        subtitle="This month"
        action={
          <Link href="/admin/reports/attendance" className="text-sm text-primary hover:underline">
            View Report
          </Link>
        }
      >
        <AttendanceOverviewChart data={attendanceOverview} />
      </ChartCard>
    ),
    activity: (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <Link href="/admin/audit-logs" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>
        <ActivityFeed activities={recentActivities} />
      </div>
    ),
  }

  return (
    <>
      {/* Stat Cards — clickable, navigate to admin pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            onClick={() => router.push(stat.href)}
          />
        ))}
      </div>

      {/* Summary Cards — click to open modal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryConfig.map(({ key, label, icon, color, bgColor }) => (
          <button
            key={key}
            onClick={() => setOpenWidget(key)}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined text-xl ${color}`}>
                  {icon}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{counts[key]}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {openWidget && (
        <Modal
          isOpen={true}
          onClose={() => setOpenWidget(null)}
          title={summaryConfig.find(w => w.key === openWidget)!.modalTitle}
          size="lg"
        >
          {modalContent[openWidget]}
        </Modal>
      )}
    </>
  )
}
