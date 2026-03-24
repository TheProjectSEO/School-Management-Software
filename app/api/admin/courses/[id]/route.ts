import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/courses/[id] - Get a single course by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI("users:read");
    if (!auth.success) return auth.response;

    const { id: courseId } = await params;
    const supabase = createAdminClient();

    const { data: course, error } = await supabase
      .from("courses")
      .select("id, name, subject_code, description, credits, grade_level, is_active, school_id")
      .eq("id", courseId)
      .eq("school_id", auth.admin.schoolId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }
      console.error("Error fetching course:", error);
      return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error("Error in GET /api/admin/courses/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/courses/[id] - Update a course
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI("users:update");
    if (!auth.success) return auth.response;

    const { id: courseId } = await params;
    const body = await request.json();
    const { name, subject_code, description, credits, grade_level } = body;

    // Validate required fields
    if (!name || !subject_code) {
      return NextResponse.json(
        { error: "Name and subject code are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if course exists and belongs to this school
    const { data: existingCourse, error: fetchError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("school_id", auth.admin.schoolId)
      .single();

    if (fetchError || !existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check for duplicate subject_code OR name (excluding current course, same school)
    const { data: duplicateCourse } = await supabase
      .from("courses")
      .select("id, name, subject_code")
      .eq("school_id", auth.admin.schoolId)
      .neq("id", courseId)
      .or(`subject_code.eq.${subject_code},name.eq.${name}`)
      .maybeSingle();

    if (duplicateCourse) {
      const conflict = duplicateCourse.subject_code === subject_code
        ? "A subject with this subject code already exists"
        : "A subject with this name already exists";
      return NextResponse.json({ error: conflict }, { status: 409 });
    }

    // Update the course
    const { data: updatedCourse, error: updateError } = await supabase
      .from("courses")
      .update({
        name,
        subject_code,
        description: description || null,
        credits: credits ?? null,
        grade_level: grade_level || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
      .select("id, name, subject_code, description, credits, grade_level, is_active, school_id")
      .single();

    if (updateError) {
      console.error("Error updating course:", updateError);
      return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
    }

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error("Error in PUT /api/admin/courses/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/courses/[id] - Delete a course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAPI("users:delete");
    if (!auth.success) return auth.response;

    const { id: courseId } = await params;
    const supabase = createAdminClient();

    // Verify course belongs to this school
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("school_id", auth.admin.schoolId)
      .maybeSingle();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if course has active enrollments
    const { count: enrollmentCount } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId);

    if (enrollmentCount && enrollmentCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete course with enrollments. Please remove all enrollments first." },
        { status: 400 }
      );
    }

    // Delete the course
    const { error: deleteError } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (deleteError) {
      console.error("Error deleting course:", deleteError);
      return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/admin/courses/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
