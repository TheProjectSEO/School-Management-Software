/**
 * Daily.co Recording Management for Teacher App
 * Downloads recordings from Daily.co and uploads to Supabase storage
 */

import { getDailyClient } from './client';
import { createClient, createN8nSchemaClient } from '@/lib/supabase/server';

interface RecordingProcessResult {
  success: boolean;
  storageUrl?: string;
  size?: number;
  duration?: number;
  error?: string;
}

/**
 * Process recording for a live session
 * Downloads from Daily.co and uploads to Supabase storage
 */
export async function processRecordingForSession(
  sessionId: string,
  dailyRoomName: string
): Promise<RecordingProcessResult> {
  try {
    const dailyClient = getDailyClient();
    const supabase = await createClient();

    // 1. Get recordings from Daily.co
    console.log(`[Recording] Fetching recordings for room: ${dailyRoomName}`);
    const recordings = await dailyClient.getRecordings(dailyRoomName);

    if (!recordings || recordings.length === 0) {
      return {
        success: false,
        error: 'No recordings found for this room',
      };
    }

    // Get the most recent recording
    const latestRecording = recordings.sort(
      (a, b) => b.start_ts - a.start_ts
    )[0];

    if (latestRecording.status !== 'finished') {
      return {
        success: false,
        error: `Recording not ready yet. Status: ${latestRecording.status}`,
      };
    }

    // 2. Get download URL from Daily.co
    console.log(`[Recording] Getting download URL for recording: ${latestRecording.id}`);
    const downloadUrl = await dailyClient.getRecordingDownloadUrl(
      latestRecording.id
    );

    if (!downloadUrl) {
      return {
        success: false,
        error: 'No download URL available for recording',
      };
    }

    // 3. Download the video file
    console.log(`[Recording] Downloading recording from: ${downloadUrl}`);
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download recording: ${response.statusText}`);
    }

    const videoBlob = await response.blob();
    const videoBuffer = await videoBlob.arrayBuffer();
    const videoSize = videoBuffer.byteLength;

    // 4. Upload to Supabase storage
    const fileName = `${sessionId}/recording.mp4`;
    console.log(`[Recording] Uploading to Supabase: ${fileName}`);

    const { error: uploadError } = await supabase.storage
      .from('session-recordings')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // 5. Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('session-recordings').getPublicUrl(fileName);

    // 6. Update both live_sessions (public) and teacher_live_sessions (n8n) tables
    const { error: studentUpdateError } = await supabase
      .from('live_sessions')
      .update({
        recording_url: publicUrl,
        recording_size_bytes: videoSize,
        recording_duration_seconds: latestRecording.duration,
      })
      .eq('id', sessionId);

    if (studentUpdateError) {
      console.error('[Recording] Error updating live_sessions:', studentUpdateError);
    }

    // Update n8n_content_creation.teacher_live_sessions (sync)
    const n8nSupabase = await createN8nSchemaClient();
    const { error: teacherUpdateError } = await n8nSupabase
      .from('teacher_live_sessions')
      .update({
        recording_url: publicUrl,
      })
      .eq('id', sessionId);

    if (teacherUpdateError) {
      console.error('[Recording] Error updating teacher_live_sessions:', teacherUpdateError);
    }

    console.log(`[Recording] Successfully processed recording for session ${sessionId}`);

    return {
      success: true,
      storageUrl: publicUrl,
      size: videoSize,
      duration: latestRecording.duration,
    };
  } catch (error) {
    console.error('[Recording] Error processing recording:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Schedule background job to process recording after session ends
 * Waits for recording to be ready before processing
 */
export async function scheduleRecordingProcessing(
  sessionId: string,
  dailyRoomName: string,
  delaySeconds: number = 60 // Wait 1 minute for recording to be ready
): Promise<void> {
  // In production, this would use a job queue like Bull, Agenda, or Supabase Edge Functions
  // For now, we'll use a simple setTimeout
  setTimeout(async () => {
    console.log(`[Recording] Processing scheduled recording for session ${sessionId}`);
    const result = await processRecordingForSession(sessionId, dailyRoomName);
    if (!result.success) {
      console.error(`[Recording] Failed to process recording: ${result.error}`);
      // Retry once after another minute if recording isn't ready yet
      if (result.error?.includes('not ready')) {
        console.log('[Recording] Retrying in 60 seconds...');
        setTimeout(async () => {
          await processRecordingForSession(sessionId, dailyRoomName);
        }, 60000);
      }
    }
  }, delaySeconds * 1000);
}
