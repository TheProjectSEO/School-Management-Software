import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Helper to get student ID from auth user
// Uses SECURITY DEFINER RPC to bypass RLS circular dependencies
async function getStudentId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { studentId: null, error: "Unauthorized" };

  // Use RPC function that bypasses RLS circular dependencies
  const { data, error } = await supabase.rpc("get_student_profile", {
    user_auth_id: user.id,
  });

  if (error) {
    console.error("Error fetching student via RPC:", error);
    return { studentId: null, error: "Failed to fetch profile" };
  }

  if (!data || data.length === 0) {
    return { studentId: null, error: "Student not found" };
  }

  return { studentId: data[0].student_id, error: null };
}

// GET - List all notes for current student (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const lessonId = searchParams.get("lessonId");

    // Get student ID using RPC
    const { studentId, error: studentError } = await getStudentId(supabase);

    if (!studentId) {
      const status = studentError === "Unauthorized" ? 401 : studentError === "Student not found" ? 404 : 500;
      return NextResponse.json({ error: studentError }, { status });
    }

    // Build query with optional filters
    let query = supabase
      .from("student_notes")
      .select(`
        *,
        course:courses(id, name, subject_code),
        lesson:lessons(id, title)
      `)
      .eq("student_id", studentId);

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    if (lessonId) {
      query = query.contains("tags", [lessonId]);
    }

    const { data: notes, error } = await query.order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Notes GET error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get student ID using RPC
    const { studentId, error: studentError } = await getStudentId(supabase);

    if (!studentId) {
      const status = studentError === "Unauthorized" ? 401 : studentError === "Student not found" ? 404 : 500;
      return NextResponse.json({ error: studentError }, { status });
    }

    // Get note data from request
    const body = await request.json();
    const { title, content, type, courseId, lessonId, tags, isFavorite } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Create note
    const { data: note, error } = await supabase
      .from("student_notes")
      .insert({
        student_id: studentId,
        title: title.trim(),
        content: content?.trim() || null,
        type: type || "note",
        course_id: courseId || null,
        lesson_id: lessonId || null,
        tags: tags || [],
        is_favorite: isFavorite || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Notes POST error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
