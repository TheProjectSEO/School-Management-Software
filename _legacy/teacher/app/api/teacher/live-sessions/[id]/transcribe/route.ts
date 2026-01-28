/**
 * Manual Transcription API
 * POST: Trigger transcription for a session's recording
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTeacherAPI } from '@/lib/auth/requireTeacherAPI';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TranscriptResponse {
  text: string;
  language?: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

function chunkText(text: string, maxChars = 1800): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length > maxChars && current.trim().length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const batchSize = 16;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: batch,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI embeddings failed: ${errorText}`);
    }

    const data = (await response.json()) as { data: { embedding: number[] }[] };
    data.data.forEach((item) => results.push(item.embedding));
  }

  return results;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  const supabase = await createClient();

  // Get session with recording URL
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, title, recording_url, course_id, teacher_profile_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Verify teacher has access
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

  try {
    console.log(`[Transcribe] Starting transcription for session: ${sessionId}`);

    // Check if transcript already exists
    const { data: existingTranscript } = await supabase
      .from('session_transcripts')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (existingTranscript) {
      return NextResponse.json(
        { error: 'Transcript already exists for this session', transcriptId: existingTranscript.id },
        { status: 409 }
      );
    }

    // Download recording from storage
    let recordingUrl = session.recording_url;

    // If it's a relative path, get the public URL
    if (!recordingUrl.startsWith('http')) {
      const { data: urlData } = supabase.storage
        .from('session-recordings')
        .getPublicUrl(recordingUrl);
      recordingUrl = urlData.publicUrl;
    }

    console.log(`[Transcribe] Downloading recording from: ${recordingUrl}`);
    const recordingResponse = await fetch(recordingUrl);
    if (!recordingResponse.ok) {
      throw new Error(`Failed to download recording: ${recordingResponse.status}`);
    }

    const recordingBlob = await recordingResponse.blob();
    console.log(`[Transcribe] Recording size: ${(recordingBlob.size / 1024 / 1024).toFixed(2)} MB`);

    // Check file size (OpenAI Whisper limit is 25MB)
    if (recordingBlob.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Recording file is too large for transcription (max 25MB). Consider using a shorter recording.' },
        { status: 400 }
      );
    }

    // Transcribe with OpenAI Whisper
    console.log(`[Transcribe] Sending to OpenAI Whisper...`);
    const formData = new FormData();
    formData.append('model', 'whisper-1');
    formData.append('file', recordingBlob, 'recording.mp4');
    formData.append('response_format', 'verbose_json');

    const transcriptResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error(`[Transcribe] OpenAI error: ${errorText}`);
      throw new Error(`OpenAI transcription failed: ${errorText}`);
    }

    const transcript = (await transcriptResponse.json()) as TranscriptResponse;
    console.log(`[Transcribe] Transcription complete. Language: ${transcript.language}, Length: ${transcript.text.length} chars`);

    // Save transcript to database
    const { data: savedTranscript, error: transcriptError } = await supabase
      .from('session_transcripts')
      .insert({
        session_id: sessionId,
        provider: 'openai',
        language: transcript.language ?? null,
        transcript_text: transcript.text,
        transcript_json: transcript,
      })
      .select()
      .single();

    if (transcriptError) {
      console.error(`[Transcribe] Error saving transcript:`, transcriptError);
      throw new Error(`Failed to save transcript: ${transcriptError.message}`);
    }

    // Create chunks and embeddings
    console.log(`[Transcribe] Creating chunks and embeddings...`);
    const chunks = chunkText(transcript.text);
    console.log(`[Transcribe] Created ${chunks.length} chunks`);

    if (chunks.length > 0) {
      const embeddings = await embedChunks(chunks);
      console.log(`[Transcribe] Generated ${embeddings.length} embeddings`);

      const chunkRows = chunks.map((chunk, index) => ({
        session_id: sessionId,
        chunk_index: index,
        content: chunk,
        embedding: embeddings[index],
        model: 'text-embedding-3-small',
      }));

      const { error: chunksError } = await supabase
        .from('session_transcript_chunks')
        .upsert(chunkRows, { onConflict: 'session_id,chunk_index' });

      if (chunksError) {
        console.error(`[Transcribe] Error saving chunks:`, chunksError);
        // Don't fail - transcript is saved, chunks can be regenerated
      }
    }

    console.log(`[Transcribe] Transcription complete for session: ${sessionId}`);

    return NextResponse.json({
      success: true,
      transcriptId: savedTranscript.id,
      language: transcript.language,
      textLength: transcript.text.length,
      chunksCreated: chunks.length,
      preview: transcript.text.substring(0, 500) + (transcript.text.length > 500 ? '...' : ''),
    });
  } catch (error) {
    console.error(`[Transcribe] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const supabase = await createClient();

  // Get transcript status
  const { data: transcript, error } = await supabase
    .from('session_transcripts')
    .select('id, language, created_at, transcript_text')
    .eq('session_id', sessionId)
    .single();

  if (error || !transcript) {
    return NextResponse.json({
      hasTranscript: false,
      message: 'No transcript available. Use POST to generate one.',
    });
  }

  // Get chunk count
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
    preview: transcript.transcript_text?.substring(0, 500) +
      ((transcript.transcript_text?.length ?? 0) > 500 ? '...' : ''),
  });
}
