import { NextRequest, NextResponse } from "next/server";
import { startQuiz, canTakeAssessment } from "@/lib/dal";
import { getCurrentStudent } from "@/lib/dal/student";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;

    // Get current student
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if student can take the assessment
    const { canTake, reason } = await canTakeAssessment(assessmentId, student.id);
    if (!canTake) {
      return NextResponse.json(
        { error: reason || "Cannot take assessment" },
        { status: 403 }
      );
    }

    // Start the quiz (creates pending submission)
    const result = await startQuiz(assessmentId, student.id, student.school_id);
    if (!result) {
      return NextResponse.json(
        { error: "Failed to start quiz" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submissionId: result.submissionId,
    });
  } catch (error) {
    console.error("Error starting quiz:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
