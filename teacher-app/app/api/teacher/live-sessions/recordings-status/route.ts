/**
 * List all sessions with recording status
 * GET: Get all sessions with their recording info
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';

export async function GET() {
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = await createClient();
  const { teacherId } = auth.teacher;

  // Get teacher's course assignments
  const { data: teacherAssignments } = await supabase
    .from('teacher_assignments')
    .select('course_id')
    .eq('teacher_profile_id', teacherId);

  if (!teacherAssignments || teacherAssignments.length === 0) {
    return NextResponse.json({ sessions: [] });
  }

  const courseIds = teacherAssignments.map((a) => a.course_id);

  // Get all sessions with recording info
  const { data: sessions, error } = await supabase
    .from('live_sessions')
    .select(`
      id,
      title,
      status,
      scheduled_start,
      actual_start,
      actual_end,
      daily_room_name,
      daily_room_url,
      recording_enabled,
      recording_started_at,
      recording_url,
      recording_size_bytes,
      recording_duration_seconds,
      course:courses(id, name)
    `)
    .in('course_id', courseIds)
    .order('scheduled_start', { ascending: false });

  if (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  // Summarize recording status
  const summary = {
    total: sessions?.length || 0,
    ended: sessions?.filter(s => s.status === 'ended').length || 0,
    withRecording: sessions?.filter(s => s.recording_url).length || 0,
    withoutRecording: sessions?.filter(s => s.status === 'ended' && !s.recording_url).length || 0,
  };

  return NextResponse.json({
    summary,
    sessions: sessions?.map(s => ({
      id: s.id,
      title: s.title,
      status: s.status,
      courseName: (s.course as unknown as { id: string; name: string } | null)?.name,
      scheduledStart: s.scheduled_start,
      actualStart: s.actual_start,
      actualEnd: s.actual_end,
      dailyRoomName: s.daily_room_name,
      recording: {
        enabled: s.recording_enabled,
        startedAt: s.recording_started_at,
        url: s.recording_url,
        sizeBytes: s.recording_size_bytes,
        durationSeconds: s.recording_duration_seconds,
        hasRecording: !!s.recording_url,
      },
    })),
  });
}
