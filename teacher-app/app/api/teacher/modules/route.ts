// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * GET /api/teacher/modules
 * List all modules for teacher's subjects
 */
export async function GET(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");
  const status = searchParams.get("status");

  try {
    const supabase = await createClient();

    // Build query
    let query = supabase
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
        )
      `
      )
      .order("order", { ascending: true });

    // Filter by subject if provided
    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    } else {
      // Get all subjects teacher teaches
      const { data: teacherSubjects } = await supabase
        .from("n8n_content_creation.section_subjects")
        .select("subject_id")
        .eq("teacher_id", teacherId);

      if (teacherSubjects && teacherSubjects.length > 0) {
        const subjectIds = teacherSubjects.map((s) => s.subject_id);
        query = query.in("subject_id", subjectIds);
      }
    }

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    }

    const { data: modules, error } = await query;

    if (error) {
      console.error("Error fetching modules:", error);
      return NextResponse.json(
        { error: "Failed to fetch modules" },
        { status: 500 }
      );
    }

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Modules GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teacher/modules
 * Create a new module
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
      subjectId,
      title,
      description,
      objectives,
      order,
      estimatedDuration,
    } = body;

    // Validate required fields
    if (!subjectId || !title?.trim()) {
      return NextResponse.json(
        { error: "Subject ID and title are required" },
        { status: 400 }
      );
    }

    // Verify teacher teaches this subject
    const { data: sectionSubject } = await supabase
      .from("n8n_content_creation.section_subjects")
      .select("id")
      .eq("subject_id", subjectId)
      .eq("teacher_id", teacherId)
      .limit(1)
      .single();

    if (!sectionSubject) {
      return NextResponse.json(
        { error: "You do not have permission to create modules for this subject" },
        { status: 403 }
      );
    }

    // Create module
    const { data: module, error } = await supabase
      .from("n8n_content_creation.modules")
      .insert({
        subject_id: subjectId,
        title: title.trim(),
        description: description?.trim() || null,
        objectives: objectives || [],
        order: order || 0,
        estimated_duration: estimatedDuration || null,
        status: "draft",
      })
      .select(
        `
        *,
        subject:n8n_content_creation.subjects(
          id,
          name,
          code
        )
      `
      )
      .single();

    if (error) {
      console.error("Error creating module:", error);
      return NextResponse.json(
        { error: "Failed to create module" },
        { status: 500 }
      );
    }

    return NextResponse.json({ module }, { status: 201 });
  } catch (error) {
    console.error("Modules POST error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
