import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';
import { getDailyClient } from '@/lib/services/daily/client';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from('teacher_live_sessions')
    .select(
      `
      *,
      course_id
    `
    )
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { count: accessCount } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', auth.teacher.teacherId)
    .eq('course_id', session.course_id);

  if (!accessCount) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (session.status !== 'live') {
    return NextResponse.json(
      { error: `Session is not live (status: ${session.status})` },
      { status: 400 }
    );
  }

  try {
    const daily = getDailyClient();

    if (session.room_id) {
      try { await daily.stopRecording(session.room_id); } catch {}
      try { await daily.deleteRoom(session.room_id); } catch {}
    }

    const { data: updated, error: updateErr } = await supabase
      .from('teacher_live_sessions')
      .update({
        status: 'ended',
        actual_end: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    const { error: mirrorError } = await supabase
      .from('live_sessions')
      .update({
        status: 'ended',
        actual_end: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (mirrorError) {
      console.error('Error updating student live session:', mirrorError);
    }

    return NextResponse.json({ session: updated });
  } catch (e) {
    console.error('End session error:', e);
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}

