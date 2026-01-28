import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

export async function POST(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      courseId,
      title,
      description,
      learningObjectives,
      lessons,
      durationMinutes,
    } = body;

    if (!courseId || !title?.trim()) {
      return NextResponse.json(
        { error: "Course and title are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(lessons) || lessons.length === 0) {
      return NextResponse.json(
        { error: "At least one lesson is required" },
        { status: 400 }
      );
    }

    const { count } = await supabase
      .from("teacher_assignments")
      .select("*", { count: "exact", head: true })
      .eq("teacher_profile_id", teacherId)
      .eq("course_id", courseId);

    if (!count) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from("modules")
      .select("order")
      .eq("course_id", courseId)
      .order("order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.order || 0) + 1;
    const calculatedDuration = Array.isArray(lessons)
      ? lessons.reduce(
          (sum: number, l: { duration_minutes?: number }) =>
            sum + (l.duration_minutes || 0),
          0
        )
      : 0;

    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .insert({
        course_id: courseId,
        title: title.trim(),
        description: description?.trim() || null,
        order: nextOrder,
        duration_minutes: durationMinutes || calculatedDuration || null,
        is_published: false,
        learning_objectives: Array.isArray(learningObjectives)
          ? learningObjectives
          : [],
      })
      .select()
      .single();

    if (moduleError || !module) {
      console.error("Module insert error:", moduleError);
      return NextResponse.json(
        { error: "Failed to create module" },
        { status: 500 }
      );
    }

    const lessonRows = lessons.map(
      (
        lesson: { title: string; content?: string; duration_minutes?: number },
        index: number
      ) => ({
        module_id: module.id,
        title: lesson.title?.trim() || `Lesson ${index + 1}`,
        content: lesson.content?.trim() || null,
        content_type: "reading",
        duration_minutes: lesson.duration_minutes || null,
        order: index + 1,
        is_published: false,
      })
    );

    const { error: lessonsError } = await supabase
      .from("lessons")
      .insert(lessonRows);

    if (lessonsError) {
      console.error("Lessons insert error:", lessonsError);
      await supabase.from("modules").delete().eq("id", module.id);
      return NextResponse.json(
        { error: "Failed to create lessons" },
        { status: 500 }
      );
    }

    return NextResponse.json({ module }, { status: 201 });
  } catch (error) {
    console.error("AI save module error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
