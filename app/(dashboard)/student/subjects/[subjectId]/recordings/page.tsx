/**
 * Recording Playback Page
 * View past live session recordings
 */

import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/service';
import { getCurrentStudent } from '@/lib/dal';
import { studentHasCourseAccess } from '@/lib/dal/student';
import { RecordingsClient } from './RecordingsClient';

interface PageProps {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ session?: string }>;
}

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

export default async function RecordingsPage({ params, searchParams }: PageProps) {
  const [{ subjectId }, { session: initialSessionId }] = await Promise.all([
    params,
    searchParams,
  ]);

  const student = await getCurrentStudent();
  if (!student) {
    redirect('/login');
  }

  const supabase = createServiceClient();

  // Verify access: enrollment OR section-based assignment
  const hasAccess = await studentHasCourseAccess(student.id, subjectId);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Not Enrolled</h1>
          <p className="text-gray-600 dark:text-slate-400">You are not enrolled in this course.</p>
        </div>
      </div>
    );
  }

  // Get course info (separate query, no FK join)
  const { data: course } = await supabase
    .from('courses')
    .select('id, name, subject_code')
    .eq('id', subjectId)
    .single();

  if (!course) {
    return notFound();
  }

  // Get section info from student record (works for both enrollment and section-based access)
  let gradeLevel = '10';
  let sectionInfo: { id: string; name: string; grade_level: string } | undefined;

  // Try enrollment first for section_id
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('section_id')
    .eq('student_id', student.id)
    .eq('course_id', subjectId)
    .maybeSingle();

  // Fall back to student's own section_id
  const sectionId = enrollment?.section_id || student.section_id;

  if (sectionId) {
    const { data: section } = await supabase
      .from('sections')
      .select('id, name, grade_level')
      .eq('id', sectionId)
      .maybeSingle();
    if (section) {
      gradeLevel = section.grade_level || '10';
      sectionInfo = { id: section.id, name: section.name, grade_level: section.grade_level };
    }
  }

  // Get all recorded sessions for this course
  const { data: sessions } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('course_id', course.id)
    .eq('status', 'ended')
    .not('recording_url', 'is', null)
    .order('actual_start', { ascending: false });

  // Get module info for sessions separately
  const moduleIds = [...new Set((sessions || []).map(s => s.module_id).filter(Boolean))];
  let modulesMap = new Map<string, { id: string; title: string }>();
  if (moduleIds.length > 0) {
    const { data: modules } = await supabase
      .from('modules')
      .select('id, title')
      .in('id', moduleIds);
    modulesMap = new Map((modules || []).map(m => [m.id, { id: m.id, title: m.title }]));
  }

  const validSessions = (sessions || [])
    .filter(session => session.recording_url)
    .map(session => ({
      ...session,
      module: session.module_id ? (modulesMap.get(session.module_id) || null) : null,
    }));

  const normalizedCourse = {
    id: course.id,
    name: course.name,
    subject_code: course.subject_code,
    section: sectionInfo,
  };

  return (
    <RecordingsClient
      course={normalizedCourse}
      sessions={validSessions}
      gradeLevel={gradeLevel}
      initialSessionId={initialSessionId}
    />
  );
}
