import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
