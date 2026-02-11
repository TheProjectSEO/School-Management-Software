import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/sections/[id] - Get section detail with assigned courses and students
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

    const { id: sectionId } = await params;
    const supabase = createAdminClient();

    // Get section
    const { data: section, error } = await supabase
      .from("sections")
      .select("id, name, grade_level, capacity, school_id")
      .eq("id", sectionId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Section not found" }, { status: 404 });
      }
      console.error("Error fetching section:", error);
      return NextResponse.json({ error: "Failed to fetch section" }, { status: 500 });
    }

    // Get adviser info
    let adviserName: string | null = null;
    try {
      const { data: adviser } = await supabase
        .from("section_advisers")
        .select("teacher_profile_id")
        .eq("section_id", sectionId)
        .maybeSingle();

      if (adviser?.teacher_profile_id) {
        const { data: teacherProfile } = await supabase
          .from("teacher_profiles")
          .select("profile_id")
          .eq("id", adviser.teacher_profile_id)
          .maybeSingle();

        if (teacherProfile?.profile_id) {
          const { data: schoolProfile } = await supabase
            .from("school_profiles")
            .select("full_name")
            .eq("id", teacherProfile.profile_id)
            .maybeSingle();

          adviserName = schoolProfile?.full_name || null;
        }
      }
    } catch {
      // section_advisers table may not exist
    }

    // Get assigned courses (from teacher_assignments)
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("id, course_id, teacher_profile_id")
      .eq("section_id", sectionId);

    const courseAssignments = assignments || [];

    // Get course names
    const courseIds = [...new Set(courseAssignments.map((a) => a.course_id))];
    let coursesMap: Record<string, { name: string; subject_code: string }> = {};
    if (courseIds.length > 0) {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, subject_code")
        .in("id", courseIds);

      for (const c of courses || []) {
        coursesMap[c.id] = { name: c.name, subject_code: c.subject_code };
      }
    }

    // Get teacher names
    const teacherIds = [...new Set(courseAssignments.map((a) => a.teacher_profile_id))];
    let teachersMap: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: teacherProfiles } = await supabase
        .from("teacher_profiles")
        .select("id, profile_id")
        .in("id", teacherIds);

      const profileIds = (teacherProfiles || []).map((t) => t.profile_id);
      if (profileIds.length > 0) {
        const { data: schoolProfiles } = await supabase
          .from("school_profiles")
          .select("id, full_name")
          .in("id", profileIds);

        const profileNameMap: Record<string, string> = {};
        for (const sp of schoolProfiles || []) {
          profileNameMap[sp.id] = sp.full_name;
        }

        for (const tp of teacherProfiles || []) {
          teachersMap[tp.id] = profileNameMap[tp.profile_id] || "Unknown";
        }
      }
    }

    const assignedCourses = courseAssignments.map((a) => ({
      assignment_id: a.id,
      course_id: a.course_id,
      teacher_profile_id: a.teacher_profile_id,
      course_name: coursesMap[a.course_id]?.name || "Unknown",
      subject_code: coursesMap[a.course_id]?.subject_code || "",
      teacher_name: teachersMap[a.teacher_profile_id] || "Unknown",
    }));

    // Get students in this section
    const { data: students } = await supabase
      .from("students")
      .select("id, profile_id, lrn, grade_level")
      .eq("section_id", sectionId);

    const sectionStudents = students || [];

    // Get student names
    const studentProfileIds = sectionStudents.map((s) => s.profile_id);
    let studentNamesMap: Record<string, string> = {};
    if (studentProfileIds.length > 0) {
      const { data: studentProfiles } = await supabase
        .from("school_profiles")
        .select("id, full_name")
        .in("id", studentProfileIds);

      for (const sp of studentProfiles || []) {
        studentNamesMap[sp.id] = sp.full_name;
      }
    }

    const enrichedStudents = sectionStudents.map((s) => ({
      id: s.id,
      profile_id: s.profile_id,
      lrn: s.lrn || "",
      grade_level: s.grade_level || "",
      full_name: studentNamesMap[s.profile_id] || "Unknown",
    }));

    return NextResponse.json({
      ...section,
      adviser_name: adviserName,
      assigned_courses: assignedCourses,
      students: enrichedStudents,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/sections/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/sections/[id] - Update a section
export async function PUT(
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

    const { id: sectionId } = await params;
    const body = await request.json();
    const { name, grade_level, capacity } = body;

    if (!name || !grade_level) {
      return NextResponse.json(
        { error: "Name and grade level are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if section exists
    const { data: existing, error: fetchError } = await supabase
      .from("sections")
      .select("id")
      .eq("id", sectionId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Check for duplicate name + grade_level (excluding current)
    const { data: duplicate } = await supabase
      .from("sections")
      .select("id")
      .eq("school_id", admin.schoolId)
      .eq("name", name)
      .eq("grade_level", grade_level)
      .neq("id", sectionId)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        { error: "A section with this name and grade level already exists" },
        { status: 409 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("sections")
      .update({
        name,
        grade_level,
        capacity: capacity ? parseInt(capacity) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sectionId)
      .select("id, name, grade_level, capacity, school_id")
      .single();

    if (updateError) {
      console.error("Error updating section:", updateError);
      return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error in PUT /api/admin/sections/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sections/[id] - Delete a section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canDelete = await hasPermission("users:delete");
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: sectionId } = await params;
    const supabase = createAdminClient();

    // Check for students in this section
    const { count: studentCount } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("section_id", sectionId);

    if (studentCount && studentCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete section with enrolled students. Please reassign students first." },
        { status: 400 }
      );
    }

    // Check for teacher assignments
    const { count: assignmentCount } = await supabase
      .from("teacher_assignments")
      .select("*", { count: "exact", head: true })
      .eq("section_id", sectionId);

    if (assignmentCount && assignmentCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete section with active course assignments. Please remove all assignments first." },
        { status: 400 }
      );
    }

    // Check for active enrollments
    const { count: enrollmentCount } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("section_id", sectionId)
      .eq("status", "active");

    if (enrollmentCount && enrollmentCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete section with active enrollments." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("sections")
      .delete()
      .eq("id", sectionId);

    if (deleteError) {
      console.error("Error deleting section:", deleteError);
      return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Section deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/admin/sections/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
