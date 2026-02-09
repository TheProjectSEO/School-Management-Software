/**
 * Auto-create module lessons from live session recordings & transcripts.
 *
 * When a teacher ends a live session the recording (and later its transcript)
 * are turned into a draft lesson inside the session's module so students can
 * access them through the normal content flow.
 */

import { createServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// createLessonFromSession
// ---------------------------------------------------------------------------

export async function createLessonFromSession(sessionId: string): Promise<void> {
  const supabase = createServiceClient();

  // 1. Fetch session data
  const { data: session, error: sessionError } = await supabase
    .from('live_sessions')
    .select('id, title, description, course_id, module_id, recording_url, recording_duration_seconds')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    console.error('[SessionToLesson] Session not found:', sessionError);
    return;
  }

  // 2. Check if a lesson already exists for this session
  const { data: existing } = await supabase
    .from('lessons')
    .select('id')
    .eq('source_session_id', sessionId)
    .maybeSingle();

  if (existing) {
    console.log(`[SessionToLesson] Lesson already exists for session ${sessionId}, skipping`);
    return;
  }

  // 3. Determine target module
  let moduleId = session.module_id;

  if (!moduleId) {
    // Look for an existing "Live Session Recordings" module for this course
    const { data: existingModule } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', session.course_id)
      .eq('title', 'Live Session Recordings')
      .maybeSingle();

    if (existingModule) {
      moduleId = existingModule.id;
    } else {
      // Find the highest order value to append at the end
      const { data: lastModule } = await supabase
        .from('modules')
        .select('order')
        .eq('course_id', session.course_id)
        .order('order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (lastModule?.order ?? 0) + 1;

      const { data: newModule, error: moduleError } = await supabase
        .from('modules')
        .insert({
          course_id: session.course_id,
          title: 'Live Session Recordings',
          description: 'Automatically created module for live session recordings.',
          is_published: true,
          order: nextOrder,
        })
        .select('id')
        .single();

      if (moduleError || !newModule) {
        console.error('[SessionToLesson] Failed to create recordings module:', moduleError);
        return;
      }

      moduleId = newModule.id;
      console.log(`[SessionToLesson] Created "Live Session Recordings" module: ${moduleId}`);
    }
  }

  // 4. Determine lesson order within the module
  const { data: lastLesson } = await supabase
    .from('lessons')
    .select('order')
    .eq('module_id', moduleId)
    .order('order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lessonOrder = (lastLesson?.order ?? 0) + 1;

  // 5. Calculate duration in minutes
  const durationMinutes = session.recording_duration_seconds
    ? Math.round(session.recording_duration_seconds / 60)
    : null;

  // 6. Insert the draft lesson
  const { error: insertError } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId,
      title: session.title,
      content_type: 'video',
      video_url: session.recording_url ?? null,
      video_type: session.recording_url ? 'upload' : null,
      duration_minutes: durationMinutes,
      content: session.description || 'This lesson was automatically created from a live session recording.',
      is_published: false,
      source_session_id: sessionId,
      order: lessonOrder,
    });

  if (insertError) {
    console.error('[SessionToLesson] Failed to insert lesson:', insertError);
    return;
  }

  console.log(`[SessionToLesson] Draft lesson created for session ${sessionId} in module ${moduleId}`);
}

// ---------------------------------------------------------------------------
// updateLessonRecording
// ---------------------------------------------------------------------------

export async function updateLessonRecording(
  sessionId: string,
  recordingUrl: string,
  durationSeconds?: number,
): Promise<void> {
  const supabase = createServiceClient();

  const updateData: Record<string, unknown> = {
    video_url: recordingUrl,
    video_type: 'upload',
  };

  if (durationSeconds !== undefined) {
    updateData.duration_minutes = Math.round(durationSeconds / 60);
  }

  const { error } = await supabase
    .from('lessons')
    .update(updateData)
    .eq('source_session_id', sessionId);

  if (error) {
    console.error('[SessionToLesson] Failed to update lesson recording:', error);
    return;
  }

  console.log(`[SessionToLesson] Updated lesson recording for session ${sessionId}`);
}

// ---------------------------------------------------------------------------
// updateLessonTranscript
// ---------------------------------------------------------------------------

export async function updateLessonTranscript(
  sessionId: string,
  transcriptText: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('lessons')
    .update({ content: transcriptText })
    .eq('source_session_id', sessionId);

  if (error) {
    console.error('[SessionToLesson] Failed to update lesson transcript:', error);
    return;
  }

  console.log(`[SessionToLesson] Updated lesson transcript for session ${sessionId}`);
}
