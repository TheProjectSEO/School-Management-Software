import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "./admin";

// Types
export interface AttendanceReportRecord {
  id: string;
  date: string;
  section_name: string;
  grade_level: string;
  course_name: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_rate: number;
}

export interface AttendanceSummary {
  totalRecords: number;
  averageRate: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  trendData: { date: string; rate: number; present: number; absent: number }[];
  bySection: { name: string; rate: number; total: number }[];
}

export interface GradeReportRecord {
  id: string;
  student_name: string;
  student_id: string;
  section_name: string;
  grade_level: string;
  course_name: string;
  course_code: string;
  grading_period: string;
  grade: number;
  grade_letter: string;
  status: "passing" | "failing" | "incomplete";
}

export interface GradeSummary {
  totalRecords: number;
  averageGrade: number;
  passRate: number;
  failRate: number;
  distribution: { grade: string; count: number; color: string }[];
  byCourse: { name: string; average: number; passRate: number }[];
  trend: { period: string; average: number; passRate: number }[];
}

export interface ProgressReportRecord {
  id: string;
  section_name: string;
  grade_level: string;
  total_students: number;
  active_enrollments: number;
  completed_courses: number;
  avg_grade: number;
  avg_attendance: number;
  at_risk_count: number;
  honor_roll_count: number;
}

export interface ProgressSummary {
  totalStudents: number;
  totalEnrollments: number;
  completionRate: number;
  atRiskRate: number;
  enrollmentTrend: { month: string; enrollments: number; completions: number }[];
  byGradeLevel: { grade: string; students: number; avgGrade: number; atRisk: number }[];
  performanceDistribution: { category: string; count: number; percentage: number }[];
}

// Attendance Report Functions
export async function getAttendanceReport(params: {
  dateFrom?: string;
  dateTo?: string;
  gradeLevel?: string;
  sectionId?: string;
  courseId?: string;
  groupBy?: "section" | "grade_level" | "course" | "date";
  page?: number;
  pageSize?: number;
}): Promise<{ data: AttendanceReportRecord[]; summary: AttendanceSummary; total: number; page: number; pageSize: number; totalPages: number }> {
  const supabase = await createClient();
  const { dateFrom, dateTo, gradeLevel, sectionId, groupBy = "section", page = 1, pageSize = 20 } = params;

  // This would be a complex query or RPC call in production
  // For now, return structure that matches expected format
  let query = supabase
    .from("attendance_summary")
    .select("*", { count: "exact" });

  if (dateFrom) {
    query = query.gte("date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("date", dateTo);
  }

  if (gradeLevel) {
    query = query.eq("grade_level", gradeLevel);
  }

  if (sectionId) {
    query = query.eq("section_id", sectionId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .range(from, to)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error getting attendance report:", error);
    // Return empty data structure
    return {
      data: [],
      summary: {
        totalRecords: 0,
        averageRate: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalExcused: 0,
        trendData: [],
        bySection: [],
      },
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // Calculate summary (in production, this might be a separate RPC)
  const summary: AttendanceSummary = {
    totalRecords: count || 0,
    averageRate: data?.reduce((acc, r) => acc + (r.attendance_rate || 0), 0) / (data?.length || 1),
    totalPresent: data?.reduce((acc, r) => acc + (r.present || 0), 0) || 0,
    totalAbsent: data?.reduce((acc, r) => acc + (r.absent || 0), 0) || 0,
    totalLate: data?.reduce((acc, r) => acc + (r.late || 0), 0) || 0,
    totalExcused: data?.reduce((acc, r) => acc + (r.excused || 0), 0) || 0,
    trendData: [],
    bySection: [],
  };

  return {
    data: (data || []) as AttendanceReportRecord[],
    summary,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// Grade Report Functions
export async function getGradeReport(params: {
  gradingPeriod?: string;
  gradeLevel?: string;
  courseId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: GradeReportRecord[]; summary: GradeSummary; total: number; page: number; pageSize: number; totalPages: number }> {
  const supabase = await createClient();
  const { gradingPeriod, gradeLevel, courseId, status, page = 1, pageSize = 20 } = params;

  let query = supabase
    .from("grade_records")
    .select(`
      id,
      grade,
      grading_period,
      enrollments (
        id,
        students (
          id,
          profiles (
            full_name
          )
        ),
        courses (
          id,
          name,
          code
        ),
        sections (
          id,
          name,
          grade_level
        )
      )
    `, { count: "exact" });

  if (gradingPeriod) {
    query = query.eq("grading_period", gradingPeriod);
  }

  if (gradeLevel) {
    query = query.eq("enrollments.sections.grade_level", gradeLevel);
  }

  if (courseId) {
    query = query.eq("enrollments.course_id", courseId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting grade report:", error);
    return {
      data: [],
      summary: {
        totalRecords: 0,
        averageGrade: 0,
        passRate: 0,
        failRate: 0,
        distribution: [],
        byCourse: [],
        trend: [],
      },
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // Transform and calculate summary
  const records: GradeReportRecord[] = (data || []).map((r: Record<string, unknown>) => {
    const enrollment = r.enrollments as Record<string, unknown>;
    const student = enrollment?.students as Record<string, unknown>;
    const profile = student?.profiles as Record<string, unknown>;
    const course = enrollment?.courses as Record<string, unknown>;
    const section = enrollment?.sections as Record<string, unknown>;
    const grade = r.grade as number;

    return {
      id: r.id as string,
      student_name: profile?.full_name as string || "",
      student_id: student?.id as string || "",
      section_name: section?.name as string || "",
      grade_level: section?.grade_level as string || "",
      course_name: course?.name as string || "",
      course_code: course?.code as string || "",
      grading_period: r.grading_period as string,
      grade,
      grade_letter: getGradeLetter(grade),
      status: grade >= 75 ? "passing" : "failing" as "passing" | "failing",
    };
  });

  const passingCount = records.filter(r => r.status === "passing").length;
  const summary: GradeSummary = {
    totalRecords: count || 0,
    averageGrade: records.reduce((acc, r) => acc + r.grade, 0) / (records.length || 1),
    passRate: (passingCount / (records.length || 1)) * 100,
    failRate: ((records.length - passingCount) / (records.length || 1)) * 100,
    distribution: [],
    byCourse: [],
    trend: [],
  };

  return {
    data: records,
    summary,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// Progress Report Functions
export async function getProgressReport(params: {
  academicYear?: string;
  semester?: string;
  gradeLevel?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: ProgressReportRecord[]; summary: ProgressSummary; total: number; page: number; pageSize: number; totalPages: number }> {
  const supabase = await createClient();
  const { academicYear, gradeLevel, page = 1, pageSize = 20 } = params;

  // This would use an RPC or view in production
  let query = supabase
    .from("section_progress")
    .select("*", { count: "exact" });

  if (gradeLevel) {
    query = query.eq("grade_level", gradeLevel);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .range(from, to)
    .order("grade_level", { ascending: true });

  if (error) {
    console.error("Error getting progress report:", error);
    return {
      data: [],
      summary: {
        totalStudents: 0,
        totalEnrollments: 0,
        completionRate: 0,
        atRiskRate: 0,
        enrollmentTrend: [],
        byGradeLevel: [],
        performanceDistribution: [],
      },
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const summary: ProgressSummary = {
    totalStudents: data?.reduce((acc, r) => acc + (r.total_students || 0), 0) || 0,
    totalEnrollments: data?.reduce((acc, r) => acc + (r.active_enrollments || 0), 0) || 0,
    completionRate: 0,
    atRiskRate: 0,
    enrollmentTrend: [],
    byGradeLevel: [],
    performanceDistribution: [],
  };

  return {
    data: (data || []) as ProgressReportRecord[],
    summary,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// Export Functions
export async function exportReport(
  reportType: "attendance" | "grades" | "progress",
  format: "csv" | "excel" | "pdf",
  params: Record<string, unknown>
): Promise<Blob | null> {
  // In production, this would call an RPC or serverless function
  // that generates the export file

  await logAuditEvent({
    action: "export",
    entityType: "report",
    metadata: { reportType, format, params },
  });

  // Return null for now - actual implementation would generate file
  return null;
}

// Helper Functions
function getGradeLetter(grade: number): string {
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 75) return "C";
  if (grade >= 70) return "D";
  return "F";
}

// Dashboard Stats
export async function getDashboardStats() {
  const supabase = await createClient();

  const [
    { count: totalStudents },
    { count: totalTeachers },
    { count: totalCourses },
    { count: totalSections },
    { count: activeEnrollments },
    { count: pendingEnrollments },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("sections").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    totalStudents: totalStudents || 0,
    totalTeachers: totalTeachers || 0,
    totalCourses: totalCourses || 0,
    totalSections: totalSections || 0,
    activeEnrollments: activeEnrollments || 0,
    pendingEnrollments: pendingEnrollments || 0,
  };
}

export async function getRecentActivity(limit: number = 10) {
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
        profiles (
          full_name
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getEnrollmentTrends(months: number = 6) {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_enrollment_trends", { months_back: months });

  return data || [];
}

export async function getGradeDistribution(gradingPeriod?: string) {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_grade_distribution", {
    p_grading_period: gradingPeriod
  });

  return data || [];
}

export async function getAttendanceOverview(dateFrom?: string, dateTo?: string) {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_attendance_overview", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });

  return data || { present: 0, absent: 0, late: 0, excused: 0 };
}
