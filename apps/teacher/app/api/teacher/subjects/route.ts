import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

export const dynamic = 'force-dynamic';

/**
 * GET /api/teacher/subjects
 * Returns the list of section-subject assignments the current teacher can teach.
 * Shape matches live-sessions API expectations:
 *   id (section_subject_id), section { id, name }, subject { id, name, code }
 */
export async function GET(_req: NextRequest) {
  // Ensure authenticated teacher
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }
  const teacher = authResult.teacher;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("teacher_assignments")
      .select(
        `
        id,
        section:sections(id, name),
        subject:courses(id, name, subject_code)
      `
      )
      .eq("teacher_profile_id", teacher.teacherId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching teacher subjects:", error);
      return NextResponse.json(
        { error: "Failed to fetch teacher subjects" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subjects: data ?? [] });
  } catch (err) {
    console.error("GET /api/teacher/subjects error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

