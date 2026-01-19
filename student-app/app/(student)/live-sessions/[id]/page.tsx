/**
 * Live Session Page
 * Student joins and participates in live virtual classroom
 */

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/dal/auth';
import { LiveSessionClient } from './LiveSessionClient';

interface PageProps {
  params: { id: string };
}

export default async function LiveSessionPage({ params }: PageProps) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== 'student') {
    redirect('/login');
  }

  // Get student profile
  const { data: student } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .eq('profile_id', profile.id)
    .single();

  if (!student) {
    return notFound();
  }

  // Get session details
  const { data: session } = await supabase
    .from('live_sessions')
    .select(
      `
      *,
      course:courses(
        id,
        name,
        code,
        section:sections(id, name, grade_level)
      )
    `
    )
    .eq('id', params.id)
    .single();

  if (!session) {
    return notFound();
  }

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', student.id)
    .eq('course_id', session.course_id)
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

  // Check session status
  if (session.status !== 'live') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Session Not Available
          </h1>
          <p className="text-gray-600">
            This session is currently <span className="font-semibold">{session.status}</span>.
          </p>
          {session.status === 'scheduled' && (
            <p className="text-sm text-gray-500 mt-2">
              Scheduled for: {new Date(session.scheduled_start).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  const gradeLevel = session.course?.section?.grade_level || '10';
  const studentName = `${student.first_name} ${student.last_name}`;

  return (
    <LiveSessionClient
      sessionId={params.id}
      gradeLevel={gradeLevel}
      currentUser={{
        id: student.id,
        name: studentName,
      }}
      sessionData={{
        title: session.title,
        description: session.description || '',
        courseName: session.course?.name || 'Unknown Course',
        courseCode: session.course?.code || '',
        recording_enabled: session.recording_enabled,
      }}
    />
  );
}
