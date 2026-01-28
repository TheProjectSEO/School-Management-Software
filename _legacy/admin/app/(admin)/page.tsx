import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/ui/StatCard";
import ChartCard from "@/components/ui/ChartCard";
import EnrollmentChart from "@/components/dashboard/EnrollmentChart";
import GradeDistributionChart from "@/components/dashboard/GradeDistributionChart";
import AttendanceOverviewChart from "@/components/dashboard/AttendanceOverviewChart";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import {
  getEnrollmentTrends as getEnrollmentTrendsFromDAL,
  getGradeDistribution as getGradeDistributionFromDAL,
  getAttendanceOverview as getAttendanceOverviewFromDAL,
} from "@/lib/dal/reports";

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  activeEnrollments: number;
}

async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [
    { count: totalStudents },
    { count: totalTeachers },
    { count: totalCourses },
    { count: activeEnrollments },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  return {
    totalStudents: totalStudents || 0,
    totalTeachers: totalTeachers || 0,
    totalCourses: totalCourses || 0,
    activeEnrollments: activeEnrollments || 0,
  };
}

async function getEnrollmentTrends() {
  const data = await getEnrollmentTrendsFromDAL(12);
  // Transform RPC result to chart format if data exists
  if (data && Array.isArray(data) && data.length > 0) {
    return data.map((item: { month?: string; enrollments?: number }) => ({
      month: item.month || "",
      enrollments: item.enrollments || 0,
    }));
  }
  // Return empty data if RPC returns nothing (table or function may not exist yet)
  return [];
}

async function getGradeDistribution() {
  const data = await getGradeDistributionFromDAL();
  // Transform RPC result to chart format if data exists
  if (data && Array.isArray(data) && data.length > 0) {
    return data.map((item: { grade?: string; count?: number }) => ({
      grade: item.grade || "",
      count: item.count || 0,
    }));
  }
  // Return empty data if RPC returns nothing
  return [];
}

async function getAttendanceOverview() {
  const data = await getAttendanceOverviewFromDAL();
  // Transform RPC result to chart format
  if (data && typeof data === "object") {
    const present = data.present || 0;
    const late = data.late || 0;
    const absent = data.absent || 0;
    const excused = data.excused || 0;
    const total = present + late + absent + excused;

    if (total === 0) {
      return [];
    }

    return [
      { name: "Present", value: Math.round((present / total) * 100), color: "#22c55e" },
      { name: "Late", value: Math.round((late / total) * 100), color: "#f97316" },
      { name: "Absent", value: Math.round((absent / total) * 100), color: "#ef4444" },
      { name: "Excused", value: Math.round((excused / total) * 100), color: "#6b7280" },
    ];
  }
  return [];
}

async function getRecentActivity() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_logs")
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      created_at,
      admin_profiles (
        profiles (full_name)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  return (data || []).map((log) => ({
    id: log.id,
    action: log.action,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    admin_name: (log.admin_profiles as unknown as { profiles: { full_name: string } })?.profiles?.full_name || "Unknown Admin",
    created_at: log.created_at,
  }));
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
            <div className="w-14 h-14 bg-gray-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
      <div className="h-[300px] bg-gray-100 rounded" />
    </div>
  );
}

async function StatsSection() {
  const stats = await getDashboardStats();

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: "school",
      color: "bg-blue-500",
    },
    {
      label: "Total Teachers",
      value: stats.totalTeachers,
      icon: "person",
      color: "bg-green-500",
    },
    {
      label: "Active Courses",
      value: stats.totalCourses,
      icon: "menu_book",
      color: "bg-purple-500",
    },
    {
      label: "Active Enrollments",
      value: stats.activeEnrollments,
      icon: "assignment_ind",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

async function EnrollmentTrendsSection() {
  const data = await getEnrollmentTrends();

  return (
    <ChartCard
      title="Enrollment Trends"
      subtitle="Monthly enrollment count"
      action={
        <Link
          href="/reports/progress"
          className="text-sm text-primary hover:underline"
        >
          View Report
        </Link>
      }
    >
      <EnrollmentChart data={data} />
    </ChartCard>
  );
}

async function GradeDistributionSection() {
  const data = await getGradeDistribution();

  return (
    <ChartCard
      title="Grade Distribution"
      subtitle="Current grading period"
      action={
        <Link
          href="/reports/grades"
          className="text-sm text-primary hover:underline"
        >
          View Report
        </Link>
      }
    >
      <GradeDistributionChart data={data} />
    </ChartCard>
  );
}

async function AttendanceSection() {
  const data = await getAttendanceOverview();

  return (
    <ChartCard
      title="Attendance Overview"
      subtitle="This month"
      action={
        <Link
          href="/reports/attendance"
          className="text-sm text-primary hover:underline"
        >
          View Report
        </Link>
      }
    >
      <AttendanceOverviewChart data={data} />
    </ChartCard>
  );
}

async function RecentActivitySection() {
  const activities = await getRecentActivity();

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <Link
          href="/audit"
          className="text-sm text-primary hover:underline"
        >
          View All
        </Link>
      </div>
      <ActivityFeed activities={activities} />
    </div>
  );
}

export default async function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to the MSU Admin Portal</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionButton
            href="/users/import"
            icon="upload"
            label="Import Students"
          />
          <ActionButton
            href="/users/teachers"
            icon="person_add"
            label="Add Teacher"
          />
          <ActionButton
            href="/enrollments/bulk"
            icon="group_add"
            label="Bulk Enroll"
          />
          <ActionButton
            href="/announcements"
            icon="campaign"
            label="Announcements"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <EnrollmentTrendsSection />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <GradeDistributionSection />
        </Suspense>
      </div>

      {/* Bottom Row: Attendance + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <AttendanceSection />
        </Suspense>
        <div className="lg:col-span-2">
          <Suspense fallback={
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }>
            <RecentActivitySection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-primary hover:bg-red-50 transition-colors group"
    >
      <span className="material-symbols-outlined text-2xl text-gray-400 group-hover:text-primary mb-2">
        {icon}
      </span>
      <span className="text-sm text-gray-600 group-hover:text-primary text-center">
        {label}
      </span>
    </Link>
  );
}

// Enable ISR with 5 minute revalidation
export const revalidate = 300;
