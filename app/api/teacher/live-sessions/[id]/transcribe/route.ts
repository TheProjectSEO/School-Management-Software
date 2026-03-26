/**
 * Manual Transcription API
 * POST: Trigger transcription for a session's recording
 * GET:  Check transcript status / preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';
import { transcribeSessionRecording } from '@/lib/services/transcription';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = createServiceClient();

  // Verify teacher has access to this session's course
  const { data: session } = await supabase
    .from('live_sessions')
    .select('id, course_id, recording_url')
    .eq('id', sessionId)
    .single();

  if (!session) {
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

  if (!session.recording_url) {
    return NextResponse.json(
      { error: 'No recording available for this session' },
      { status: 400 }
    );
  }

  const result = await transcribeSessionRecording(sessionId);

  if (result.alreadyExists) {
    return NextResponse.json(
      { error: 'Transcript already exists for this session', transcriptId: result.transcriptId },
      { status: 409 }
    );
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    transcriptId: result.transcriptId,
    language: result.language,
    textLength: result.textLength,
    chunksCreated: result.chunksCreated,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = createServiceClient();

  const { data: transcript } = await supabase
    .from('session_transcripts')
    .select('id, language, created_at, transcript_text')
    .eq('session_id', sessionId)
    .single();

  if (!transcript) {
    return NextResponse.json({
      hasTranscript: false,
      message: 'No transcript available. Use POST to generate one.',
    });
  }

  const { count: chunkCount } = await supabase
    .from('session_transcript_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  return NextResponse.json({
    hasTranscript: true,
    transcriptId: transcript.id,
    language: transcript.language,
    createdAt: transcript.created_at,
    textLength: transcript.transcript_text?.length ?? 0,
    chunkCount: chunkCount ?? 0,
    preview:
      transcript.transcript_text?.substring(0, 500) +
      ((transcript.transcript_text?.length ?? 0) > 500 ? '...' : ''),
  });
}
