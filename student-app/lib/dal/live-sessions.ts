import { createClient } from "@/lib/supabase/server";

export type StudentLiveSession = {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled" | string;
  course: {
    name: string;
    subject_code: string | null;
    section?: {
      grade_level: string | null;
    } | null;
  } | null;
};

export async function getUpcomingLiveSessions(studentId: string, limit = 3) {
  const supabase = createClient();

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

  return (data || []) as StudentLiveSession[];
}

export async function getLiveSessionsForCourse(studentId: string, courseId: string) {
  const supabase = createClient();

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

  return (data || []) as StudentLiveSession[];
}
