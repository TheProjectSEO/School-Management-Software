/**
 * Get Full Transcript API
 * GET: Retrieve the full transcript for a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = createServiceClient();

  // Get transcript
  const { data: transcript, error } = await supabase
    .from('session_transcripts')
    .select('id, language, transcript_text, created_at')
    .eq('session_id', sessionId)
    .single();

  if (error || !transcript) {
    return NextResponse.json({
      hasTranscript: false,
      message: 'No transcript available for this session.',
    });
  }

  return NextResponse.json({
    hasTranscript: true,
    transcriptId: transcript.id,
    language: transcript.language,
    transcript: transcript.transcript_text,
    createdAt: transcript.created_at,
  });
}
