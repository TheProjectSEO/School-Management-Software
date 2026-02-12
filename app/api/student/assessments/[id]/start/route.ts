import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { startQuiz, canTakeAssessment } from "@/lib/dal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params;

    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }
    const { student } = authResult;

    // Check if student can take the assessment
    const { canTake, reason } = await canTakeAssessment(assessmentId, student.studentId);
    if (!canTake) {
      return NextResponse.json(
        { error: reason || "Cannot take assessment" },
        { status: 403 }
      );
    }

    // Start the quiz (creates pending submission)
    const result = await startQuiz(assessmentId, student.studentId, student.schoolId);
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
