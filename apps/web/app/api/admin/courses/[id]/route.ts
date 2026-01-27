import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/courses/[id] - Get a single course by ID
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

    const { id: courseId } = await params;
    const supabase = createAdminClient();

    const { data: course, error } = await supabase
      .from("courses")
      .select("id, name, subject_code, description, credits, school_id")
      .eq("id", courseId)
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
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canWrite = await hasPermission("users:update");
    if (!canWrite) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: courseId } = await params;
    const body = await request.json();
    const { name, subject_code, description, credits } = body;

    // Validate required fields
    if (!name || !subject_code) {
      return NextResponse.json(
        { error: "Name and subject code are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if course exists
    const { data: existingCourse, error: fetchError } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single();

    if (fetchError || !existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check for duplicate subject_code (excluding current course)
    const { data: duplicateCourse } = await supabase
      .from("courses")
      .select("id")
      .eq("subject_code", subject_code)
      .neq("id", courseId)
      .single();

    if (duplicateCourse) {
      return NextResponse.json(
        { error: "A course with this subject code already exists" },
        { status: 409 }
      );
    }

    // Update the course
    const { data: updatedCourse, error: updateError } = await supabase
      .from("courses")
      .update({
        name,
        subject_code,
        description: description || null,
        credits: credits ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
      .select("id, name, subject_code, description, credits, school_id")
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
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canDelete = await hasPermission("users:delete");
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: courseId } = await params;
    const supabase = createAdminClient();

    // Check if course has active enrollments
    const { count: enrollmentCount } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("status", "active");

    if (enrollmentCount && enrollmentCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete course with active enrollments. Please drop all enrollments first." },
        { status: 400 }
      );
    }

    // Check if course has sections
    const { count: sectionCount } = await supabase
      .from("sections")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId);

    if (sectionCount && sectionCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete course with sections. Please delete all sections first." },
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
