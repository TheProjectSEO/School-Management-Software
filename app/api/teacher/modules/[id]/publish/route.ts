import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * POST /api/teacher/modules/[id]/publish
 * Publish a module (makes it visible to students)
 */
export async function POST(
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

    // Verify module exists
    const { data: module } = await supabase
      .from("modules")
      .select("course_id, is_published, title")
      .eq("id", id)
      .single();

    if (!module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
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

    if (module.is_published) {
      return NextResponse.json(
        { error: "Module is already published" },
        { status: 400 }
      );
    }

    // Update module to published
    const { error: moduleError } = await supabase
      .from("modules")
      .update({ is_published: true })
      .eq("id", id);

    if (moduleError) {
      console.error("Error publishing module:", moduleError);
      return NextResponse.json(
        { error: "Failed to publish module" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Module published successfully",
    });
  } catch (error) {
    console.error("Module publish error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
