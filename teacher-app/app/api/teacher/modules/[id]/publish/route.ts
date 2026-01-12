// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * POST /api/teacher/modules/[id]/publish
 * Publish a module (makes it visible to students)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, userId } = authResult.context;
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Verify access
    const { data: module } = await supabase
      .from("n8n_content_creation.modules")
      .select("subject_id, status, title")
      .eq("id", id)
      .single();

    if (!module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    const { data: sectionSubject } = await supabase
      .from("n8n_content_creation.section_subjects")
      .select("id")
      .eq("subject_id", module.subject_id)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!sectionSubject) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if already published
    const { data: existingPublish } = await supabase
      .from("n8n_content_creation.module_publish")
      .select("id")
      .eq("module_id", id)
      .single();

    if (existingPublish) {
      return NextResponse.json(
        { error: "Module is already published" },
        { status: 400 }
      );
    }

    // Update module status
    const { error: moduleError } = await supabase
      .from("n8n_content_creation.modules")
      .update({ status: "published" })
      .eq("id", id);

    if (moduleError) {
      console.error("Error updating module status:", moduleError);
      return NextResponse.json(
        { error: "Failed to publish module" },
        { status: 500 }
      );
    }

    // Create publish record
    const { data: publishRecord, error: publishError } = await supabase
      .from("n8n_content_creation.module_publish")
      .insert({
        module_id: id,
        published_by: userId,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (publishError) {
      console.error("Error creating publish record:", publishError);
      return NextResponse.json(
        { error: "Failed to create publish record" },
        { status: 500 }
      );
    }

    // TODO: Create notifications for enrolled students
    // This would query section_enrollments and create notification records

    return NextResponse.json({
      success: true,
      publishRecord,
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
