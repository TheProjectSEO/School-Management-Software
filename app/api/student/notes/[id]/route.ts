import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";

// GET - Get a single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use JWT-based authentication
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: note, error } = await supabase
      .from("student_notes")
      .select(`
        *,
        course:courses(id, name, subject_code),
        lesson:lessons(id, title)
      `)
      .eq("id", id)
      .eq("student_id", student.studentId)
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
    // Use JWT-based authentication
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const { id } = await params;
    const supabase = createServiceClient();

    // Verify note belongs to student
    const { data: existingNote } = await supabase
      .from("student_notes")
      .select("id")
      .eq("id", id)
      .eq("student_id", student.studentId)
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
    // Use JWT-based authentication
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const { id } = await params;
    const supabase = createServiceClient();

    // Delete note (filter ensures only owner can delete)
    const { error } = await supabase
      .from("student_notes")
      .delete()
      .eq("id", id)
      .eq("student_id", student.studentId);

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
