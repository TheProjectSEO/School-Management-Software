/**
 * Live Session Reactions API
 * POST: Send a reaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStudentAPI } from '@/lib/auth/requireStudentAPI';

const VALID_REACTIONS = [
  'raise_hand',
  'thumbs_up',
  'clap',
  'confused',
  'speed_up',
  'slow_down',
] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const auth = await requireStudentAPI();
  if (!auth.success) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { reaction_type } = body;

  if (!reaction_type || !VALID_REACTIONS.includes(reaction_type)) {
    return NextResponse.json(
      { error: `Invalid reaction type. Must be one of: ${VALID_REACTIONS.join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Verify session is live
  const { data: session } = await supabase
    .from('live_sessions')
    .select('id, course_id, status')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.status !== 'live') {
    return NextResponse.json({ error: 'Session is not live' }, { status: 400 });
  }

  // Check enrollment OR section-based access (BUG-002 pattern)
  const { count: enrollCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', auth.student.studentId)
    .eq('course_id', session.course_id);

  if (!enrollCount) {
    const sectionId = auth.student.sectionId;
    const { count: assignCount } = sectionId
      ? await supabase
          .from('teacher_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('section_id', sectionId)
          .eq('course_id', session.course_id)
      : { count: 0 };

    if (!assignCount) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 });
    }
  }

  // Insert reaction — expires_at defaults to NOW() + INTERVAL '10 seconds' via table default
  const { data: reaction, error: reactionError } = await supabase
    .from('session_reactions')
    .insert({
      session_id: sessionId,
      student_id: auth.student.studentId,
      reaction_type,
    })
    .select()
    .single();

  if (reactionError) {
    console.error('[react] insert error:', reactionError);
    return NextResponse.json({ error: 'Failed to send reaction' }, { status: 500 });
  }

  return NextResponse.json(reaction, { status: 201 });
}
