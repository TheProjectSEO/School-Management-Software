/**
 * Daily.co Recording Management
 * Downloads recordings from Daily.co and uploads to Supabase storage
 */

import { getDailyClient } from './client';
import { createClient } from '@/lib/supabase/server';

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
    const supabase = createClient();

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

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('session-recordings')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // 5. Get public URL (will be gated by RLS)
    const {
      data: { publicUrl },
    } = supabase.storage.from('session-recordings').getPublicUrl(fileName);

    // 6. Update live_sessions table
    const { error: updateError } = await supabase
      .from('live_sessions')
      .update({
        recording_url: publicUrl,
        recording_size_bytes: videoSize,
        recording_duration_seconds: latestRecording.duration,
      })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`);
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
 * Delete recording from both Daily.co and Supabase storage
 */
export async function deleteRecording(
  sessionId: string,
  recordingId?: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    // Delete from Supabase storage
    const fileName = `${sessionId}/recording.mp4`;
    const { error: storageError } = await supabase.storage
      .from('session-recordings')
      .remove([fileName]);

    if (storageError) {
      console.error('[Recording] Error deleting from storage:', storageError);
    }

    // Delete from Daily.co if recording ID is provided
    if (recordingId) {
      const dailyClient = getDailyClient();
      await dailyClient.deleteRecording(recordingId);
    }

    // Update live_sessions table
    await supabase
      .from('live_sessions')
      .update({
        recording_url: null,
        recording_size_bytes: null,
        recording_duration_seconds: null,
      })
      .eq('id', sessionId);

    return true;
  } catch (error) {
    console.error('[Recording] Error deleting recording:', error);
    return false;
  }
}

/**
 * Get signed URL for recording playback
 * Returns a temporary signed URL that bypasses RLS
 */
export async function getRecordingSignedUrl(
  sessionId: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  try {
    const supabase = createClient();
    const fileName = `${sessionId}/recording.mp4`;

    const { data, error } = await supabase.storage
      .from('session-recordings')
      .createSignedUrl(fileName, expiresIn);

    if (error) {
      console.error('[Recording] Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[Recording] Error getting signed URL:', error);
    return null;
  }
}

/**
 * Schedule background job to process recording after session ends
 * This would typically be called by a cron job or queue system
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
    await processRecordingForSession(sessionId, dailyRoomName);
  }, delaySeconds * 1000);
}
