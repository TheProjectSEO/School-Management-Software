/**
 * Student Session Chat API
 * GET  — fetch messages for a session
 * POST — send a message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireStudentAPI } from '@/lib/auth/requireStudentAPI';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireStudentAPI();
  if (!auth.success) return auth.response;

  const supabase = createServiceClient();
  const { data: messages } = await supabase
    .from('session_messages')
    .select('id, profile_id, sender_name, sender_role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(200);

  return NextResponse.json({ messages: messages || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const auth = await requireStudentAPI();
  if (!auth.success) return auth.response;

  const body = await req.json().catch(() => ({}));
  const content = body?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get student's profile_id and display name (flat selects — BUG-001)
  const { data: studentRow } = await supabase
    .from('students')
    .select('profile_id')
    .eq('id', auth.student.studentId)
    .single();

  if (!studentRow?.profile_id) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const { data: profileRow } = await supabase
    .from('school_profiles')
    .select('full_name')
    .eq('id', studentRow.profile_id)
    .single();

  const { data: message, error } = await supabase
    .from('session_messages')
    .insert({
      session_id: sessionId,
      profile_id: studentRow.profile_id,
      sender_name: profileRow?.full_name || 'Student',
      sender_role: 'student',
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('[messages] insert error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  return NextResponse.json({ message }, { status: 201 });
}
