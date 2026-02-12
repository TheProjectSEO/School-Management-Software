import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/enrollments/sync-section
// Syncs enrollment records for students assigned to sections.
// If sectionId is provided, syncs only that section; otherwise syncs all sections.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAPI("enrollments:create");
    if (!auth.success) return auth.response;

    const body = await request.json().catch(() => ({}));
    const { sectionId } = body as { sectionId?: string };

    const supabase = createAdminClient();

    // Get sections to process
    let sectionIds: string[] = [];

    if (sectionId) {
      sectionIds = [sectionId];
    } else {
      // Get all sections that have teacher_assignments (i.e., have courses)
      const { data: sections } = await supabase
        .from("sections")
        .select("id");

      sectionIds = (sections || []).map((s) => s.id);
    }

    if (sectionIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No sections found to sync",
        created: 0,
        skipped: 0,
        sectionsProcessed: 0,
      });
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    let sectionsProcessed = 0;
    const errors: string[] = [];

    for (const secId of sectionIds) {
      // Get courses assigned to this section via teacher_assignments
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("course_id")
        .eq("section_id", secId);

      const courseIds = [...new Set((assignments || []).map((a) => a.course_id))];

      if (courseIds.length === 0) continue;

      // Get section's school_id
      const { data: section } = await supabase
        .from("sections")
        .select("school_id")
        .eq("id", secId)
        .single();

      if (!section?.school_id) continue;

      // Get all students in this section
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("section_id", secId);

      if (!students || students.length === 0) continue;

      sectionsProcessed++;

      // Build all enrollment rows for this section
      const enrollmentRows = students.flatMap((student) =>
        courseIds.map((courseId) => ({
          student_id: student.id,
          course_id: courseId,
          section_id: secId,
          school_id: section.school_id,
          status: "active" as const,
          enrolled_at: new Date().toISOString(),
        }))
      );

      // Count existing enrollments to calculate skipped
      const { count: existingCount } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .in("student_id", students.map((s) => s.id))
        .in("course_id", courseIds);

      // Upsert in batches of 500 to avoid payload limits
      const BATCH_SIZE = 500;
      let sectionCreated = 0;

      for (let i = 0; i < enrollmentRows.length; i += BATCH_SIZE) {
        const batch = enrollmentRows.slice(i, i + BATCH_SIZE);
        const { data: upserted, error: upsertError } = await supabase
          .from("enrollments")
          .upsert(batch, { onConflict: "student_id,course_id" })
          .select("id");

        if (upsertError) {
          errors.push(`Section ${secId} batch error: ${upsertError.message}`);
        } else {
          sectionCreated += upserted?.length || 0;
        }
      }

      const newlyCreated = sectionCreated - (existingCount || 0);
      totalCreated += Math.max(0, newlyCreated);
      totalSkipped += existingCount || 0;
    }

    return NextResponse.json({
      success: errors.length === 0,
      created: totalCreated,
      skipped: totalSkipped,
      sectionsProcessed,
      totalSections: sectionIds.length,
      errors: errors.length > 0 ? errors : undefined,
      summary: `Processed ${sectionsProcessed} sections: ${totalCreated} new enrollments created, ${totalSkipped} already existed`,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/enrollments/sync-section:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
