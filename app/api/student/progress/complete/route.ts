import { NextResponse } from "next/server";
import { markLessonComplete } from "@/lib/dal";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";

export async function POST(request: Request) {
  try {
    // Authenticate student using JWT
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { studentId } = authResult.student;
    const body = await request.json();
    const { courseId, lessonId } = body;

    if (!courseId || !lessonId) {
      return NextResponse.json(
        { error: "Missing required fields: courseId, lessonId" },
        { status: 400 }
      );
    }

    // Use the authenticated student's ID (not from request body)
    const result = await markLessonComplete(studentId, courseId, lessonId);

    if (!result.success) {
      console.error("Failed to mark lesson complete:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to mark lesson as complete" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in lesson complete API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
