/**
 * Start Live Session API
 * POST: Start a scheduled session and create Daily.co room
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/dal/auth';
import { getDailyClient } from '@/lib/services/daily/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const profile = await getCurrentProfile();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.id;

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

    if (session.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Session is already ${session.status}` },
        { status: 400 }
      );
    }

    // Create Daily.co room
    const dailyClient = getDailyClient();
    const roomName = `session-${sessionId}`;

    const room = await dailyClient.createRoom({
      name: roomName,
      privacy: 'private',
      properties: {
        enable_chat: false, // Use our custom Q&A instead
        enable_screenshare: true,
        enable_recording: session.recording_enabled ? 'cloud' : undefined,
        max_participants: session.max_participants,
        start_video_off: true,
        start_audio_off: true,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      },
    });

    // Create meeting token for teacher (owner)
    const teacherToken = await dailyClient.createMeetingToken(roomName, {
      is_owner: true,
      enable_recording: session.recording_enabled,
      user_name: 'Teacher',
    });

    // Update session with room details
    const { data: updatedSession, error: updateError } = await supabase
      .from('live_sessions')
      .update({
        status: 'live',
        actual_start: new Date().toISOString(),
        daily_room_name: room.name,
        daily_room_url: room.url,
        daily_room_config: room.config,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      // Clean up room if database update fails
      await dailyClient.deleteRoom(roomName);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    // Start recording if enabled
    if (session.recording_enabled) {
      try {
        await dailyClient.startRecording(roomName);
        await supabase
          .from('live_sessions')
          .update({ recording_started_at: new Date().toISOString() })
          .eq('id', sessionId);
      } catch (error) {
        console.error('Error starting recording:', error);
        // Continue anyway - recording can be started manually
      }
    }

    return NextResponse.json({
      session: updatedSession,
      roomUrl: room.url,
      token: teacherToken,
    });
  } catch (error) {
    console.error('Error in POST /api/teacher/live-sessions/[id]/start:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
