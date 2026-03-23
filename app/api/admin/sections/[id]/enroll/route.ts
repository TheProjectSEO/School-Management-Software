import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/sections/[id]/enroll - Bulk enroll students into all courses assigned to this section
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI('settings:update');
    if (!auth.success) return auth.response;

    const { id: sectionId } = await params;
    const body = await request.json();
    const { studentIds } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "studentIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get all course_ids assigned to this section via teacher_assignments
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("course_id")
      .eq("section_id", sectionId);

    const courseIds = [...new Set((assignments || []).map((a) => a.course_id))];

    if (courseIds.length === 0) {
      return NextResponse.json(
        { error: "No courses are assigned to this section. Please assign courses first." },
        { status: 400 }
      );
    }

    // Get the section's school_id
    const { data: section } = await supabase
      .from("sections")
      .select("school_id")
      .eq("id", sectionId)
      .single();

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const studentId of studentIds) {
      // Update student's section_id
      const { error: updateError } = await supabase
        .from("students")
        .update({ section_id: sectionId, updated_at: new Date().toISOString() })
        .eq("id", studentId);

      if (updateError) {
        errors.push(`Failed to assign student ${studentId} to section: ${updateError.message}`);
        continue;
      }

      // Create enrollment for each course
      for (const courseId of courseIds) {
        // Check if enrollment already exists
        const { data: existing } = await supabase
          .from("enrollments")
          .select("id")
          .eq("student_id", studentId)
          .eq("course_id", courseId)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const { error: enrollError } = await supabase
          .from("enrollments")
          .insert({
            student_id: studentId,
            course_id: courseId,
            section_id: sectionId,
            school_id: section.school_id,
            status: "active",
            enrolled_at: new Date().toISOString(),
          });

        if (enrollError) {
          errors.push(`Failed to enroll student ${studentId} in course ${courseId}: ${enrollError.message}`);
        } else {
          created++;
        }
      }
    }

    const totalExpected = studentIds.length * courseIds.length;

    // Auto-sync section group chat after enrollment
    await supabase.rpc("create_or_update_section_group_chat", {
      p_section_id: sectionId,
      p_school_id: section.school_id,
    }).then(null, (err: unknown) => {
      console.error("Error syncing group chat after enrollment:", err);
    });

    return NextResponse.json({
      success: true,
      created,
      skipped,
      totalExpected,
      errors: errors.length > 0 ? errors : undefined,
      summary: `Enrolled ${studentIds.length} students in ${courseIds.length} courses (${created} new enrollments, ${skipped} already existed)`,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/sections/[id]/enroll:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
