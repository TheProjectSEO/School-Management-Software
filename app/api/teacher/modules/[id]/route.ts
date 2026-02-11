import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * GET /api/teacher/modules/[id]
 * Get module details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;
  const { id } = await params;

  try {
    const supabase = createServiceClient();

    // Fetch module with flat columns
    const { data: module, error } = await supabase
      .from("modules")
      .select("id, course_id, title, description, order, duration_minutes, is_published, learning_objectives, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error || !module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access to this module's course
    const { count } = await supabase
      .from("teacher_assignments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", module.course_id)
      .eq("teacher_profile_id", teacherId);

    if (!count) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch course info separately
    const { data: course } = await supabase
      .from("courses")
      .select("id, name, subject_code")
      .eq("id", module.course_id)
      .single();

    // Fetch lessons for this module
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title, content_type, order, is_published, duration_minutes, created_at")
      .eq("module_id", id)
      .order("order", { ascending: true });

    return NextResponse.json({
      module: {
        ...module,
        course: course || null,
        lessons: lessons || [],
      },
    });
  } catch (error) {
    console.error("Module GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teacher/modules/[id]
 * Update module
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;
  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // First verify the module exists and get course_id
    const { data: existingModule } = await supabase
      .from("modules")
      .select("course_id")
      .eq("id", id)
      .single();

    if (!existingModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    const { count } = await supabase
      .from("teacher_assignments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", existingModule.course_id)
      .eq("teacher_profile_id", teacherId);

    if (!count) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const {
      title,
      description,
      learningObjectives,
      order,
      durationMinutes,
      is_published,
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (learningObjectives !== undefined) updates.learning_objectives = learningObjectives;
    if (order !== undefined) updates.order = order;
    if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes;
    if (is_published !== undefined) updates.is_published = is_published;

    const { data: module, error } = await supabase
      .from("modules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating module:", error);
      return NextResponse.json(
        { error: "Failed to update module" },
        { status: 500 }
      );
    }

    return NextResponse.json({ module });
  } catch (error) {
    console.error("Module PATCH error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teacher/modules/[id]
 * Delete module
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;
  const { id } = await params;

  try {
    const supabase = createServiceClient();

    // Verify the module exists and get its course
    const { data: existingModule } = await supabase
      .from("modules")
      .select("course_id, is_published")
      .eq("id", id)
      .single();

    if (!existingModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    const { count } = await supabase
      .from("teacher_assignments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", existingModule.course_id)
      .eq("teacher_profile_id", teacherId);

    if (!count) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Don't allow deletion of published modules
    if (existingModule.is_published) {
      return NextResponse.json(
        { error: "Cannot delete published modules. Unpublish first." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("modules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting module:", error);
      return NextResponse.json(
        { error: "Failed to delete module" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Module DELETE error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
