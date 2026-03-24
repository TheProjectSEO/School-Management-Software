/**
 * Teacher Join Token API
 * GET: Returns room URL + owner meeting token for the teacher
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';
import { getDailyClient } from '@/lib/services/daily/client';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = createServiceClient();

  // Fetch session (flat select — no FK joins per BUG-001)
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, status, daily_room_name, daily_room_url, course_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.status !== 'live') {
    return NextResponse.json(
      { error: `Session is not live (status: ${session.status})` },
      { status: 400 }
    );
  }

  if (!session.daily_room_name || !session.daily_room_url) {
    return NextResponse.json({ error: 'Session room not available' }, { status: 400 });
  }

  // Verify teacher owns this course
  const { count } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', auth.teacher.teacherId)
    .eq('course_id', session.course_id);

  if (!count) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Create owner meeting token (backend only — API key never exposed to client)
  // auth.teacher.fullName already populated by requireTeacherAPI via get_teacher_profile RPC
  const teacherName = auth.teacher.fullName || 'Teacher';

  try {
    const daily = getDailyClient();
    const result = await daily.createMeetingToken(session.daily_room_name, {
      is_owner: true,
      user_name: teacherName,
      user_id: auth.teacher.teacherId,
      start_video_off: false,
      start_audio_off: false,
    });

    return NextResponse.json({
      roomUrl: session.daily_room_url,
      token: result.token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[join-token] Failed to create meeting token:', message);
    return NextResponse.json(
      { error: `Failed to create meeting token: ${message}` },
      { status: 500 }
    );
  }
}
