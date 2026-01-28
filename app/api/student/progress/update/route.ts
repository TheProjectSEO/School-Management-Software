import { NextResponse } from "next/server";
import { updateLessonProgress } from "@/lib/dal";
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
    const { courseId, lessonId, progress } = body;

    if (!courseId || !lessonId || progress === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: courseId, lessonId, progress" },
        { status: 400 }
      );
    }

    // Use the authenticated student's ID (not from request body)
    const success = await updateLessonProgress(
      studentId,
      courseId,
      lessonId,
      progress
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update progress" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error("Error in progress update API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
