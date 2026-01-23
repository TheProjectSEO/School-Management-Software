/**
 * Recording Playback Page
 * View past live session recordings
 */

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/dal/auth';
import { RecordingsClient } from './RecordingsClient';

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function RecordingsPage({ params }: PageProps) {
  const { subjectId } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== 'student') {
    redirect('/login');
  }

  // Get student profile
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', profile.id)
    .single();

  if (!student) {
    return notFound();
  }

  // Get course (subjectId is actually courseId in the URL)
  const { data: course } = await supabase
    .from('courses')
    .select(
      `
      id,
      name,
      subject_code,
      section:sections(id, name, grade_level)
    `
    )
    .eq('id', subjectId)
    .single();

  if (!course) {
    return notFound();
  }

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', student.id)
    .eq('course_id', course.id)
    .single();

  if (!enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Not Enrolled</h1>
          <p className="text-gray-600">You are not enrolled in this course.</p>
        </div>
      </div>
    );
  }

  // Get all recorded sessions for this course
  const { data: sessions } = await supabase
    .from('live_sessions')
    .select(
      `
      *,
      module:modules(id, title)
    `
    )
    .eq('course_id', course.id)
    .eq('status', 'ended')
    .not('recording_url', 'is', null)
    .order('actual_start', { ascending: false });

  const gradeLevel = course.section?.grade_level || '10';

  // The recording_url stored in the database is already a public URL from Supabase storage
  // No need to create signed URLs - just pass the sessions directly
  const validSessions = (sessions || []).filter(session => session.recording_url);

  return (
    <RecordingsClient
      course={course}
      sessions={validSessions}
      gradeLevel={gradeLevel}
    />
  );
}
