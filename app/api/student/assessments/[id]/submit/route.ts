import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { submitQuiz } from "@/lib/dal";
import type { QuizSubmissionPayload } from "@/lib/dal/types";
import { createServiceClient } from "@/lib/supabase/service";

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

    const body = await request.json();
    const { submissionId, answers, timeSpentSeconds, fileAttachments } = body;

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

    // Save file attachments if any were uploaded
    if (fileAttachments && Array.isArray(fileAttachments) && fileAttachments.length > 0) {
      const supabase = createServiceClient()
      const { error: fileError } = await supabase
        .from('submissions')
        .update({ file_attachments: fileAttachments })
        .eq('id', submissionId)
      if (fileError) {
        console.error('Error saving file attachments:', fileError)
      }
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
