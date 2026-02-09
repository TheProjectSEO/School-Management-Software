import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

export const dynamic = 'force-dynamic';

/**
 * GET /api/teacher/subjects/[id]
 * Returns a single subject (course) by ID, along with section info and counts,
 * only if the current teacher is assigned to it.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }
  const teacher = authResult.teacher;
  const { id } = await params;

  try {
    const supabase = createServiceClient();

    // Verify the teacher is assigned to this subject
    const { data: assignment, error: assignError } = await supabase
      .from("teacher_assignments")
      .select("id, section_id, course_id")
      .eq("teacher_profile_id", teacher.teacherId)
      .eq("course_id", id)
      .maybeSingle();

    if (assignError) {
      console.error("Error fetching teacher assignment:", assignError);
      return NextResponse.json(
        { error: "Failed to fetch subject" },
        { status: 500 }
      );
    }

    if (!assignment) {
      return NextResponse.json(
        { error: "Subject not found or not assigned to you" },
        { status: 404 }
      );
    }

    // Fetch course, section, module count, and student count in parallel
    const [courseResult, sectionResult, moduleResult, enrollmentResult] = await Promise.all([
      supabase
        .from("courses")
        .select("id, name, subject_code, description")
        .eq("id", id)
        .maybeSingle(),
      assignment.section_id
        ? supabase
            .from("sections")
            .select("id, name, grade_level")
            .eq("id", assignment.section_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("modules")
        .select("id", { count: "exact", head: true })
        .eq("course_id", id),
      supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", id),
    ]);

    const course = courseResult.data;
    const section = sectionResult.data;

    const subject = {
      id: course?.id ?? id,
      name: course?.name ?? "Unknown",
      subject_code: course?.subject_code ?? "",
      description: course?.description ?? null,
      section_name: section?.name ?? "",
      grade_level: section?.grade_level ?? "",
      module_count: moduleResult.count ?? 0,
      student_count: enrollmentResult.count ?? 0,
    };

    return NextResponse.json({ subject });
  } catch (err) {
    console.error("GET /api/teacher/subjects/[id] error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
