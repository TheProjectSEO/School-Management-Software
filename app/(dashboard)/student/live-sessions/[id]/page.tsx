/**
 * Live Session Page
 * Student joins and participates in live virtual classroom
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/service';
import { getCurrentProfile } from '@/lib/dal/auth';
import { LiveSessionClient } from './LiveSessionClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function LiveSessionPage({ params }: PageProps) {
  const { id: sessionId } = await params;
  const supabase = createServiceClient();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== 'student') {
    redirect('/login');
  }

  // Get student profile (flat select — no FK joins per BUG-001)
  const { data: student } = await supabase
    .from('students')
    .select('id, profile_id, section_id')
    .eq('profile_id', profile.id)
    .single();

  if (!student) return notFound();

  // Get student display name from school_profiles
  const { data: studentProfile } = await supabase
    .from('school_profiles')
    .select('full_name')
    .eq('id', student.profile_id)
    .single();

  // Get session details (flat select — no FK joins per BUG-001)
  const { data: session } = await supabase
    .from('live_sessions')
    .select('id, title, description, status, scheduled_start, course_id, recording_enabled, recording_url, daily_room_url, daily_room_name')
    .eq('id', sessionId)
    .single();

  if (!session) return notFound();

  // Fetch course separately (BUG-001 pattern)
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, code')
    .eq('id', session.course_id)
    .single();

  // Verify enrollment — check enrollments first, then section-based fallback (BUG-002)
  const { count: enrollCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', student.id)
    .eq('course_id', session.course_id);

  let hasAccess = !!enrollCount;

  if (!hasAccess && student.section_id) {
    const { count: assignCount } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', student.section_id)
      .eq('course_id', session.course_id);
    hasAccess = !!assignCount;
  }

  if (!hasAccess) {
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
            {course?.name && (
              <p className="text-slate-600 dark:text-slate-400 mb-6">{course.name}</p>
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

  const studentName = studentProfile?.full_name || 'Student';

  return (
    <LiveSessionClient
      sessionId={sessionId}
      gradeLevel="10"
      currentUser={{
        id: student.id,
        name: studentName,
      }}
      sessionData={{
        title: session.title,
        description: session.description || '',
        courseName: course?.name || 'Unknown Course',
        courseCode: course?.code || '',
        recording_enabled: session.recording_enabled,
      }}
    />
  );
}
