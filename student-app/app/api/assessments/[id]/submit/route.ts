import { NextRequest, NextResponse } from "next/server";
import { submitQuiz } from "@/lib/dal";
import { getCurrentStudent } from "@/lib/dal/student";
import type { QuizSubmissionPayload } from "@/lib/dal/types";

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

    const body = await request.json();
    const { submissionId, answers, timeSpentSeconds } = body;

    if (!submissionId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payload: QuizSubmissionPayload = {
      answers: answers.map((a: { questionId: string; selectedOptionId?: string; textAnswer?: string }) => ({
        question_id: a.questionId,
        selected_option_id: a.selectedOptionId,
        text_answer: a.textAnswer,
      })),
      time_spent_seconds: timeSpentSeconds || 0,
    };

    // Submit and grade the quiz
    const result = await submitQuiz(submissionId, assessmentId, payload);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to submit quiz" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      score: result.score,
      totalPoints: result.total_points,
      percentage: result.percentage,
      submissionId: result.submission_id,
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
