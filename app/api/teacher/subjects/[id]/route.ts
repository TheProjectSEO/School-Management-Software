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
      .select(`
        id,
        section:sections(id, name, grade_level),
        subject:courses(id, name, subject_code, description, cover_image_url)
      `)
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

    // Get module count
    const { count: moduleCount } = await supabase
      .from("modules")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id);

    // Get student count (enrolled students)
    const { count: studentCount } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id);

    const section = assignment.section as unknown as Record<string, unknown> | null;
    const course = assignment.subject as unknown as Record<string, unknown> | null;

    const subject = {
      id: course?.id ?? id,
      name: course?.name ?? "Unknown",
      subject_code: course?.subject_code ?? "",
      description: course?.description ?? null,
      cover_image_url: course?.cover_image_url ?? null,
      section_name: (section?.name as string) ?? "",
      grade_level: (section?.grade_level as string) ?? "",
      module_count: moduleCount ?? 0,
      student_count: studentCount ?? 0,
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
