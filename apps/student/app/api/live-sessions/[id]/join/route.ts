/**
 * Student Join Live Session API
 * POST: Join a live session and get Daily.co token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/dal/auth';
import { getDailyClient } from '@/lib/services/daily/client';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();
    const profile = await getCurrentProfile();

    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('profile_id', profile.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select(
        `
        *,
        course:courses(id, name)
      `
      )
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check session is live
    if (session.status !== 'live') {
      return NextResponse.json(
        { error: `Session is not live (status: ${session.status})` },
        { status: 400 }
      );
    }

    if (!session.daily_room_name || !session.daily_room_url) {
      return NextResponse.json(
        { error: 'Session room not available' },
        { status: 400 }
      );
    }

    // Verify student is enrolled in the course
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

    // Check participant count
    const { count: participantCount } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .is('left_at', null);

    if (participantCount && participantCount >= session.max_participants) {
      return NextResponse.json(
        { error: 'Session is full' },
        { status: 403 }
      );
    }

    // Create Daily.co token for student
    const dailyClient = getDailyClient();
    const studentName = `${student.first_name} ${student.last_name}`;

    const token = await dailyClient.createMeetingToken(session.daily_room_name, {
      user_name: studentName,
      user_id: student.id,
      is_owner: false,
      start_video_off: true,
      start_audio_off: true,
    });

    // Create or update participant record
    const { error: participantError } = await supabase
      .from('session_participants')
      .upsert(
        {
          session_id: sessionId,
          student_id: student.id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          onConflict: 'session_id,student_id',
        }
      )
      .select()
      .single();

    if (participantError) {
      console.error('Error creating participant record:', participantError);
      // Continue anyway - participant tracking is not critical
    }

    return NextResponse.json({
      roomUrl: session.daily_room_url,
      token,
      sessionData: {
        id: session.id,
        title: session.title,
        description: session.description,
        course: session.course,
        recording_enabled: session.recording_enabled,
        max_participants: session.max_participants,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/live-sessions/[id]/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
