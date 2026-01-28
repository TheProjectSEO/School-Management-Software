import { NextRequest, NextResponse } from 'next/server';
import { createClient, createN8nSchemaClient } from '@/lib/supabase/server';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';
import { getDailyClient } from '@/lib/services/daily/client';
import { processRecordingForSession } from '@/lib/services/daily/recordings';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  // Use public schema for live_sessions (primary source)
  const supabase = await createClient();
  // Use n8n schema for teacher_live_sessions (sync)
  const n8nSupabase = await createN8nSchemaClient();

  // Fetch session from public.live_sessions (primary table)
  console.log(`[End Session] Fetching session: ${sessionId}`);
  const { data: session, error } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    console.error('[End Session] Session not found:', error);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Verify teacher has access to this course (teacher_assignments is in public schema)
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
    const roomName = session.daily_room_name;

    // Stop recording first (if recording was enabled)
    if (roomName) {
      try {
        await daily.stopRecording(roomName);
        console.log(`[End Session] Recording stopped for room: ${roomName}`);
      } catch (stopErr) {
        console.error('[End Session] Error stopping recording:', stopErr);
      }
    }

    // Update public.live_sessions (primary)
    console.log('[End Session] Updating live_sessions (primary)...');
    const { data: updated, error: updateErr } = await supabase
      .from('live_sessions')
      .update({
        status: 'ended',
        actual_end: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateErr) {
      console.error('[End Session] Failed to update live_sessions:', updateErr);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    // Sync to n8n_content_creation.teacher_live_sessions
    console.log('[End Session] Syncing to teacher_live_sessions...');
    const { error: syncError } = await n8nSupabase
      .from('teacher_live_sessions')
      .update({
        status: 'ended',
        actual_end: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (syncError) {
      console.error('[End Session] Error syncing to teacher_live_sessions:', syncError);
      // Continue anyway - primary table is updated
    }

    // Process recording synchronously
    // Daily.co needs a few seconds after stopping recording before it's available
    let recordingResult = null;
    if (roomName) {
      console.log(`[End Session] Waiting for recording to be ready...`);

      // Wait 10 seconds for Daily.co to finalize the recording
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Try to process the recording
      console.log(`[End Session] Processing recording for session: ${sessionId}`);
      recordingResult = await processRecordingForSession(sessionId, roomName);

      if (recordingResult.success) {
        console.log(`[End Session] Recording processed successfully: ${recordingResult.storageUrl}`);
      } else {
        console.warn(`[End Session] Recording processing failed: ${recordingResult.error}`);
        // Don't fail the request - recording can be retried manually
      }

      // Delete the room after processing
      try {
        await daily.deleteRoom(roomName);
        console.log(`[End Session] Room deleted: ${roomName}`);
      } catch (deleteErr) {
        console.error('[End Session] Error deleting room:', deleteErr);
      }
    }

    return NextResponse.json({
      session: updated,
      message: recordingResult?.success
        ? 'Session ended. Recording is now available.'
        : 'Session ended. Recording may take a moment to process - use the recording status endpoint to check.',
      recording: recordingResult,
    });
  } catch (e) {
    console.error('[End Session] Error:', e);
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}

