import { createServiceClient } from "@/lib/supabase/service";

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

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("student_id", studentId);

  if (enrollmentError || !enrollments || enrollments.length === 0) {
    return [];
  }

  const courseIds = enrollments.map((enrollment) => enrollment.course_id);

  const { data, error } = await supabase
    .from("live_sessions")
    .select(
      `
      id,
      title,
      scheduled_start,
      scheduled_end,
      status,
      daily_room_url,
      course:courses(
        name,
        subject_code,
        section:sections(grade_level)
      )
    `
    )
    .in("course_id", courseIds)
    .in("status", ["scheduled", "live"])
    .order("scheduled_start", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching upcoming live sessions:", error);
    return [];
  }

  // Transform data to match StudentLiveSession type
  const transformedData = (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    scheduled_start: row.scheduled_start,
    scheduled_end: row.scheduled_end,
    status: row.status,
    daily_room_url: row.daily_room_url,
    course: Array.isArray(row.course) && row.course.length > 0
      ? {
          name: row.course[0].name,
          subject_code: row.course[0].subject_code,
          section: Array.isArray(row.course[0].section) && row.course[0].section.length > 0
            ? {
                grade_level: row.course[0].section[0].grade_level,
              }
            : null,
        }
      : null,
  }));

  return transformedData as StudentLiveSession[];
}

export async function getLiveSessionsForCourse(studentId: string, courseId: string) {
  const supabase = createServiceClient();

  const { count } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("course_id", courseId);

  if (!count) {
    return [];
  }

  const { data, error } = await supabase
    .from("live_sessions")
    .select(
      `
      id,
      title,
      scheduled_start,
      scheduled_end,
      status,
      daily_room_url,
      course:courses(
        name,
        subject_code,
        section:sections(grade_level)
      )
    `
    )
    .eq("course_id", courseId)
    .in("status", ["scheduled", "live", "ended"])
    .order("scheduled_start", { ascending: true });

  if (error) {
    console.error("Error fetching course live sessions:", error);
    return [];
  }

  // Transform data to match StudentLiveSession type
  const transformedData = (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    scheduled_start: row.scheduled_start,
    scheduled_end: row.scheduled_end,
    status: row.status,
    daily_room_url: row.daily_room_url,
    course: Array.isArray(row.course) && row.course.length > 0
      ? {
          name: row.course[0].name,
          subject_code: row.course[0].subject_code,
          section: Array.isArray(row.course[0].section) && row.course[0].section.length > 0
            ? {
                grade_level: row.course[0].section[0].grade_level,
              }
            : null,
        }
      : null,
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

  const { count } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("course_id", courseId);

  if (!count) {
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
