/**
 * Recording Status API
 * GET: Check recording status for a session
 * POST: Manually trigger recording processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createN8nSchemaClient } from '@/lib/supabase/server';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';
import { getDailyClient } from '@/lib/services/daily/client';
import { processRecordingForSession } from '@/lib/services/daily/recordings';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = await createClient();
  const n8nSupabase = await createN8nSchemaClient();

  // Get session from n8n_content_creation.teacher_live_sessions
  const { data: teacherSession, error: teacherError } = await n8nSupabase
    .from('teacher_live_sessions')
    .select('id, room_id, status, recording_url')
    .eq('id', sessionId)
    .single();

  // Get session from public.live_sessions (primary)
  const { data: studentSession, error: studentError } = await supabase
    .from('live_sessions')
    .select('id, daily_room_name, status, recording_enabled, recording_started_at, recording_url, recording_size_bytes, recording_duration_seconds')
    .eq('id', sessionId)
    .single();

  if (teacherError && studentError) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const roomName = teacherSession?.room_id || studentSession?.daily_room_name;

  // Check Daily.co for recordings if room exists
  let dailyRecordings = null;
  if (roomName) {
    try {
      const daily = getDailyClient();
      const recordings = await daily.getRecordings(roomName);
      dailyRecordings = recordings.map((r) => ({
        id: r.id,
        status: r.status,
        duration: r.duration,
        hasDownloadUrl: !!r.download_url,
      }));
    } catch (dailyErr) {
      console.error('Error fetching Daily.co recordings:', dailyErr);
    }
  }

  // Check if recording exists in storage
  let storageExists = false;
  try {
    const { data } = await supabase.storage
      .from('session-recordings')
      .list(sessionId);
    storageExists = (data && data.length > 0) || false;
  } catch {
    // Storage bucket may not exist
  }

  return NextResponse.json({
    sessionId,
    teacherSession: teacherSession ? {
      status: teacherSession.status,
      roomId: teacherSession.room_id,
      recordingUrl: teacherSession.recording_url,
    } : null,
    studentSession: studentSession ? {
      status: studentSession.status,
      dailyRoomName: studentSession.daily_room_name,
      recordingEnabled: studentSession.recording_enabled,
      recordingStartedAt: studentSession.recording_started_at,
      recordingUrl: studentSession.recording_url,
      recordingSizeBytes: studentSession.recording_size_bytes,
      recordingDurationSeconds: studentSession.recording_duration_seconds,
    } : null,
    dailyRecordings,
    storageExists,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = await createClient();
  const n8nSupabase = await createN8nSchemaClient();

  // Get session from both schemas
  const { data: teacherSession } = await n8nSupabase
    .from('teacher_live_sessions')
    .select('id, room_id, status')
    .eq('id', sessionId)
    .single();

  const { data: studentSession } = await supabase
    .from('live_sessions')
    .select('id, daily_room_name')
    .eq('id', sessionId)
    .single();

  const roomName = teacherSession?.room_id || studentSession?.daily_room_name;

  if (!roomName) {
    return NextResponse.json(
      { error: 'No Daily.co room associated with this session' },
      { status: 400 }
    );
  }

  // Manually trigger recording processing
  console.log(`[Recording] Manually processing recording for session: ${sessionId}`);
  const result = await processRecordingForSession(sessionId, roomName);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, success: false },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    storageUrl: result.storageUrl,
    size: result.size,
    duration: result.duration,
  });
}
