import { NextResponse } from "next/server";
import { markLessonComplete } from "@/lib/dal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, courseId, lessonId } = body;

    if (!studentId || !courseId || !lessonId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const success = await markLessonComplete(studentId, courseId, lessonId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to mark lesson as complete" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in lesson complete API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
