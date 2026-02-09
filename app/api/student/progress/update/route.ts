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

    // Validate progress is a number in [0, 100]
    const progressNum = Number(progress);
    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      return NextResponse.json(
        { error: "Progress must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    // Use the authenticated student's ID (not from request body)
    const result = await updateLessonProgress(
      studentId,
      courseId,
      lessonId,
      progressNum
    );

    if (!result.success) {
      console.error("Failed to update progress:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to update progress" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error("Error in progress update API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
