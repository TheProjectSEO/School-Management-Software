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

    return NextResponse.json({ session: updated });
  } catch (e) {
    console.error('End session error:', e);
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}

