/**
 * Live Session Reactions API
 * POST: Send reaction
 * GET: Get current reactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/dal/auth';

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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const profile = await getCurrentProfile();

    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;
    const body = await request.json();
    const { reaction_type } = body;

    if (!reaction_type || !VALID_REACTIONS.includes(reaction_type)) {
      return NextResponse.json(
        {
          error: `Invalid reaction type. Must be one of: ${VALID_REACTIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get student profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // Verify session access
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('id, course_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'live') {
      return NextResponse.json(
        { error: 'Session is not live' },
        { status: 400 }
      );
    }

    // Verify enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', student.id)
      .eq('course_id', session.course_id)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Insert reaction (will auto-expire in 10 seconds)
    const { data: reaction, error: reactionError } = await supabase
      .from('session_reactions')
      .insert({
        session_id: sessionId,
        student_id: student.id,
        reaction_type,
      })
      .select()
      .single();

    if (reactionError) {
      console.error('Error creating reaction:', reactionError);
      return NextResponse.json(
        { error: 'Failed to create reaction' },
        { status: 500 }
      );
    }

    // Update participant stats
    await supabase
      .from('session_participants')
      .update({
        reactions_sent: supabase.sql`reactions_sent + 1`,
      })
      .eq('session_id', sessionId)
      .eq('student_id', student.id);

    return NextResponse.json(reaction, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/live-sessions/[id]/react:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const profile = await getCurrentProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;

    // Get current reactions (not expired)
    const { data: reactions, error: reactionsError } = await supabase
      .from('session_reactions')
      .select('reaction_type, created_at')
      .eq('session_id', sessionId)
      .gt('expires_at', new Date().toISOString());

    if (reactionsError) {
      console.error('Error fetching reactions:', reactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch reactions' },
        { status: 500 }
      );
    }

    // Aggregate counts by reaction type
    const counts = reactions.reduce((acc, r) => {
      acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      counts,
      total: reactions.length,
    });
  } catch (error) {
    console.error('Error in GET /api/live-sessions/[id]/react:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
