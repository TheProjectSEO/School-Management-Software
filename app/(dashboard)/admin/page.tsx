import { Suspense } from "react";
import Link from "next/link";
import { createServiceClient } from '@/lib/supabase/service';
import AdminSummaryCardsGrid from "@/components/admin/dashboard/AdminSummaryCardsGrid";

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  activeEnrollments: number;
  attendanceRate: number;
  pendingGrades: number;
}

async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createServiceClient();

  const [
    { count: totalStudents },
    { count: totalTeachers },
    { count: totalCourses },
    { count: activeEnrollments },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  // Calculate attendance rate from actual records
  const { data: attendanceData } = await supabase
    .from("attendance")
    .select("status");

  let attendanceRate = 0;
  if (attendanceData && attendanceData.length > 0) {
    const presentCount = attendanceData.filter(a => a.status === 'present' || a.status === 'late').length;
    attendanceRate = Math.round((presentCount / attendanceData.length) * 100 * 10) / 10;
  }

  return {
    totalStudents: totalStudents || 0,
    totalTeachers: totalTeachers || 0,
    totalCourses: totalCourses || 0,
    activeEnrollments: activeEnrollments || 0,
    attendanceRate,
    pendingGrades: 0,
  };
}

async function getEnrollmentTrends() {
  const supabase = createServiceClient();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();

  // Get enrollment counts grouped by month for the current year
  const results = [];
  for (let i = 0; i <= new Date().getMonth(); i++) {
    const startDate = new Date(currentYear, i, 1).toISOString();
    const endDate = new Date(currentYear, i + 1, 0).toISOString();

    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .gte("enrolled_at", startDate)
      .lte("enrolled_at", endDate);

    results.push({
      month: months[i],
      enrollments: count || 0,
    });
  }

  return results;
}

async function getGradeDistribution() {
  const supabase = createServiceClient();

  // Get grade distribution from submissions/grades
  const { data: grades } = await supabase
    .from("submission_grades")
    .select("final_grade");

  if (!grades || grades.length === 0) {
    return [
      { grade: "A (90-100)", count: 0 },
      { grade: "B (80-89)", count: 0 },
      { grade: "C (70-79)", count: 0 },
      { grade: "D (60-69)", count: 0 },
      { grade: "F (<60)", count: 0 },
    ];
  }

  // Count grades by range
  const distribution = {
    A: 0, B: 0, C: 0, D: 0, F: 0
  };

  grades.forEach((g) => {
    const score = g.final_grade || 0;
    if (score >= 90) distribution.A++;
    else if (score >= 80) distribution.B++;
    else if (score >= 70) distribution.C++;
    else if (score >= 60) distribution.D++;
    else distribution.F++;
  });

  return [
    { grade: "A (90-100)", count: distribution.A },
    { grade: "B (80-89)", count: distribution.B },
    { grade: "C (70-79)", count: distribution.C },
    { grade: "D (60-69)", count: distribution.D },
    { grade: "F (<60)", count: distribution.F },
  ];
}

async function getAttendanceOverview() {
  const supabase = createServiceClient();

  // Get attendance summary for current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: attendance } = await supabase
    .from("attendance")
    .select("status")
    .gte("date", startOfMonth.toISOString());

  if (!attendance || attendance.length === 0) {
    return [
      { name: "Present", value: 0, color: "#22c55e" },
      { name: "Late", value: 0, color: "#f97316" },
      { name: "Absent", value: 0, color: "#ef4444" },
      { name: "Excused", value: 0, color: "#6b7280" },
    ];
  }

  const total = attendance.length;
  const counts = { present: 0, late: 0, absent: 0, excused: 0 };

  attendance.forEach((a) => {
    const status = a.status?.toLowerCase() || '';
    if (status === 'present') counts.present++;
    else if (status === 'late') counts.late++;
    else if (status === 'absent') counts.absent++;
    else if (status === 'excused') counts.excused++;
  });

  // Convert to percentages
  return [
    { name: "Present", value: Math.round((counts.present / total) * 100) || 0, color: "#22c55e" },
    { name: "Late", value: Math.round((counts.late / total) * 100) || 0, color: "#f97316" },
    { name: "Absent", value: Math.round((counts.absent / total) * 100) || 0, color: "#ef4444" },
    { name: "Excused", value: Math.round((counts.excused / total) * 100) || 0, color: "#6b7280" },
  ];
}

async function getRecentActivity() {
  const supabase = createServiceClient();

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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards skeleton */}
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
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div>
                <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function DashboardDataWrapper() {
  const [stats, enrollmentTrends, gradeDistribution, attendanceOverview, recentActivities] =
    await Promise.all([
      getDashboardStats(),
      getEnrollmentTrends(),
      getGradeDistribution(),
      getAttendanceOverview(),
      getRecentActivity(),
    ]);

  return (
    <AdminSummaryCardsGrid
      stats={stats}
      enrollmentTrends={enrollmentTrends}
      gradeDistribution={gradeDistribution}
      attendanceOverview={attendanceOverview}
      recentActivities={recentActivities}
    />
  );
}

export default async function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header with quick action icon buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="border-l-4 border-l-primary pl-3">
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome to the MSU Admin Portal</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/users/import"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 hover:border-primary hover:bg-red-50 transition-colors group"
            title="Import Students"
          >
            <span className="material-symbols-outlined text-xl text-gray-400 group-hover:text-primary">
              upload
            </span>
          </Link>
          <Link
            href="/admin/users/teachers"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 hover:border-primary hover:bg-red-50 transition-colors group"
            title="Add Teacher"
          >
            <span className="material-symbols-outlined text-xl text-gray-400 group-hover:text-primary">
              person_add
            </span>
          </Link>
          <Link
            href="/admin/enrollments/bulk"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 hover:border-primary hover:bg-red-50 transition-colors group"
            title="Bulk Enroll"
          >
            <span className="material-symbols-outlined text-xl text-gray-400 group-hover:text-primary">
              group_add
            </span>
          </Link>
          <span className="ml-2 text-sm text-gray-500 hidden sm:inline">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Single Suspense boundary — all data fetched in parallel */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataWrapper />
      </Suspense>
    </div>
  );
}

// Enable ISR with 5 minute revalidation
export const revalidate = 300;
