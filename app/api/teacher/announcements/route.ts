import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
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

  const { teacherId } = authResult.teacher;
  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("targetType");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const supabase = createServiceClient();

    let query = supabase
      .from("teacher_announcements")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (targetType) {
      query = query.eq("target_type", targetType);
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

  const { teacherId, schoolId } = authResult.teacher;

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      scopeType,
      scopeIds,
      title,
      body: content,
      // Also support the correct field names
      target_type,
      target_section_ids,
      content: contentAlt,
      priority = 'normal',
      auto_publish = true,
      attachments
    } = body;

    // Support both old and new field names
    const finalTargetType = target_type || scopeType || 'section';
    const finalTargetIds = target_section_ids || scopeIds || [];
    const finalContent = contentAlt || content;

    // Validate required fields
    if (!finalTargetIds?.length || !title?.trim() || !finalContent?.trim()) {
      return NextResponse.json(
        { error: "Target sections, title, and content are required" },
        { status: 400 }
      );
    }

    // Validate target type
    if (!["section", "grade", "course", "school"].includes(finalTargetType)) {
      return NextResponse.json(
        { error: "Invalid target type" },
        { status: 400 }
      );
    }

    // Verify teacher has access to the specified sections
    if (finalTargetType === "section") {
      const { data: sectionAssignments } = await supabase
        .from("teacher_assignments")
        .select("section_id")
        .eq("teacher_profile_id", teacherId)
        .in("section_id", finalTargetIds);

      if (!sectionAssignments || sectionAssignments.length === 0) {
        return NextResponse.json(
          { error: "You do not have access to all specified sections" },
          { status: 403 }
        );
      }
    } else if (finalTargetType === "course") {
      const { data: courseAssignments } = await supabase
        .from("teacher_assignments")
        .select("course_id")
        .eq("teacher_profile_id", teacherId)
        .in("course_id", finalTargetIds);

      if (!courseAssignments || courseAssignments.length === 0) {
        return NextResponse.json(
          { error: "You do not have access to all specified courses" },
          { status: 403 }
        );
      }
    }

    // Create announcement with correct column names
    const { data: announcement, error } = await supabase
      .from("teacher_announcements")
      .insert({
        school_id: schoolId,
        teacher_id: teacherId,
        title: title.trim(),
        content: finalContent.trim(),
        target_type: finalTargetType,
        target_section_ids: finalTargetType === 'section' ? finalTargetIds : [],
        target_grade_levels: finalTargetType === 'grade' ? finalTargetIds : [],
        target_course_ids: finalTargetType === 'course' ? finalTargetIds : [],
        priority: priority,
        is_published: auto_publish,
        published_at: auto_publish ? new Date().toISOString() : null,
        attachments: attachments || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating announcement:", error);
      return NextResponse.json(
        { error: "Failed to create announcement: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("Announcements POST error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
