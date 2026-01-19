/**
 * Teacher Live Sessions API
 * POST: Create new session
 * GET: List teacher's sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/dal/auth';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const profile = await getCurrentProfile();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile
    const { data: teacherProfile, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (teacherError || !teacherProfile) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      course_id,
      module_id,
      title,
      description,
      scheduled_start,
      scheduled_end,
      recording_enabled = true,
      max_participants = 50,
    } = body;

    // Validate required fields
    if (!course_id || !title || !scheduled_start) {
      return NextResponse.json(
        { error: 'Missing required fields: course_id, title, scheduled_start' },
        { status: 400 }
      );
    }

    // Verify teacher owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .eq('teacher_profile_id', teacherProfile.id)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found or unauthorized' },
        { status: 404 }
      );
    }

    // Create live session
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .insert({
        course_id,
        module_id,
        teacher_profile_id: teacherProfile.id,
        title,
        description,
        scheduled_start,
        scheduled_end,
        recording_enabled,
        max_participants,
        status: 'scheduled',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teacher/live-sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const profile = await getCurrentProfile();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile
    const { data: teacherProfile, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', profile.id)
      .single();

    if (teacherError || !teacherProfile) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const courseId = searchParams.get('course_id');

    // Build query
    let query = supabase
      .from('live_sessions')
      .select(
        `
        *,
        course:courses(id, name, code),
        module:modules(id, title)
      `
      )
      .eq('teacher_profile_id', teacherProfile.id)
      .order('scheduled_start', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error in GET /api/teacher/live-sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
