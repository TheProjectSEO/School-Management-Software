import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';
import { getDailyClient } from '@/lib/services/daily/client';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = await createClient();
  const sessionId = params.id;

  // Fetch session and verify access
  const { data: session, error } = await supabase
    .from('teacher_live_sessions')
    .select(
      `
      *,
      section_subject:teacher_assignments(teacher_profile_id)
    `
    )
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.section_subject?.teacher_profile_id !== auth.teacher.teacherId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (session.status !== 'scheduled') {
    return NextResponse.json(
      { error: `Session is already ${session.status}` },
      { status: 400 }
    );
  }

  // Create Daily.co room
  try {
    const daily = getDailyClient();
    const roomName = `teacher-session-${sessionId}`;
    const room = await daily.createRoom({
      name: roomName,
      privacy: 'private',
      properties: {
        enable_screenshare: true,
        enable_recording: 'cloud',
        max_participants: 50,
        start_video_off: true,
        start_audio_off: true,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12, // 12h
      },
    });

    // Optional: token if you need it later
    await daily.createMeetingToken(roomName, { is_owner: true, user_name: auth.teacher.fullName, enable_recording: true });

    const { data: updated, error: updateErr } = await supabase
      .from('teacher_live_sessions')
      .update({
        status: 'live',
        actual_start: new Date().toISOString(),
        provider: 'daily',
        room_id: room.name,
        join_url: room.url,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateErr) {
      try { await daily.deleteRoom(room.name); } catch {}
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ session: updated, roomUrl: room.url });
  } catch (e) {
    console.error('Start session error:', e);
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}

