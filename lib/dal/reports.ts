/**
 * Reporting Data Access Layer
 *
 * Provides functions for generating reports on attendance,
 * grades, progress, and dashboard statistics.
 */

import { createServiceClient } from '@/lib/supabase/service';

// Aliases for API routes
export { getGradesReport as getGradeReport };

// Types
export interface AttendanceReportFilters {
  schoolId?: string;
  sectionId?: string;
  courseId?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
  status?: 'present' | 'absent' | 'late' | 'excused';
}

export interface AttendanceReportItem {
  student_id: string;
  student_name: string;
  student_lrn: string;
  section_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  attendance_rate: number;
}

export interface GradesReportFilters {
  schoolId?: string;
  sectionId?: string;
  courseId?: string;
  studentId?: string;
  gradingPeriodId?: string;
}

export interface GradesReportItem {
  student_id: string;
  student_name: string;
  student_lrn: string;
  section_name: string;
  course_name: string;
  grading_period: string;
  grade: number;
  status: 'pending' | 'finalized' | 'released';
  is_released: boolean;
}

export interface ProgressReportFilters {
  schoolId?: string;
  sectionId?: string;
  courseId?: string;
  studentId?: string;
}

export interface ProgressReportItem {
  student_id: string;
  student_name: string;
  student_lrn: string;
  section_name: string;
  course_name: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  last_accessed_at?: string;
}

export interface DashboardStats {
  total_students: number;
  total_teachers: number;
  total_sections: number;
  total_courses: number;
  active_enrollments: number;
  pending_enrollments: number;
  average_attendance_rate: number;
  average_grade: number;
}

/**
 * Get attendance report data with optional filters
 */
export async function getAttendanceReport(
  filters: AttendanceReportFilters
): Promise<AttendanceReportItem[]> {
  try {
    const supabase = createServiceClient();

    // Build the query for attendance data
    let query = supabase
      .from('teacher_attendance')
      .select(
        `
        student_id,
        attendance_date,
        status,
        student:students!inner(
          id,
          lrn,
          profile:school_profiles!inner(full_name),
          section:sections(name)
        )
      `
      );

    // Apply filters
    if (filters.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    if (filters.courseId) {
      query = query.eq('course_id', filters.courseId);
    }

    if (filters.startDate) {
      query = query.gte('attendance_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('attendance_date', filters.endDate);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance report:', error);
      return [];
    }

    // Group by student and calculate stats
    const studentStats = new Map<string, AttendanceReportItem>();

    (data || []).forEach((record: any) => {
      const studentId = record.student_id;
      const student = record.student;

      if (!studentStats.has(studentId)) {
        studentStats.set(studentId, {
          student_id: studentId,
          student_name:
            student?.profile?.[0]?.full_name ||
            student?.profile?.full_name ||
            'Unknown',
          student_lrn: student?.lrn || 'Unknown',
          section_name:
            student?.section?.[0]?.name || student?.section?.name || 'Unknown',
          total_days: 0,
          present_days: 0,
          absent_days: 0,
          late_days: 0,
          excused_days: 0,
          attendance_rate: 0,
        });
      }

      const stats = studentStats.get(studentId)!;
      stats.total_days++;

      switch (record.status) {
        case 'present':
          stats.present_days++;
          break;
        case 'absent':
          stats.absent_days++;
          break;
        case 'late':
          stats.late_days++;
          break;
        case 'excused':
          stats.excused_days++;
          break;
      }
    });

    // Calculate attendance rates
    studentStats.forEach((stats) => {
      if (stats.total_days > 0) {
        stats.attendance_rate = Math.round(
          ((stats.present_days + stats.late_days) / stats.total_days) * 100
        );
      }
    });

    return Array.from(studentStats.values());
  } catch (error) {
    console.error('Unexpected error in getAttendanceReport:', error);
    return [];
  }
}

/**
 * Get grades report data with optional filters
 */
export async function getGradesReport(
  filters: GradesReportFilters
): Promise<GradesReportItem[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase.from('course_grades').select(
      `
        *,
        student:students!inner(
          id,
          lrn,
          profile:school_profiles!inner(full_name),
          section:sections(name)
        ),
        course:courses!inner(name),
        grading_period:grading_periods(name)
      `
    );

    if (filters.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    if (filters.courseId) {
      query = query.eq('course_id', filters.courseId);
    }

    if (filters.gradingPeriodId) {
      query = query.eq('grading_period_id', filters.gradingPeriodId);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Error fetching grades report:', error);
      return [];
    }

    return (data || []).map((record: any) => ({
      student_id: record.student_id,
      student_name:
        record.student?.profile?.[0]?.full_name ||
        record.student?.profile?.full_name ||
        'Unknown',
      student_lrn: record.student?.lrn || 'Unknown',
      section_name:
        record.student?.section?.[0]?.name ||
        record.student?.section?.name ||
        'Unknown',
      course_name:
        record.course?.[0]?.name || record.course?.name || 'Unknown',
      grading_period:
        record.grading_period?.[0]?.name ||
        record.grading_period?.name ||
        'Unknown',
      grade: record.grade || 0,
      status: record.status,
      is_released: record.is_released,
    }));
  } catch (error) {
    console.error('Unexpected error in getGradesReport:', error);
    return [];
  }
}

/**
 * Get progress report data with optional filters
 */
export async function getProgressReport(
  filters: ProgressReportFilters
): Promise<ProgressReportItem[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase.from('student_progress').select(
      `
        *,
        student:students!inner(
          id,
          lrn,
          profile:school_profiles!inner(full_name),
          section:sections(name)
        ),
        course:courses!inner(name)
      `
    );

    if (filters.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    if (filters.courseId) {
      query = query.eq('course_id', filters.courseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching progress report:', error);
      return [];
    }

    // Group by student and course
    const progressMap = new Map<string, ProgressReportItem>();

    (data || []).forEach((record: any) => {
      const key = `${record.student_id}-${record.course_id}`;

      if (!progressMap.has(key)) {
        progressMap.set(key, {
          student_id: record.student_id,
          student_name:
            record.student?.profile?.[0]?.full_name ||
            record.student?.profile?.full_name ||
            'Unknown',
          student_lrn: record.student?.lrn || 'Unknown',
          section_name:
            record.student?.section?.[0]?.name ||
            record.student?.section?.name ||
            'Unknown',
          course_name:
            record.course?.[0]?.name || record.course?.name || 'Unknown',
          total_lessons: 0,
          completed_lessons: 0,
          progress_percent: 0,
          last_accessed_at: record.last_accessed_at,
        });
      }

      const progress = progressMap.get(key)!;
      progress.total_lessons++;

      if (record.completed_at) {
        progress.completed_lessons++;
      }

      // Update last accessed if more recent
      if (
        record.last_accessed_at &&
        (!progress.last_accessed_at ||
          record.last_accessed_at > progress.last_accessed_at)
      ) {
        progress.last_accessed_at = record.last_accessed_at;
      }
    });

    // Calculate progress percentages
    progressMap.forEach((progress) => {
      if (progress.total_lessons > 0) {
        progress.progress_percent = Math.round(
          (progress.completed_lessons / progress.total_lessons) * 100
        );
      }
    });

    return Array.from(progressMap.values());
  } catch (error) {
    console.error('Unexpected error in getProgressReport:', error);
    return [];
  }
}

/**
 * Get dashboard statistics for admin overview
 */
export async function getDashboardStats(
  schoolId?: string
): Promise<DashboardStats> {
  try {
    const supabase = createServiceClient();

    // Get counts in parallel
    const [
      studentsResult,
      teachersResult,
      sectionsResult,
      coursesResult,
      activeEnrollmentsResult,
      pendingEnrollmentsResult,
    ] = await Promise.all([
      // Total students
      schoolId
        ? supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
        : supabase.from('students').select('*', { count: 'exact', head: true }),

      // Total teachers
      schoolId
        ? supabase
            .from('teacher_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
        : supabase
            .from('teacher_profiles')
            .select('*', { count: 'exact', head: true }),

      // Total sections
      schoolId
        ? supabase
            .from('sections')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
        : supabase.from('sections').select('*', { count: 'exact', head: true }),

      // Total courses
      schoolId
        ? supabase
            .from('courses')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
        : supabase.from('courses').select('*', { count: 'exact', head: true }),

      // Active enrollments
      schoolId
        ? supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('status', 'approved')
        : supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved'),

      // Pending enrollments
      schoolId
        ? supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('status', 'pending')
        : supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
    ]);

    // Calculate average attendance rate
    const { data: attendanceData } = await supabase
      .from('teacher_attendance')
      .select('status');

    let averageAttendanceRate = 0;
    if (attendanceData && attendanceData.length > 0) {
      const presentCount = attendanceData.filter(
        (a: any) => a.status === 'present' || a.status === 'late'
      ).length;
      averageAttendanceRate = Math.round(
        (presentCount / attendanceData.length) * 100
      );
    }

    // Calculate average grade
    const { data: gradesData } = await supabase
      .from('course_grades')
      .select('grade')
      .eq('is_released', true);

    let averageGrade = 0;
    if (gradesData && gradesData.length > 0) {
      const totalGrade = gradesData.reduce(
        (sum: number, g: any) => sum + (g.grade || 0),
        0
      );
      averageGrade = Math.round(totalGrade / gradesData.length);
    }

    return {
      total_students: studentsResult.count || 0,
      total_teachers: teachersResult.count || 0,
      total_sections: sectionsResult.count || 0,
      total_courses: coursesResult.count || 0,
      active_enrollments: activeEnrollmentsResult.count || 0,
      pending_enrollments: pendingEnrollmentsResult.count || 0,
      average_attendance_rate: averageAttendanceRate,
      average_grade: averageGrade,
    };
  } catch (error) {
    console.error('Unexpected error in getDashboardStats:', error);
    return {
      total_students: 0,
      total_teachers: 0,
      total_sections: 0,
      total_courses: 0,
      active_enrollments: 0,
      pending_enrollments: 0,
      average_attendance_rate: 0,
      average_grade: 0,
    };
  }
}

/**
 * Get enrollment statistics by section
 */
export async function getEnrollmentStatsBySection(
  schoolId?: string
): Promise<{ section_name: string; enrollment_count: number }[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase.from('enrollments').select(
      `
        section:sections!inner(
          id,
          name
        )
      `
    );

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching enrollment stats by section:', error);
      return [];
    }

    // Group by section
    const sectionCounts = new Map<string, number>();

    (data || []).forEach((enrollment: any) => {
      const sectionName =
        enrollment.section?.[0]?.name ||
        enrollment.section?.name ||
        'Unknown';
      sectionCounts.set(
        sectionName,
        (sectionCounts.get(sectionName) || 0) + 1
      );
    });

    return Array.from(sectionCounts.entries()).map(([section_name, enrollment_count]) => ({
      section_name,
      enrollment_count,
    }));
  } catch (error) {
    console.error('Unexpected error in getEnrollmentStatsBySection:', error);
    return [];
  }
}

// ============================================================================
// ADDITIONAL REPORT FUNCTIONS FOR API ROUTES
// ============================================================================

/**
 * Get attendance overview for dashboard
 */
export async function getAttendanceOverview(schoolId?: string): Promise<{
  total_records: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_rate: number;
}> {
  try {
    const supabase = createServiceClient();

    let query = supabase.from('teacher_attendance').select('status');

    // Note: school_id filter would require joining with students table
    // For now, return all attendance records

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance overview:', error);
      return { total_records: 0, present: 0, absent: 0, late: 0, excused: 0, attendance_rate: 0 };
    }

    const records = data || [];
    const stats = {
      total_records: records.length,
      present: records.filter((r: any) => r.status === 'present').length,
      absent: records.filter((r: any) => r.status === 'absent').length,
      late: records.filter((r: any) => r.status === 'late').length,
      excused: records.filter((r: any) => r.status === 'excused').length,
      attendance_rate: 0,
    };

    if (stats.total_records > 0) {
      stats.attendance_rate = Math.round(
        ((stats.present + stats.late) / stats.total_records) * 100
      );
    }

    return stats;
  } catch (error) {
    console.error('Unexpected error in getAttendanceOverview:', error);
    return { total_records: 0, present: 0, absent: 0, late: 0, excused: 0, attendance_rate: 0 };
  }
}

/**
 * Get recent activity for dashboard
 */
export async function getRecentActivity(
  schoolId?: string,
  limit: number = 10
): Promise<{
  id: string;
  type: string;
  description: string;
  created_at: string;
  actor_name?: string;
}[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }

    return (data || []).map((log: any) => ({
      id: log.id,
      type: log.action || 'unknown',
      description: log.details || `${log.action} performed`,
      created_at: log.created_at,
      actor_name: log.actor_name,
    }));
  } catch (error) {
    console.error('Unexpected error in getRecentActivity:', error);
    return [];
  }
}

/**
 * Get enrollment trends over time
 */
export async function getEnrollmentTrends(
  schoolId?: string
): Promise<{ date: string; count: number }[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase
      .from('enrollments')
      .select('enrolled_at')
      .eq('status', 'approved')
      .order('enrolled_at', { ascending: true });

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching enrollment trends:', error);
      return [];
    }

    // Group by date
    const trendMap = new Map<string, number>();

    (data || []).forEach((enrollment: any) => {
      if (enrollment.enrolled_at) {
        const date = enrollment.enrolled_at.split('T')[0];
        trendMap.set(date, (trendMap.get(date) || 0) + 1);
      }
    });

    return Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .slice(-30); // Last 30 data points
  } catch (error) {
    console.error('Unexpected error in getEnrollmentTrends:', error);
    return [];
  }
}

/**
 * Get grade distribution statistics
 */
export async function getGradeDistribution(
  schoolId?: string
): Promise<{ range: string; count: number }[]> {
  try {
    const supabase = createServiceClient();

    let query = supabase.from('course_grades').select('grade').eq('is_released', true);

    // Note: Would need to join with courses for school_id filter

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching grade distribution:', error);
      return [];
    }

    // Create distribution buckets
    const distribution = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      'Below 60': 0,
    };

    (data || []).forEach((record: any) => {
      const grade = record.grade || 0;
      if (grade >= 90) distribution['90-100']++;
      else if (grade >= 80) distribution['80-89']++;
      else if (grade >= 70) distribution['70-79']++;
      else if (grade >= 60) distribution['60-69']++;
      else distribution['Below 60']++;
    });

    return Object.entries(distribution).map(([range, count]) => ({ range, count }));
  } catch (error) {
    console.error('Unexpected error in getGradeDistribution:', error);
    return [];
  }
}

/**
 * Export report data to a specific format
 */
export async function exportReport(
  type: 'attendance' | 'grades' | 'progress',
  format: 'csv' | 'json' | 'pdf',
  filters: AttendanceReportFilters | GradesReportFilters | ProgressReportFilters
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    let reportData: any[];

    switch (type) {
      case 'attendance':
        reportData = await getAttendanceReport(filters as AttendanceReportFilters);
        break;
      case 'grades':
        reportData = await getGradesReport(filters as GradesReportFilters);
        break;
      case 'progress':
        reportData = await getProgressReport(filters as ProgressReportFilters);
        break;
      default:
        return { success: false, error: 'Invalid report type' };
    }

    if (format === 'json') {
      return { success: true, data: JSON.stringify(reportData, null, 2) };
    }

    if (format === 'csv') {
      if (reportData.length === 0) {
        return { success: true, data: '' };
      }

      const headers = Object.keys(reportData[0]);
      const csvRows = [
        headers.join(','),
        ...reportData.map((row: any) =>
          headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
        ),
      ];
      return { success: true, data: csvRows.join('\n') };
    }

    // For PDF, return JSON data - actual PDF generation would be done by the API route
    return { success: true, data: JSON.stringify(reportData) };
  } catch (error) {
    console.error('Unexpected error in exportReport:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
