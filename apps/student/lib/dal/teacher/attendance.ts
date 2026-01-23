/**
 * Teacher Attendance Data Access Layer
 *
 * Handles session attendance, daily presence, and attendance overrides.
 * All queries use n8n_content_creation schema.
 */

import { createClient } from '@/lib/supabase/server';

// Types
export interface LiveSession {
  id: string;
  section_subject_id: string;
  module_id?: string;
  title: string;
  start_at: string;
  end_at?: string;
  provider?: 'zoom' | 'meet' | 'livekit' | 'daily' | 'twilio';
  room_id?: string;
  join_url?: string;
  recording_url?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  created_by: string;
  created_at: string;
}

export interface SessionPresenceEvent {
  id: string;
  session_id: string;
  student_id: string;
  joined_at: string;
  left_at?: string;
  ping_count: number;
  created_at: string;
}

export interface LiveAttendance {
  id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  detected_from_presence: boolean;
  manual_override: boolean;
  notes?: string;
  updated_by?: string;
  updated_at?: string;
  created_at: string;
  // Joined data
  student_name?: string;
  student_number?: string;
}

export interface DailyPresence {
  id: string;
  student_id: string;
  date: string;
  first_seen_at?: string;
  last_seen_at?: string;
  detected_from_login: boolean;
  manual_override: boolean;
  status: 'present' | 'absent' | 'excused';
  notes?: string;
  updated_by?: string;
  updated_at?: string;
  created_at: string;
  // Joined data
  student_name?: string;
  student_number?: string;
}

/**
 * Get attendance for a specific session
 * Includes auto-detected presence and manual overrides
 */
export async function getSessionAttendance(sessionId: string): Promise<LiveAttendance[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('live_attendance')
      .select(`
        *,
        student_profiles (
          first_name,
          last_name,
          student_number
        )
      `)
      .eq('session_id', sessionId)
      .order('student_profiles.last_name', { ascending: true });

    if (error) {
      console.error('Error fetching session attendance:', error);
      return [];
    }

    return (data || []).map((record: any) => ({
      ...record,
      student_name: `${record.student_profiles?.first_name || ''} ${record.student_profiles?.last_name || ''}`.trim(),
      student_number: record.student_profiles?.student_number
    })) as LiveAttendance[];
  } catch (error) {
    console.error('Unexpected error in getSessionAttendance:', error);
    return [];
  }
}

/**
 * Override attendance status for a student in a session
 * Sets manual_override=true
 */
export async function overrideAttendance(
  sessionId: string,
  studentId: string,
  status: 'present' | 'absent' | 'late' | 'excused',
  updatedBy: string,
  notes?: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Check if attendance record exists
    const { data: existing } = await supabase
      .from('live_attendance')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('live_attendance')
        .update({
          status,
          manual_override: true,
          notes,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating attendance:', error);
        return false;
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from('live_attendance')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          status,
          detected_from_presence: false,
          manual_override: true,
          notes,
          updated_by: updatedBy,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating attendance:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in overrideAttendance:', error);
    return false;
  }
}

/**
 * Get daily attendance for a specific date and section
 * Used for attendance dashboard and reports
 */
export async function getDailyAttendance(
  date: string,
  sectionId: string
): Promise<DailyPresence[]> {
  try {
    const supabase = await createClient();

    // Get all students in section
    const { data: enrollments } = await supabase
      .from('section_enrollments')
      .select('student_id')
      .eq('section_id', sectionId)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    const studentIds = enrollments.map(e => e.student_id);

    // Get attendance records for these students on this date
    const { data, error } = await supabase
      .from('daily_presence')
      .select(`
        *,
        student_profiles (
          first_name,
          last_name,
          student_number
        )
      `)
      .eq('date', date)
      .in('student_id', studentIds)
      .order('student_profiles.last_name', { ascending: true });

    if (error) {
      console.error('Error fetching daily attendance:', error);
      return [];
    }

    // Create map of existing records
    const recordMap = new Map(
      (data || []).map((record: any) => [record.student_id, record])
    );

    // Fill in missing records with default 'absent' status
    const allRecords = studentIds.map(studentId => {
      if (recordMap.has(studentId)) {
        const record = recordMap.get(studentId);
        return {
          ...record,
          student_name: `${record.student_profiles?.first_name || ''} ${record.student_profiles?.last_name || ''}`.trim(),
          student_number: record.student_profiles?.student_number
        };
      } else {
        // No record means absent (unless overridden)
        return {
          id: `temp-${studentId}`,
          student_id: studentId,
          date,
          status: 'absent' as const,
          detected_from_login: false,
          manual_override: false,
          created_at: date
        };
      }
    });

    return allRecords as DailyPresence[];
  } catch (error) {
    console.error('Unexpected error in getDailyAttendance:', error);
    return [];
  }
}

/**
 * Track student presence in a live session
 * Called when student joins/leaves or sends keepalive ping
 */
export async function trackPresence(
  sessionId: string,
  studentId: string,
  action: 'join' | 'leave' | 'ping'
): Promise<boolean> {
  try {
    const supabase = await createClient();

    if (action === 'join') {
      // Create new presence event
      const { error } = await supabase
        .from('session_presence_events')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          joined_at: new Date().toISOString(),
          ping_count: 0,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error tracking join:', error);
        return false;
      }

      // Update or create attendance record
      const { data: existing } = await supabase
        .from('live_attendance')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .single();

      if (existing) {
        await supabase
          .from('live_attendance')
          .update({
            status: 'present',
            detected_from_presence: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('live_attendance')
          .insert({
            session_id: sessionId,
            student_id: studentId,
            status: 'present',
            detected_from_presence: true,
            manual_override: false,
            created_at: new Date().toISOString()
          });
      }
    } else if (action === 'leave') {
      // Find active presence event and update left_at
      const { data: events } = await supabase
        .from('session_presence_events')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .is('left_at', null)
        .order('joined_at', { ascending: false })
        .limit(1);

      if (events && events.length > 0) {
        await supabase
          .from('session_presence_events')
          .update({ left_at: new Date().toISOString() })
          .eq('id', events[0].id);
      }
    } else if (action === 'ping') {
      // Increment ping count on active presence event
      const { data: events } = await supabase
        .from('session_presence_events')
        .select('id, ping_count')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .is('left_at', null)
        .order('joined_at', { ascending: false })
        .limit(1);

      if (events && events.length > 0) {
        await supabase
          .from('session_presence_events')
          .update({ ping_count: events[0].ping_count + 1 })
          .eq('id', events[0].id);
      }
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in trackPresence:', error);
    return false;
  }
}

/**
 * Get attendance summary for a section
 * Returns stats by date range
 */
export async function getAttendanceSummary(
  sectionId: string,
  startDate: string,
  endDate: string
): Promise<{
  total_days: number;
  total_sessions: number;
  average_attendance_rate: number;
  by_student: Array<{
    student_id: string;
    student_name: string;
    present_days: number;
    absent_days: number;
    attendance_rate: number;
  }>;
}> {
  try {
    const supabase = await createClient();

    // Get all students in section
    const { data: enrollments } = await supabase
      .from('section_enrollments')
      .select(`
        student_id,
        student_profiles (
          first_name,
          last_name
        )
      `)
      .eq('section_id', sectionId)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) {
      return {
        total_days: 0,
        total_sessions: 0,
        average_attendance_rate: 0,
        by_student: []
      };
    }

    // Get all daily presence records in date range
    const { data: records } = await supabase
      .from('daily_presence')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('student_id', enrollments.map(e => e.student_id));

    // Calculate unique days
    const uniqueDays = new Set((records || []).map(r => r.date)).size;

    // Calculate per-student stats
    const studentStats = enrollments.map(enrollment => {
      const studentRecords = (records || []).filter(
        r => r.student_id === enrollment.student_id
      );

      const presentDays = studentRecords.filter(r => r.status === 'present').length;
      const absentDays = uniqueDays - presentDays;
      const attendanceRate = uniqueDays > 0 ? (presentDays / uniqueDays) * 100 : 0;

      const profile = Array.isArray(enrollment.student_profiles)
        ? enrollment.student_profiles[0]
        : enrollment.student_profiles;
      return {
        student_id: enrollment.student_id,
        student_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        present_days: presentDays,
        absent_days: absentDays,
        attendance_rate: Math.round(attendanceRate * 100) / 100
      };
    });

    const averageAttendanceRate =
      studentStats.reduce((sum, s) => sum + s.attendance_rate, 0) / studentStats.length || 0;

    return {
      total_days: uniqueDays,
      total_sessions: 0, // TODO: Count live sessions in range
      average_attendance_rate: Math.round(averageAttendanceRate * 100) / 100,
      by_student: studentStats
    };
  } catch (error) {
    console.error('Unexpected error in getAttendanceSummary:', error);
    return {
      total_days: 0,
      total_sessions: 0,
      average_attendance_rate: 0,
      by_student: []
    };
  }
}
