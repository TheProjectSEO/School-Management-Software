/**
 * Student Session Notes API
 * GET  — fetch own notes for a session
 * POST — save (upsert) notes
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

  await supabase.from('session_notes').upsert(
    { session_id: sessionId, profile_id: profileId, content, updated_at: new Date().toISOString() },
    { onConflict: 'session_id,profile_id' }
  );

  return NextResponse.json({ ok: true });
}
