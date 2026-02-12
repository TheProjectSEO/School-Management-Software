import { createServiceClient } from "@/lib/supabase/service";
import { getStudentCourseIds, studentHasCourseAccess } from "./student";

export type StudentLiveSession = {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled" | string;
  daily_room_url: string | null;
  course: {
    name: string;
    subject_code: string | null;
    section?: {
      grade_level: string | null;
    } | null;
  } | null;
};

export async function getUpcomingRoomSessions(studentId: string, limit = 3) {
  const supabase = createServiceClient();

  // Get course IDs (enrollments OR section-based assignments)
  const courseIds = await getStudentCourseIds(studentId);
  if (courseIds.length === 0) return [];

  // Fetch sessions with flat course columns (no nested FK joins)
  const { data, error } = await supabase
    .from("live_sessions")
    .select("id, title, scheduled_start, scheduled_end, status, daily_room_url, course_id")
    .in("course_id", courseIds)
    .in("status", ["scheduled", "live"])
    .order("scheduled_start", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching upcoming live sessions:", error);
    return [];
  }

  // Fetch course info separately
  const sessionCourseIds = [...new Set((data || []).map((s) => s.course_id).filter(Boolean))];
  let coursesMap = new Map<string, { name: string; subject_code: string | null }>();
  if (sessionCourseIds.length > 0) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id, name, subject_code")
      .in("id", sessionCourseIds);
    coursesMap = new Map((courses || []).map((c) => [c.id, { name: c.name, subject_code: c.subject_code }]));
  }

  const transformedData = (data || []).map((row: any) => {
    const courseInfo = coursesMap.get(row.course_id);
    return {
      id: row.id,
      title: row.title,
      scheduled_start: row.scheduled_start,
      scheduled_end: row.scheduled_end,
      status: row.status,
      daily_room_url: row.daily_room_url,
      course: courseInfo ? { name: courseInfo.name, subject_code: courseInfo.subject_code, section: null } : null,
    };
  });

  return transformedData as StudentLiveSession[];
}

export async function getLiveSessionsForCourse(studentId: string, courseId: string) {
  const supabase = createServiceClient();

  // Check if student has access (enrolled OR section-based assignment)
  const hasAccess = await studentHasCourseAccess(studentId, courseId);
  if (!hasAccess) {
    return [];
  }

  // Fetch sessions with flat columns (no nested FK joins)
  const { data, error } = await supabase
    .from("live_sessions")
    .select("id, title, scheduled_start, scheduled_end, status, daily_room_url, course_id")
    .eq("course_id", courseId)
    .in("status", ["scheduled", "live", "ended"])
    .order("scheduled_start", { ascending: true });

  if (error) {
    console.error("Error fetching course live sessions:", error);
    return [];
  }

  // Fetch course name separately
  const { data: course } = await supabase
    .from("courses")
    .select("name, subject_code")
    .eq("id", courseId)
    .maybeSingle();

  const transformedData = (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    scheduled_start: row.scheduled_start,
    scheduled_end: row.scheduled_end,
    status: row.status,
    daily_room_url: row.daily_room_url,
    course: course ? { name: course.name, subject_code: course.subject_code, section: null } : null,
  }));

  return transformedData as StudentLiveSession[];
}

export type CourseRecording = {
  id: string;
  title: string;
  actual_start: string;
  recording_url: string;
  recording_duration_seconds: number | null;
  module: {
    id: string;
    title: string;
  } | null;
};

export async function getRecordingsForCourse(
  studentId: string,
  courseId: string,
  limit?: number
): Promise<CourseRecording[]> {
  const supabase = createServiceClient();

  // Check if student has access (enrolled OR section-based assignment)
  const hasAccess = await studentHasCourseAccess(studentId, courseId);
  if (!hasAccess) {
    return [];
  }

  let query = supabase
    .from("live_sessions")
    .select(
      `
      id,
      title,
      actual_start,
      recording_url,
      recording_duration_seconds,
      module:modules(id, title)
    `
    )
    .eq("course_id", courseId)
    .eq("status", "ended")
    .not("recording_url", "is", null)
    .order("actual_start", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching course recordings:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    actual_start: row.actual_start,
    recording_url: row.recording_url,
    recording_duration_seconds: row.recording_duration_seconds,
    module: Array.isArray(row.module) && row.module.length > 0
      ? { id: row.module[0].id, title: row.module[0].title }
      : row.module && !Array.isArray(row.module)
      ? { id: row.module.id, title: row.module.title }
      : null,
  })) as CourseRecording[];
}
