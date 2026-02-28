import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/report-cards
 * List report cards for admin review. Defaults to pending_review status.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminAPI("users:read");
  if (!auth.success) return auth.response;

  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending_review";
  const sectionId = searchParams.get("sectionId");
  const gradingPeriodId = searchParams.get("gradingPeriodId");

  try {
    let query = supabase
      .from("report_cards")
      .select("id, student_id, grading_period_id, school_id, status, generated_at, approved_at, released_at, pdf_url, teacher_remarks_json, student_info_json, gpa_snapshot_json")
      .eq("school_id", auth.admin.schoolId)
      .order("generated_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (gradingPeriodId) {
      query = query.eq("grading_period_id", gradingPeriodId);
    }

    const { data: reportCards, error } = await query;

    if (error) {
      console.error("Error fetching report cards:", error);
      return NextResponse.json({ error: "Failed to fetch report cards" }, { status: 500 });
    }

    if (!reportCards?.length) {
      return NextResponse.json({ reportCards: [] });
    }

    // Filter by section if requested
    let filtered = reportCards;
    if (sectionId) {
      const { data: sectionStudents } = await supabase
        .from("students")
        .select("id")
        .eq("section_id", sectionId);
      const sectionStudentIds = new Set((sectionStudents || []).map((s) => s.id));
      filtered = reportCards.filter((rc) => sectionStudentIds.has(rc.student_id));
    }

    // Enrich with student names from student_info_json (already stored as snapshot)
    const enriched = filtered.map((rc) => {
      const studentInfo = rc.student_info_json as Record<string, unknown> | null;
      const gpa = rc.gpa_snapshot_json as Record<string, unknown> | null;
      return {
        id: rc.id,
        student_id: rc.student_id,
        grading_period_id: rc.grading_period_id,
        status: rc.status,
        generated_at: rc.generated_at,
        approved_at: rc.approved_at,
        released_at: rc.released_at,
        pdf_url: rc.pdf_url,
        has_remarks: Array.isArray(rc.teacher_remarks_json) && rc.teacher_remarks_json.length > 0,
        student_name: (studentInfo?.full_name as string) || "Unknown",
        student_lrn: (studentInfo?.lrn as string) || "",
        grade_level: (studentInfo?.grade_level as string) || "",
        section_name: (studentInfo?.section_name as string) || "",
        term_gpa: (gpa?.term_gpa as number) || 0,
      };
    });

    return NextResponse.json({ reportCards: enriched });
  } catch (error) {
    console.error("Error in GET /api/admin/report-cards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
