/**
 * Teacher Live Session Classroom Page
 * Shows session info or the live video room (iframe) depending on status
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/service';
import { getCurrentProfile } from '@/lib/dal/auth';
import { TeacherLiveSessionClient } from './TeacherLiveSessionClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function TeacherLiveSessionPage({ params }: PageProps) {
  const { id: sessionId } = await params;
  const supabase = createServiceClient();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== 'teacher') {
    redirect('/login');
  }

  // Fetch session (flat select — no FK joins per BUG-001)
  const { data: session } = await supabase
    .from('live_sessions')
    .select('id, title, description, status, scheduled_start, course_id, recording_enabled, recording_url, daily_room_url')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return notFound();
  }

  // Verify teacher has access to this course
  const { data: teacher } = await supabase
    .from('teacher_profiles')
    .select('id')
    .eq('profile_id', profile.id)
    .single();

  if (!teacher) {
    redirect('/login');
  }

  const { count } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacher.id)
    .eq('course_id', session.course_id);

  if (!count) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have access to this session.</p>
        </div>
      </div>
    );
  }

  // Fetch course name separately
  const { data: course } = await supabase
    .from('courses')
    .select('name')
    .eq('id', session.course_id)
    .single();

  const courseName = course?.name || 'Unknown Course';

  // Non-live sessions: show info card
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
          <Link
            href="/teacher/live-sessions"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#7B1113] mb-6"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Live Sessions
          </Link>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                session.status === 'scheduled'
                  ? 'bg-blue-100 text-blue-700'
                  : session.status === 'ended'
                  ? 'bg-slate-100 text-slate-600'
                  : session.status === 'cancelled'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {session.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{session.title}</h1>
            <p className="text-slate-500 mb-6">{courseName}</p>
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
              <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600">info</span>
                  <p className="text-sm text-blue-800">
                    This session hasn&apos;t started yet. Go back to Live Sessions and click &quot;Start&quot; to begin.
                  </p>
                </div>
              </div>
            )}
            {session.status === 'ended' && session.recording_url && (
              <div className="mt-6">
                <a
                  href={session.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B1113] text-white rounded-lg text-sm font-semibold hover:bg-[#5a0c0e] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  View Recording
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TeacherLiveSessionClient
      sessionId={sessionId}
      sessionData={{
        title: session.title,
        courseName,
        recording_enabled: session.recording_enabled ?? false,
      }}
      currentUser={{
        id: profile.id,
        name: profile.full_name,
      }}
    />
  );
}
