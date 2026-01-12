import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Helper to get student ID from auth user
async function getStudentId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return null;
  }

  if (!profile) return null;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (studentError) {
    console.error("Error fetching student:", studentError);
    return null;
  }

  return student?.id || null;
}

// GET - Get a single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const studentId = await getStudentId(supabase);
    if (!studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: note, error } = await supabase
      .from("student_notes")
      .select(`
        *,
        course:courses(id, name, subject_code),
        lesson:lessons(id, title)
      `)
      .eq("id", id)
      .eq("student_id", studentId)
      .single();

    if (error || !note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Note GET error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

// PUT - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const studentId = await getStudentId(supabase);
    if (!studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify note belongs to student
    const { data: existingNote } = await supabase
      .from("student_notes")
      .select("id")
      .eq("id", id)
      .eq("student_id", studentId)
      .single();

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Get update data
    const body = await request.json();
    const { title, content, type, courseId, lessonId, tags, isFavorite } = body;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      if (!title?.trim()) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (content !== undefined) updates.content = content?.trim() || null;
    if (type !== undefined) updates.type = type;
    if (courseId !== undefined) updates.course_id = courseId || null;
    if (lessonId !== undefined) updates.lesson_id = lessonId || null;
    if (tags !== undefined) updates.tags = tags;
    if (isFavorite !== undefined) updates.is_favorite = isFavorite;

    // Update note
    const { data: note, error } = await supabase
      .from("student_notes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating note:", error);
      return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Note PUT error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

// DELETE - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const studentId = await getStudentId(supabase);
    if (!studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete note (RLS will ensure only owner can delete)
    const { error } = await supabase
      .from("student_notes")
      .delete()
      .eq("id", id)
      .eq("student_id", studentId);

    if (error) {
      console.error("Error deleting note:", error);
      return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Note DELETE error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
