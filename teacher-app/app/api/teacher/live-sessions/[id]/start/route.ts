import { NextRequest, NextResponse } from 'next/server';
import { createClient, createN8nSchemaClient } from '@/lib/supabase/server';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';
import { getDailyClient, DailyClient } from '@/lib/services/daily/client';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  // Validate environment variables first
  if (!process.env.DAILY_API_KEY) {
    console.error('[Start Session] DAILY_API_KEY environment variable is not set');
    return NextResponse.json(
      { error: 'Server configuration error: Daily.co API key not configured' },
      { status: 500 }
    );
  }

  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  // Use public schema for live_sessions (primary source)
  const supabase = await createClient();
  // Use n8n schema for teacher_live_sessions (sync)
  const n8nSupabase = await createN8nSchemaClient();

  // Fetch session from public.live_sessions (primary table)
  console.log(`[Start Session] Fetching session: ${sessionId}`);
  const { data: session, error } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    console.error('[Start Session] Session not found in live_sessions:', error);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  console.log(`[Start Session] Session found, status: ${session.status}, course_id: ${session.course_id}`);

  // Verify teacher has access to this course (teacher_assignments is in public schema)
  const { count: accessCount } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', auth.teacher.teacherId)
    .eq('course_id', session.course_id);

  if (!accessCount) {
    console.error('[Start Session] Teacher not authorized for this course');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (session.status !== 'scheduled') {
    return NextResponse.json(
      { error: `Session is already ${session.status}` },
      { status: 400 }
    );
  }

  // Create Daily.co room
  let daily: DailyClient;
  try {
    daily = getDailyClient();
  } catch (clientError) {
    console.error('[Start Session] Failed to initialize Daily client:', clientError);
    return NextResponse.json(
      { error: 'Failed to initialize video service' },
      { status: 500 }
    );
  }

  const roomName = `session-${sessionId}`;

  try {
    // Check if room already exists and delete it
    console.log(`[Start Session] Checking if room exists: ${roomName}`);
    try {
      const existingRoom = await daily.getRoom(roomName);
      if (existingRoom) {
        console.log(`[Start Session] Room already exists, deleting: ${roomName}`);
        await daily.deleteRoom(roomName);
      }
    } catch {
      // Room doesn't exist, which is expected
      console.log(`[Start Session] Room doesn't exist yet, creating: ${roomName}`);
    }

    // Create new room
    console.log(`[Start Session] Creating Daily.co room: ${roomName}`);
    const room = await daily.createRoom({
      name: roomName,
      privacy: 'public',
      properties: {
        enable_screenshare: true,
        enable_recording: 'cloud',
        max_participants: session.max_participants || 50,
        start_video_off: true,
        start_audio_off: true,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12, // 12h
      },
    });

    console.log(`[Start Session] Room created successfully: ${room.url}`);

    // Update public.live_sessions table (primary)
    console.log('[Start Session] Updating live_sessions (primary)...');
    const { data: updated, error: updateErr } = await supabase
      .from('live_sessions')
      .update({
        status: 'live',
        actual_start: new Date().toISOString(),
        daily_room_name: room.name,
        daily_room_url: room.url,
        recording_enabled: true,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateErr) {
      console.error('[Start Session] Failed to update live_sessions:', updateErr);
      try { await daily.deleteRoom(room.name); } catch {}
      return NextResponse.json(
        { error: 'Failed to update session', details: updateErr.message },
        { status: 500 }
      );
    }

    // Sync to n8n_content_creation.teacher_live_sessions
    console.log('[Start Session] Syncing to teacher_live_sessions...');
    const { error: syncError } = await n8nSupabase
      .from('teacher_live_sessions')
      .update({
        status: 'live',
        actual_start: new Date().toISOString(),
        provider: 'daily',
        room_id: room.name,
        join_url: room.url,
      })
      .eq('id', sessionId);

    if (syncError) {
      console.error('[Start Session] Error syncing to teacher_live_sessions:', syncError);
      // Continue anyway - primary table is updated
    }

    // Try to start recording (non-blocking, optional)
    console.log('[Start Session] Attempting to start recording...');
    try {
      await daily.startRecording(room.name);
      console.log('[Start Session] Recording started successfully');
      await supabase
        .from('live_sessions')
        .update({ recording_started_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (recordingError) {
      // Recording start is optional - don't fail the whole session
      console.warn('[Start Session] Could not start recording (may need participants first):', recordingError);
    }

    console.log(`[Start Session] Session started successfully: ${sessionId}`);
    return NextResponse.json({
      session: updated,
      roomUrl: room.url,
      roomName: room.name
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.error('[Start Session] Error:', errorMessage, e);
    return NextResponse.json(
      { error: 'Failed to start session', details: errorMessage },
      { status: 500 }
    );
  }
}

