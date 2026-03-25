/**
 * Student Session Notes API
 * GET  — fetch own notes for a session
 * POST — save (upsert) notes + sync to student_notes tab
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStudentAPI } from '@/lib/auth/requireStudentAPI';

async function getProfileId(supabase: ReturnType<typeof import('@/lib/supabase/service').createServiceClient>, studentId: string) {
  const { data } = await supabase
    .from('students')
    .select('profile_id')
    .eq('id', studentId)
    .single();
  return data?.profile_id || null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireStudentAPI();
  if (!auth.success) return auth.response;

  const supabase = createServiceClient();
  const profileId = await getProfileId(supabase, auth.student.studentId);
  if (!profileId) return NextResponse.json({ content: '' });

  const { data } = await supabase
    .from('session_notes')
    .select('content, updated_at')
    .eq('session_id', sessionId)
    .eq('profile_id', profileId)
    .single();

  return NextResponse.json({ content: data?.content || '', updated_at: data?.updated_at });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireStudentAPI();
  if (!auth.success) return auth.response;

  const body = await req.json().catch(() => ({}));
  const content = body?.content ?? '';

  const supabase = createServiceClient();
  const profileId = await getProfileId(supabase, auth.student.studentId);
  if (!profileId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = new Date().toISOString();

  // 1. Save to session_notes (private per-session store)
  await supabase.from('session_notes').upsert(
    { session_id: sessionId, profile_id: profileId, content, updated_at: now },
    { onConflict: 'session_id,profile_id' }
  );

  // 2. Sync to student_notes so it appears in the Notes tab
  // Fetch session title + course_id for the note entry
  const { data: sessionData } = await supabase
    .from('live_sessions')
    .select('title, course_id')
    .eq('id', sessionId)
    .single();

  if (sessionData) {
    const sessionTag = `session:${sessionId}`;

    // Check if a synced note already exists for this session
    const { data: existing } = await supabase
      .from('student_notes')
      .select('id')
      .eq('student_id', auth.student.studentId)
      .contains('tags', [sessionTag])
      .maybeSingle();

    if (existing) {
      // Update content on existing note
      await supabase
        .from('student_notes')
        .update({ content, updated_at: now })
        .eq('id', existing.id);
    } else if (content.trim()) {
      // Create a new note entry (only when there's actual content)
      await supabase.from('student_notes').insert({
        student_id: auth.student.studentId,
        title: `Live Session: ${sessionData.title}`,
        content,
        type: 'note',
        course_id: sessionData.course_id || null,
        tags: [sessionTag, 'live-session'],
        is_favorite: false,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
