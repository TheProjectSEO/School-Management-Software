/**
 * Student Attendance Data Access Layer
 *
 * Provides server-side data fetching functions for student attendance.
 * Data source: "school software".teacher_attendance table
 *
 * Table columns:
 * - id, student_id, teacher_id, course_id, section_id
 * - attendance_date, status, first_seen_at, last_seen_at
 * - notes, created_at
 */

import { createClient } from '@/lib/supabase/server';
import type {
  DailyAttendance,
  AttendanceSummary,
  AttendanceCalendarEntry,
  AttendanceStatus,
  AttendanceFilters,
} from './types/attendance';

// Re-export types for convenient imports
export type {
  DailyAttendance,
  AttendanceSummary,
  AttendanceCalendarEntry,
  AttendanceStatus,
  AttendanceFilters,
} from './types/attendance';

/**
 * Get daily attendance records for a student.
 * Returns attendance data optionally filtered by date range and/or course.
 *
 * @param studentId - The student's ID
 * @param filters - Optional filters for date range and course
 * @returns Array of daily attendance records
 */
export async function getStudentDailyAttendance(
  studentId: string,
  filters?: AttendanceFilters
): Promise<DailyAttendance[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('teacher_attendance')
      .select(`
        id,
        student_id,
        attendance_date,
        status,
        first_seen_at,
        last_seen_at,
        notes,
        course_id,
        courses:course_id (
          name
        )
      `)
      .eq('student_id', studentId)
      .order('attendance_date', { ascending: false });

    // Apply date filters
    if (filters?.startDate) {
      query = query.gte('attendance_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('attendance_date', filters.endDate);
    }
    if (filters?.courseId) {
      query = query.eq('course_id', filters.courseId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching student attendance:', error);
      return [];
    }

    // Transform the data to match our interface
    return (data || []).map((record: any) => ({
      id: record.id,
      student_id: record.student_id,
      date: record.attendance_date,
      status: record.status as AttendanceStatus,
      first_seen_at: record.first_seen_at,
      last_seen_at: record.last_seen_at,
      notes: record.notes,
      course_id: record.course_id,
      course_name: record.courses?.name,
    }));
  } catch (error) {
    console.error('Unexpected error in getStudentDailyAttendance:', error);
    return [];
  }
}

/**
 * Get attendance summary statistics for a student.
 * Calculates totals and rates for a given period.
 *
 * Attendance rate = (present + late) / total * 100
 * Punctuality rate = present / (present + late) * 100
 *
 * @param studentId - The student's ID
 * @param filters - Optional filters for date range
 * @returns Attendance summary with counts and rates
 */
export async function getAttendanceSummary(
  studentId: string,
  filters?: Pick<AttendanceFilters, 'startDate' | 'endDate'>
): Promise<AttendanceSummary> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('teacher_attendance')
      .select('attendance_date, status')
      .eq('student_id', studentId);

    // Apply date filters
    if (filters?.startDate) {
      query = query.gte('attendance_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('attendance_date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance summary:', error);
      return createEmptySummary();
    }

    if (!data || data.length === 0) {
      return createEmptySummary();
    }

    // Group by date to count unique days (in case of multiple courses per day)
    const dailyStatuses = new Map<string, AttendanceStatus>();

    for (const record of data) {
      const existingStatus = dailyStatuses.get(record.attendance_date);
      const currentStatus = record.status as AttendanceStatus;

      // Use the "worst" status for the day (absent > late > excused > present)
      if (!existingStatus || getStatusPriority(currentStatus) > getStatusPriority(existingStatus)) {
        dailyStatuses.set(record.attendance_date, currentStatus);
      }
    }

    // Count each status type
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let excusedDays = 0;

    for (const status of dailyStatuses.values()) {
      switch (status) {
        case 'present':
          presentDays++;
          break;
        case 'late':
          lateDays++;
          break;
        case 'absent':
          absentDays++;
          break;
        case 'excused':
          excusedDays++;
          break;
      }
    }

    const totalDays = dailyStatuses.size;

    // Calculate rates
    // Attendance rate: (present + late) / total * 100
    const attendanceRate = totalDays > 0
      ? ((presentDays + lateDays) / totalDays) * 100
      : 0;

    // Punctuality rate: present / (present + late) * 100
    const attendedDays = presentDays + lateDays;
    const punctualityRate = attendedDays > 0
      ? (presentDays / attendedDays) * 100
      : 0;

    return {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      excusedDays,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      punctualityRate: Math.round(punctualityRate * 100) / 100,
    };
  } catch (error) {
    console.error('Unexpected error in getAttendanceSummary:', error);
    return createEmptySummary();
  }
}

/**
 * Get attendance calendar entries for a specific month.
 * Groups attendance by date with course breakdown.
 *
 * @param studentId - The student's ID
 * @param year - The year (e.g., 2024)
 * @param month - The month (1-12)
 * @returns Array of calendar entries for the month
 */
export async function getAttendanceCalendar(
  studentId: string,
  year: number,
  month: number
): Promise<AttendanceCalendarEntry[]> {
  try {
    const supabase = await createClient();

    // Calculate date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate(); // Last day of month
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('teacher_attendance')
      .select(`
        attendance_date,
        status,
        course_id,
        courses:course_id (
          name
        )
      `)
      .eq('student_id', studentId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true });

    if (error) {
      console.error('Error fetching attendance calendar:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group by date
    const entriesByDate = new Map<string, {
      statuses: AttendanceStatus[];
      courses: { course_name: string; status: AttendanceStatus }[];
    }>();

    for (const record of data) {
      const date = record.attendance_date;
      const status = record.status as AttendanceStatus;
      const courseName = (record.courses as any)?.name || 'Unknown Course';

      if (!entriesByDate.has(date)) {
        entriesByDate.set(date, { statuses: [], courses: [] });
      }

      const entry = entriesByDate.get(date)!;
      entry.statuses.push(status);
      entry.courses.push({ course_name: courseName, status });
    }

    // Convert to array and determine overall status for each day
    const calendarEntries: AttendanceCalendarEntry[] = [];

    for (const [date, entry] of entriesByDate) {
      // Determine overall status (use "worst" status)
      const overallStatus = entry.statuses.reduce((worst, current) =>
        getStatusPriority(current) > getStatusPriority(worst) ? current : worst
      );

      calendarEntries.push({
        date,
        status: overallStatus,
        courseAttendance: entry.courses.length > 1 ? entry.courses : undefined,
      });
    }

    return calendarEntries;
  } catch (error) {
    console.error('Unexpected error in getAttendanceCalendar:', error);
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Returns a priority value for attendance status.
 * Higher value = worse status (for determining daily overall status).
 */
function getStatusPriority(status: AttendanceStatus): number {
  switch (status) {
    case 'present':
      return 0;
    case 'excused':
      return 1;
    case 'late':
      return 2;
    case 'absent':
      return 3;
    default:
      return 0;
  }
}

/**
 * Creates an empty attendance summary.
 */
function createEmptySummary(): AttendanceSummary {
  return {
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    excusedDays: 0,
    attendanceRate: 0,
    punctualityRate: 0,
  };
}
