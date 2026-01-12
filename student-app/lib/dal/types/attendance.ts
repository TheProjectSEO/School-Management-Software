/**
 * Student Attendance Types
 *
 * Types for student-facing attendance view.
 * Data source: "school software".teacher_attendance table
 */

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

/**
 * A single daily attendance record for a student.
 * May include course-level detail if attendance was taken per-course.
 */
export interface DailyAttendance {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  first_seen_at?: string;
  last_seen_at?: string;
  notes?: string;
  course_id?: string;
  course_name?: string;
}

/**
 * Aggregated attendance statistics for a student over a period.
 */
export interface AttendanceSummary {
  /** Total number of school days in the period */
  totalDays: number;
  /** Days marked as 'present' */
  presentDays: number;
  /** Days marked as 'late' */
  lateDays: number;
  /** Days marked as 'absent' */
  absentDays: number;
  /** Days marked as 'excused' */
  excusedDays: number;
  /** Attendance rate: (present + late) / total * 100 */
  attendanceRate: number;
  /** Punctuality rate: present / (present + late) * 100 (0 if no present or late days) */
  punctualityRate: number;
}

/**
 * A calendar entry for attendance visualization.
 * Groups all course-level attendance for a single date.
 */
export interface AttendanceCalendarEntry {
  date: string;
  /** Overall status for the day (most common or worst status) */
  status: AttendanceStatus;
  /** Breakdown of attendance by course for the day */
  courseAttendance?: { course_name: string; status: AttendanceStatus }[];
}

/**
 * Filters for attendance queries
 */
export interface AttendanceFilters {
  /** Start date (inclusive) in YYYY-MM-DD format */
  startDate?: string;
  /** End date (inclusive) in YYYY-MM-DD format */
  endDate?: string;
  /** Filter by specific course */
  courseId?: string;
}
