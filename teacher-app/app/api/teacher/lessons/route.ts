// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * POST /api/teacher/lessons
 * Create a new lesson within a module
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      moduleId,
      title,
      content,
      type,
      order,
      duration,
      videoUrl,
      attachments,
    } = body;

    // Validate required fields
    if (!moduleId || !title?.trim()) {
      return NextResponse.json(
        { error: "Module ID and title are required" },
        { status: 400 }
      );
    }

    // Verify module exists and teacher has access
    const { data: module } = await supabase
      .from("n8n_content_creation.modules")
      .select("subject_id")
      .eq("id", moduleId)
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

    // Create lesson
    const { data: lesson, error } = await supabase
      .from("n8n_content_creation.lessons")
      .insert({
        module_id: moduleId,
        title: title.trim(),
        content: content?.trim() || null,
        type: type || "text",
        order: order || 0,
        duration: duration || null,
        video_url: videoUrl?.trim() || null,
        attachments: attachments || [],
      })
      .select(
        `
        *,
        module:n8n_content_creation.modules(
          id,
          title
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating lesson:", error);
      return NextResponse.json(
        { error: "Failed to create lesson" },
        { status: 500 }
      );
    }

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error("Lessons POST error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
