// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * GET /api/teacher/modules/[id]
 * Get module details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;
  const { id } = await params;

  try {
    const supabase = await createClient();

    const { data: module, error } = await supabase
      .from("n8n_content_creation.modules")
      .select(
        `
        *,
        subject:n8n_content_creation.subjects(
          id,
          name,
          code
        ),
        publish_info:n8n_content_creation.module_publish(
          id,
          published_at,
          published_by
        ),
        assets:n8n_content_creation.content_assets(
          id,
          asset_type,
          storage_path,
          meta_json,
          created_at
        ),
        transcript:n8n_content_creation.transcripts(
          id,
          text,
          timestamps_json,
          version,
          published_at
        ),
        notes:n8n_content_creation.teacher_notes(
          id,
          rich_text,
          version,
          published_at
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching module:", error);
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access to this module's subject
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

    return NextResponse.json({ module });
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
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;
  const { id } = await params;

  try {
    const supabase = await createClient();
    const body = await request.json();

    // First verify access
    const { data: existingModule } = await supabase
      .from("n8n_content_creation.modules")
      .select("subject_id")
      .eq("id", id)
      .single();

    if (!existingModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    const { data: sectionSubject } = await supabase
      .from("n8n_content_creation.section_subjects")
      .select("id")
      .eq("subject_id", existingModule.subject_id)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!sectionSubject) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const {
      title,
      description,
      objectives,
      order,
      estimatedDuration,
      status,
    } = body;

    // Build update object
    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined)
      updates.description = description?.trim() || null;
    if (objectives !== undefined) updates.objectives = objectives;
    if (order !== undefined) updates.order = order;
    if (estimatedDuration !== undefined)
      updates.estimated_duration = estimatedDuration;
    if (status !== undefined) updates.status = status;

    // Update module
    const { data: module, error } = await supabase
      .from("n8n_content_creation.modules")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        subject:n8n_content_creation.subjects(
          id,
          name,
          code
        ),
        publish_info:n8n_content_creation.module_publish(
          id,
          published_at,
          published_by
        )
      `
      )
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
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Verify access
    const { data: existingModule } = await supabase
      .from("n8n_content_creation.modules")
      .select("subject_id, status")
      .eq("id", id)
      .single();

    if (!existingModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    const { data: sectionSubject } = await supabase
      .from("n8n_content_creation.section_subjects")
      .select("id")
      .eq("subject_id", existingModule.subject_id)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!sectionSubject) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Don't allow deletion of published modules
    if (existingModule.status === "published") {
      return NextResponse.json(
        { error: "Cannot delete published modules" },
        { status: 400 }
      );
    }

    // Delete module
    const { error } = await supabase
      .from("n8n_content_creation.modules")
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
