import { NextRequest, NextResponse } from "next/server";
import { getTeacherProfile } from "@/lib/dal/teacher";
import { getReportCard } from "@/lib/dal/report-cards";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/teacher/report-cards/[id]
 *
 * Fetch a specific report card by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teacherProfile = await getTeacherProfile();

    if (!teacherProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportCard = await getReportCard(id);

    if (!reportCard) {
      return NextResponse.json(
        { error: "Report card not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access: they must teach the student's section
    const supabase = createServiceClient();
    const { data: rawRC } = await supabase
      .from("report_cards")
      .select("student_id")
      .eq("id", id)
      .single();

    if (rawRC?.student_id) {
      const { data: student } = await supabase
        .from("students")
        .select("section_id")
        .eq("id", rawRC.student_id)
        .single();

      if (student?.section_id) {
        const { count } = await supabase
          .from("teacher_assignments")
          .select("*", { count: "exact", head: true })
          .eq("teacher_profile_id", teacherProfile.id)
          .eq("section_id", student.section_id);

        if (!count) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ reportCard });
  } catch (error) {
    console.error("Error fetching report card:", error);
    return NextResponse.json(
      { error: "Failed to fetch report card" },
      { status: 500 }
    );
  }
}
