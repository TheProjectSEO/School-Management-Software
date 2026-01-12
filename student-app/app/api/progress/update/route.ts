import { NextResponse } from "next/server";
import { updateLessonProgress } from "@/lib/dal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, courseId, lessonId, progress } = body;

    if (!studentId || !courseId || !lessonId || progress === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
