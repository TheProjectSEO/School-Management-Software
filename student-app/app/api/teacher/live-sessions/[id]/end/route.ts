/**
 * End Live Session API
 * POST: End a live session, stop recording, and clean up room
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/dal/auth';
import { getDailyClient } from '@/lib/services/daily/client';
import { scheduleRecordingProcessing } from '@/lib/services/daily/recordings';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();
    const profile = await getCurrentProfile();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session and verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select(
        `
        *,
        teacher_profile:teacher_profiles!inner(
          id,
          profile:school_profiles!inner(id, auth_user_id)
        )
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

    if (session.teacher_profile.profile.auth_user_id !== profile.auth_user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.status !== 'live') {
      return NextResponse.json(
        { error: `Session is not live (status: ${session.status})` },
        { status: 400 }
      );
    }

    if (!session.daily_room_name) {
      return NextResponse.json(
        { error: 'No Daily.co room found for this session' },
        { status: 400 }
      );
    }

    const dailyClient = getDailyClient();

    // Stop recording if it was enabled
    if (session.recording_enabled && session.recording_started_at) {
      try {
        await dailyClient.stopRecording(session.daily_room_name);
      } catch (error) {
        console.error('Error stopping recording:', error);
        // Continue anyway
      }
    }

    // Delete Daily.co room
    try {
      await dailyClient.deleteRoom(session.daily_room_name);
    } catch (error) {
      console.error('Error deleting room:', error);
      // Continue anyway
    }

    // Calculate session statistics
    const { data: participants } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId);

    const participantCount = participants?.length || 0;

    // Update session status
    const { data: updatedSession, error: updateError } = await supabase
      .from('live_sessions')
      .update({
        status: 'ended',
        actual_end: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    // Schedule background recording download if recording was enabled
    if (session.recording_enabled) {
      await scheduleRecordingProcessing(sessionId, session.daily_room_name);
    }

    return NextResponse.json({
      session: updatedSession,
      stats: {
        participantCount,
        duration: updatedSession.actual_end && updatedSession.actual_start
          ? Math.floor(
              (new Date(updatedSession.actual_end).getTime() -
                new Date(updatedSession.actual_start).getTime()) /
                1000
            )
          : 0,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/teacher/live-sessions/[id]/end:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
