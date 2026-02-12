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

    // Create question
    const { data: newQuestion, error: questionError } = await supabase
      .from('session_questions')
      .insert({
        session_id: sessionId,
        student_id: student.id,
        question: question.trim(),
      })
      .select(
        `
        *,
        student:students(id, profile:school_profiles(full_name))
      `
      )
      .single();

    if (questionError) {
      console.error('Error creating question:', questionError);
      return NextResponse.json(
        { error: 'Failed to create question' },
        { status: 500 }
      );
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

    return NextResponse.json(newQuestion, { status: 201 });
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

    // Get questions with student info
    const { data: questions, error: questionsError } = await supabase
      .from('session_questions')
      .select(
        `
        *,
        student:students(id, profile:school_profiles(full_name)),
        answered_by_teacher:teacher_profiles(
          id,
          profile:school_profiles(full_name)
        )
      `
      )
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

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error in GET /api/live-sessions/[id]/questions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
