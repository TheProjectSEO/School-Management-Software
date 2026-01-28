import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/users/teachers/[id]/advisory - Get teacher's advisory sections
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("users:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: teacherId } = await params;
    const supabase = createAdminClient();

    // Check if preview is requested
    const { searchParams } = new URL(request.url);
    const previewSectionId = searchParams.get("preview");

    if (previewSectionId) {
      // Return auto-enrollment preview
      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("section_id", previewSectionId)
        .eq("status", "active");

      // Get courses taught by teacher in this section
      const { count: courseCount } = await supabase
        .from("teacher_assignments")
        .select("*", { count: "exact", head: true })
        .eq("teacher_profile_id", teacherId)
        .eq("section_id", previewSectionId);

      return NextResponse.json({
        studentCount: studentCount || 0,
        courseCount: courseCount || 0,
      });
    }

    const { data, error } = await supabase
      .from("section_advisers")
      .select(`
        id,
        teacher_profile_id,
        section_id,
        sections (id, name, grade_level)
      `)
      .eq("teacher_profile_id", teacherId);

    if (error) {
      // If table doesn't exist or any error, return empty array gracefully
      console.warn("Error fetching advisories (table may not exist):", error.message || error);
      return NextResponse.json([]);
    }

    // Get student counts for each section
    const advisories = await Promise.all(
      (data || []).map(async (item: any) => {
        const { count } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("section_id", item.section_id);

        const section = item.sections as unknown as { id: string; name: string; grade_level: string } | null;
        return {
          id: item.id,
          teacher_profile_id: item.teacher_profile_id,
          section_id: item.section_id,
          section: section ? {
            ...section,
            student_count: count || 0,
          } : undefined,
        };
      })
    );

    return NextResponse.json(advisories);
  } catch (error) {
    // Return empty array gracefully on any error
    console.error("Error in GET /api/admin/users/teachers/[id]/advisory:", error);
    return NextResponse.json([]);
  }
}

// POST /api/admin/users/teachers/[id]/advisory - Assign teacher as section adviser
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: teacherId } = await params;
    const body = await request.json();
    const { sectionId, autoEnrollStudents = false } = body;

    if (!sectionId) {
      return NextResponse.json(
        { error: "sectionId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if section already has an adviser
    const { data: existingAdviser, error: checkError } = await supabase
      .from("section_advisers")
      .select("id, teacher_profile_id")
      .eq("section_id", sectionId)
      .maybeSingle();

    // If table doesn't exist, return error
    if (checkError && (checkError.code === "42P01" || checkError.message?.includes("does not exist"))) {
      return NextResponse.json(
        { error: "Advisory feature not available. Database table needs to be created." },
        { status: 400 }
      );
    }

    if (existingAdviser) {
      return NextResponse.json(
        { error: "This section already has an adviser" },
        { status: 400 }
      );
    }

    // Create adviser assignment
    const { data: adviser, error: adviserError } = await supabase
      .from("section_advisers")
      .insert({
        teacher_profile_id: teacherId,
        section_id: sectionId,
        school_id: admin.schoolId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (adviserError) {
      console.error("Error creating adviser:", adviserError);
      return NextResponse.json({ error: adviserError.message }, { status: 400 });
    }

    let enrolledCount = 0;

    // Auto-enroll students if requested
    if (autoEnrollStudents) {
      // Get all students in the section
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("section_id", sectionId)
        .eq("status", "active");

      // Get all courses the teacher teaches in this section
      const { data: teacherCourses } = await supabase
        .from("teacher_assignments")
        .select("course_id")
        .eq("teacher_profile_id", teacherId)
        .eq("section_id", sectionId);

      if (students && students.length > 0 && teacherCourses && teacherCourses.length > 0) {
        // Create enrollment records for each student-course pair
        const enrollments = students.flatMap((student) =>
          teacherCourses.map((course) => ({
            student_id: student.id,
            course_id: course.course_id,
            school_id: admin.schoolId,
            section_id: sectionId,
            status: "active",
            enrolled_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
        );

        // Upsert to avoid duplicates
        const { data: enrolledData, error: enrollError } = await supabase
          .from("enrollments")
          .upsert(enrollments, {
            onConflict: "student_id,course_id",
            ignoreDuplicates: true,
          })
          .select("id");

        if (!enrollError && enrolledData) {
          enrolledCount = enrolledData.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      id: adviser.id,
      enrolledCount,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers/[id]/advisory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/teachers/[id]/advisory - Remove teacher as section adviser
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const adviserId = searchParams.get("adviserId");

    if (!adviserId) {
      return NextResponse.json(
        { error: "adviserId query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("section_advisers")
      .delete()
      .eq("id", adviserId);

    if (error) {
      console.error("Error deleting adviser:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users/teachers/[id]/advisory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
