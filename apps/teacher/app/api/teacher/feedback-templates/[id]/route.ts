import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/teacher/feedback-templates/[id]
 * Get a single feedback template
 *
 * PATCH /api/teacher/feedback-templates/[id]
 * Update a feedback template
 *
 * DELETE /api/teacher/feedback-templates/[id]
 * Delete a feedback template
 */

// Extract variables from template content
function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const supabase = await createClient();
    const teacherId = authResult.teacher.id;

    const { data: template, error } = await supabase
      .from("teacher_feedback_templates")
      .select("*")
      .eq("id", id)
      .eq("teacher_profile_id", teacherId)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Feedback template get error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch feedback template" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, content, is_default } = body;

    const supabase = await createClient();
    const teacherId = authResult.teacher.id;

    // Verify ownership
    const { data: existing } = await supabase
      .from("teacher_feedback_templates")
      .select("id")
      .eq("id", id)
      .eq("teacher_profile_id", teacherId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (content !== undefined) {
      updates.content = content;
      updates.variables = extractVariables(content);
    }
    if (is_default !== undefined) updates.is_default = is_default;

    const { data: template, error } = await supabase
      .from("teacher_feedback_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      template,
      message: "Template updated successfully",
    });
  } catch (error) {
    console.error("Feedback template update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update feedback template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const supabase = await createClient();
    const teacherId = authResult.teacher.id;

    const { error } = await supabase
      .from("teacher_feedback_templates")
      .delete()
      .eq("id", id)
      .eq("teacher_profile_id", teacherId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Feedback template delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete feedback template" },
      { status: 500 }
    );
  }
}
