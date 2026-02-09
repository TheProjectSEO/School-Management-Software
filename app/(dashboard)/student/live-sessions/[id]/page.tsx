/**
 * Live Session Page
 * Student joins and participates in live virtual classroom
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getCurrentProfile } from '@/lib/dal/auth';
import { LiveSessionClient } from './LiveSessionClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LiveSessionPage({ params }: PageProps) {
  const { id: sessionId } = await params;
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

  // Get session details - use service client to bypass RLS
  const serviceClient = createServiceClient();
  const { data: session } = await serviceClient
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
    .eq('id', sessionId)
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

  // For non-live sessions, show session details instead of the classroom
  if (session.status !== 'live') {
    const courseName = Array.isArray(session.course) ? session.course[0]?.name : session.course?.name;
    const scheduledDate = new Date(session.scheduled_start).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    const scheduledTime = new Date(session.scheduled_start).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    });

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/student/live-sessions" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-6">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Live Sessions
          </Link>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                session.status === 'scheduled'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : session.status === 'ended'
                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  : session.status === 'cancelled'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {session.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {session.title}
            </h1>
            {courseName && (
              <p className="text-slate-600 dark:text-slate-400 mb-6">{courseName}</p>
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-[20px] text-slate-400">calendar_today</span>
                <span className="text-sm">{scheduledDate}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-[20px] text-slate-400">schedule</span>
                <span className="text-sm">{scheduledTime}</span>
              </div>
              {session.description && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Description</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{session.description}</p>
                </div>
              )}
            </div>
            {session.status === 'scheduled' && (
              <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This session hasn&apos;t started yet. You&apos;ll be able to join once the teacher starts the session.
                  </p>
                </div>
              </div>
            )}
            {session.status === 'ended' && session.recording_url && (
              <div className="mt-6">
                <a
                  href={`/student/subjects/${session.course_id}/recordings?session=${session.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-[#5a0c0e] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  Watch Recording
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const gradeLevel = session.course?.section?.grade_level || '10';
  const studentName = `${student.first_name} ${student.last_name}`;

  return (
    <LiveSessionClient
      sessionId={sessionId}
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
