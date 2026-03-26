/**
 * Transcription Service
 * Core logic for transcribing a session recording via OpenAI Whisper.
 * Called from the manual transcribe route AND auto-triggered on session end.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { updateLessonTranscript } from '@/lib/services/session-to-lesson';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

  if (current.trim().length > 0) chunks.push(current.trim());
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
      body: JSON.stringify({ model: 'text-embedding-3-small', input: batch }),
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

// ---------------------------------------------------------------------------
// transcribeSessionRecording
// ---------------------------------------------------------------------------

export interface TranscribeResult {
  success: boolean;
  transcriptId?: string;
  language?: string;
  textLength?: number;
  chunksCreated?: number;
  alreadyExists?: boolean;
  error?: string;
}

/**
 * Transcribe a live session recording using OpenAI Whisper.
 * Saves the transcript to session_transcripts, creates searchable chunks,
 * and updates the auto-created lesson's content field.
 *
 * Safe to call fire-and-forget — all errors are caught and logged.
 */
export async function transcribeSessionRecording(sessionId: string): Promise<TranscribeResult> {
  if (!OPENAI_API_KEY) {
    return { success: false, error: 'OPENAI_API_KEY not configured' };
  }

  const supabase = createServiceClient();

  // Get session recording URL
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, title, recording_url, course_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return { success: false, error: 'Session not found' };
  }

  if (!session.recording_url) {
    return { success: false, error: 'No recording available for this session' };
  }

  // Skip if transcript already exists
  const { data: existing } = await supabase
    .from('session_transcripts')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    console.log(`[Transcription] Transcript already exists for session ${sessionId}, skipping`);
    return { success: true, alreadyExists: true, transcriptId: existing.id };
  }

  try {
    console.log(`[Transcription] Starting for session: ${sessionId}`);

    // Resolve storage URL if relative
    let recordingUrl = session.recording_url;
    if (!recordingUrl.startsWith('http')) {
      const { data: urlData } = supabase.storage
        .from('session-recordings')
        .getPublicUrl(recordingUrl);
      recordingUrl = urlData.publicUrl;
    }

    // Download recording
    console.log(`[Transcription] Downloading: ${recordingUrl}`);
    const recordingResponse = await fetch(recordingUrl);
    if (!recordingResponse.ok) {
      throw new Error(`Failed to download recording: ${recordingResponse.status}`);
    }

    const recordingBlob = await recordingResponse.blob();
    console.log(`[Transcription] Size: ${(recordingBlob.size / 1024 / 1024).toFixed(2)} MB`);

    if (recordingBlob.size > 25 * 1024 * 1024) {
      return { success: false, error: 'Recording exceeds 25 MB Whisper limit' };
    }

    // Send to OpenAI Whisper
    console.log(`[Transcription] Sending to Whisper...`);
    const formData = new FormData();
    formData.append('model', 'whisper-1');
    formData.append('file', recordingBlob, 'recording.mp4');
    formData.append('response_format', 'verbose_json');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errorText = await whisperRes.text();
      throw new Error(`OpenAI Whisper failed: ${errorText}`);
    }

    const transcript = (await whisperRes.json()) as {
      text: string;
      language?: string;
      segments?: { start: number; end: number; text: string }[];
    };

    console.log(
      `[Transcription] Done. Language: ${transcript.language}, ${transcript.text.length} chars`
    );

    // Save to session_transcripts
    const { data: saved, error: saveError } = await supabase
      .from('session_transcripts')
      .insert({
        session_id: sessionId,
        provider: 'openai',
        language: transcript.language ?? null,
        transcript_text: transcript.text,
        transcript_json: transcript,
      })
      .select('id')
      .single();

    if (saveError) {
      throw new Error(`Failed to save transcript: ${saveError.message}`);
    }

    // Push transcript text into the auto-created lesson
    await updateLessonTranscript(sessionId, transcript.text);

    // Create chunks + embeddings for semantic search
    const chunks = chunkText(transcript.text);
    if (chunks.length > 0) {
      try {
        const embeddings = await embedChunks(chunks);
        const rows = chunks.map((chunk, i) => ({
          session_id: sessionId,
          chunk_index: i,
          content: chunk,
          embedding: embeddings[i],
          model: 'text-embedding-3-small',
        }));

        await supabase
          .from('session_transcript_chunks')
          .upsert(rows, { onConflict: 'session_id,chunk_index' });

        console.log(`[Transcription] Saved ${rows.length} chunks for session ${sessionId}`);
      } catch (embedErr) {
        // Embeddings failure is non-fatal — transcript is already saved
        console.error('[Transcription] Embedding failed (non-fatal):', embedErr);
      }
    }

    return {
      success: true,
      transcriptId: saved.id,
      language: transcript.language,
      textLength: transcript.text.length,
      chunksCreated: chunks.length,
    };
  } catch (error) {
    console.error(`[Transcription] Error for session ${sessionId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transcription failed',
    };
  }
}
