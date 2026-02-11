import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * GET /api/teacher/modules
 * List all modules for teacher's courses
 */
export async function GET(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const status = searchParams.get("status");

  try {
    const supabase = createServiceClient();

    // Get teacher's course assignments
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("course_id")
      .eq("teacher_profile_id", teacherId);

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ modules: [] });
    }

    const courseIds = courseId
      ? [courseId]
      : assignments.map((a) => a.course_id);

    // Verify teacher has access to the requested course
    if (courseId && !assignments.some((a) => a.course_id === courseId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch modules (flat columns, no FK joins)
    let query = supabase
      .from("modules")
      .select("id, course_id, title, description, order, duration_minutes, is_published, learning_objectives, created_at, updated_at")
      .in("course_id", courseIds)
      .order("order", { ascending: true });

    if (status === "published") {
      query = query.eq("is_published", true);
    } else if (status === "draft") {
      query = query.eq("is_published", false);
    }

    const { data: modules, error } = await query;

    if (error) {
      console.error("Error fetching modules:", error);
      return NextResponse.json(
        { error: "Failed to fetch modules" },
        { status: 500 }
      );
    }

    // Fetch course info separately
    const uniqueCourseIds = [...new Set((modules || []).map((m) => m.course_id))];
    let courseMap: Record<string, { id: string; name: string; subject_code: string }> = {};
    if (uniqueCourseIds.length > 0) {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, subject_code")
        .in("id", uniqueCourseIds);

      if (courses) {
        courses.forEach((c) => {
          courseMap[c.id] = { id: c.id, name: c.name, subject_code: c.subject_code };
        });
      }
    }

    const modulesWithCourse = (modules || []).map((m) => ({
      ...m,
      course: courseMap[m.course_id] || null,
    }));

    return NextResponse.json({ modules: modulesWithCourse });
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
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      courseId,
      title,
      description,
      learningObjectives,
      order,
      durationMinutes,
    } = body;

    if (!courseId || !title?.trim()) {
      return NextResponse.json(
        { error: "Course ID and title are required" },
        { status: 400 }
      );
    }

    // Verify teacher has access to this course
    const { count } = await supabase
      .from("teacher_assignments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("teacher_profile_id", teacherId);

    if (!count) {
      return NextResponse.json(
        { error: "You do not have permission to create modules for this course" },
        { status: 403 }
      );
    }

    // Get next order value
    const { data: existing } = await supabase
      .from("modules")
      .select("order")
      .eq("course_id", courseId)
      .order("order", { ascending: false })
      .limit(1);

    const nextOrder = order || (existing?.[0]?.order || 0) + 1;

    const { data: module, error } = await supabase
      .from("modules")
      .insert({
        course_id: courseId,
        title: title.trim(),
        description: description?.trim() || null,
        learning_objectives: Array.isArray(learningObjectives) ? learningObjectives : [],
        order: nextOrder,
        duration_minutes: durationMinutes || null,
        is_published: false,
      })
      .select()
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
