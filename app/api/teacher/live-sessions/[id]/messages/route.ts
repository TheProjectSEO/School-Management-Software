/**
 * Teacher Session Chat API
 * GET  — fetch messages for a session
 * POST — send a message as teacher
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
  const auth = await requireTeacherAPI();
  if (!auth.success) return auth.response;

  const body = await req.json().catch(() => ({}));
  const content = body?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get teacher's profile_id (flat select — BUG-001)
  const { data: teacherRow } = await supabase
    .from('teacher_profiles')
    .select('profile_id')
    .eq('id', auth.teacher.teacherId)
    .single();

  if (!teacherRow?.profile_id) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
  }

  const { data: message, error } = await supabase
    .from('session_messages')
    .insert({
      session_id: sessionId,
      profile_id: teacherRow.profile_id,
      sender_name: auth.teacher.fullName || 'Teacher',
      sender_role: 'teacher',
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
