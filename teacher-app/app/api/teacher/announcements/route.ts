// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * GET /api/teacher/announcements
 * List announcements created by teacher
 */
export async function GET(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { userId } = authResult.context;
  const { searchParams } = new URL(request.url);
  const scopeType = searchParams.get("scopeType");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const supabase = await createClient();

    let query = supabase
      .from("teacher_announcements")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (scopeType) {
      query = query.eq("scope_type", scopeType);
    }

    const { data: announcements, error } = await query;

    if (error) {
      console.error("Error fetching announcements:", error);
      return NextResponse.json(
        { error: "Failed to fetch announcements" },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("Announcements GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teacher/announcements
 * Create a new announcement
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, userId } = authResult.context;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const { scopeType, scopeIds, title, body: content, attachments, publishAt } = body;

    // Validate required fields
    if (!scopeType || !scopeIds || !title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Scope type, scope IDs, title, and content are required" },
        { status: 400 }
      );
    }

    // Validate scope type
    if (!["section", "subject_multi_section"].includes(scopeType)) {
      return NextResponse.json(
        { error: "Invalid scope type" },
        { status: 400 }
      );
    }

    // Verify teacher has access to the specified scopes
    if (scopeType === "section") {
      // Verify teacher teaches these sections
      const { data: sectionSubjects } = await supabase
        .from("teacher_assignments")
        .select("section_id")
        .eq("teacher_id", teacherId)
        .in("section_id", scopeIds);

      if (!sectionSubjects || sectionSubjects.length !== scopeIds.length) {
        return NextResponse.json(
          { error: "You do not have access to all specified sections" },
          { status: 403 }
        );
      }
    } else if (scopeType === "subject_multi_section") {
      // Verify teacher teaches these subjects
      const { data: sectionSubjects } = await supabase
        .from("teacher_assignments")
        .select("subject_id")
        .eq("teacher_id", teacherId)
        .in("subject_id", scopeIds);

      if (!sectionSubjects || sectionSubjects.length !== scopeIds.length) {
        return NextResponse.json(
          { error: "You do not have access to all specified subjects" },
          { status: 403 }
        );
      }
    }

    // Create announcement
    const { data: announcement, error } = await supabase
      .from("teacher_announcements")
      .insert({
        scope_type: scopeType,
        scope_ids_json: scopeIds,
        title: title.trim(),
        body: content.trim(),
        attachments_json: attachments || [],
        publish_at: publishAt || new Date().toISOString(),
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating announcement:", error);
      return NextResponse.json(
        { error: "Failed to create announcement" },
        { status: 500 }
      );
    }

    // TODO: Create notifications for affected students

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("Announcements POST error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
