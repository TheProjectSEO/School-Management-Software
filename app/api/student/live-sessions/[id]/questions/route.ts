/**
 * Live Session Questions API
 * POST: Ask question
 * GET: List questions
 * PUT: Upvote question
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getCurrentProfile } from '@/lib/dal/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const profile = await getCurrentProfile();

    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sessionId = id;
    const body = await request.json();
    const { question } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question cannot be empty' },
        { status: 400 }
      );
    }

    // Get student profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // Verify session access - use service client to bypass RLS
    const serviceClient = createServiceClient();
    const { data: session, error: sessionError } = await serviceClient
      .from('live_sessions')
      .select('id, course_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'live') {
      return NextResponse.json(
        { error: 'Session is not live' },
        { status: 400 }
      );
    }

    // Verify student has access (enrolled OR section-based assignment)
    const { count: enrollCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('course_id', session.course_id);

    if (!enrollCount) {
      const { data: studentData } = await supabase
        .from('students')
        .select('section_id')
        .eq('id', student.id)
        .single();

      const { count: assignCount } = studentData?.section_id
        ? await supabase
            .from('teacher_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('section_id', studentData.section_id)
            .eq('course_id', session.course_id)
        : { count: 0 };

      if (!assignCount) {
        return NextResponse.json(
          { error: 'Not enrolled in this course' },
          { status: 403 }
        );
      }
    }

    // Create question (flat select, no FK joins — BUG-001)
    const { data: newQuestion, error: questionError } = await supabase
      .from('session_questions')
      .insert({
        session_id: sessionId,
        student_id: student.id,
        question: question.trim(),
      })
      .select('*')
      .single();

    if (questionError) {
      console.error('Error creating question:', questionError);
      return NextResponse.json(
        { error: 'Failed to create question' },
        { status: 500 }
      );
    }

    // Fetch student display name separately (avoid FK join — BUG-001)
    let student_name: string | null = null;
    const { data: studentRow } = await supabase
      .from('students')
      .select('profile_id')
      .eq('id', student.id)
      .single();

    if (studentRow?.profile_id) {
      const { data: profileRow } = await supabase
        .from('school_profiles')
        .select('full_name')
        .eq('id', studentRow.profile_id)
        .single();
      student_name = profileRow?.full_name ?? null;
    }

    // Update participant stats - increment questions_asked using RPC
    try {
      await supabase.rpc('increment_questions_asked', {
        p_session_id: sessionId,
        p_student_id: student.id,
      });
    } catch {
      // Fallback: just log if RPC doesn't exist
      console.log('Note: increment_questions_asked RPC not available');
    }

    return NextResponse.json({ ...newQuestion, student_name, answered_by_name: null }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/live-sessions/[id]/questions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    const profile = await getCurrentProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sessionId = id;

    // Get questions (flat select, no FK joins — BUG-001)
    const { data: questions, error: questionsError } = await supabase
      .from('session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: true });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    // Resolve student names (avoid FK join — BUG-001)
    const studentIds = [...new Set((questions ?? []).map((q) => q.student_id).filter(Boolean))];
    const studentNameMap = new Map<string, string>();

    if (studentIds.length > 0) {
      const { data: studentRows } = await supabase
        .from('students')
        .select('id, profile_id')
        .in('id', studentIds);

      const studentProfileIds = (studentRows ?? []).map((s) => s.profile_id).filter(Boolean);

      if (studentProfileIds.length > 0) {
        const { data: studentProfiles } = await supabase
          .from('school_profiles')
          .select('id, full_name')
          .in('id', studentProfileIds);

        const profileMap = new Map((studentProfiles ?? []).map((p) => [p.id, p.full_name]));
        for (const s of studentRows ?? []) {
          if (s.profile_id) {
            studentNameMap.set(s.id, profileMap.get(s.profile_id) ?? null);
          }
        }
      }
    }

    // Resolve answered_by teacher names (avoid FK join — BUG-001)
    const teacherIds = [...new Set((questions ?? []).map((q) => q.answered_by).filter(Boolean))];
    const teacherNameMap = new Map<string, string>();

    if (teacherIds.length > 0) {
      const { data: teacherRows } = await supabase
        .from('teacher_profiles')
        .select('id, profile_id')
        .in('id', teacherIds);

      const teacherProfileIds = (teacherRows ?? []).map((t) => t.profile_id).filter(Boolean);

      if (teacherProfileIds.length > 0) {
        const { data: teacherProfiles } = await supabase
          .from('school_profiles')
          .select('id, full_name')
          .in('id', teacherProfileIds);

        const profileMap = new Map((teacherProfiles ?? []).map((p) => [p.id, p.full_name]));
        for (const t of teacherRows ?? []) {
          if (t.profile_id) {
            teacherNameMap.set(t.id, profileMap.get(t.profile_id) ?? null);
          }
        }
      }
    }

    const enriched = (questions ?? []).map((q) => ({
      ...q,
      student_name: studentNameMap.get(q.student_id) ?? null,
      answered_by_name: q.answered_by ? (teacherNameMap.get(q.answered_by) ?? null) : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error in GET /api/live-sessions/[id]/questions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
