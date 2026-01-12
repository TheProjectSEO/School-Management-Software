import { NextRequest, NextResponse } from "next/server";
import { getQuestionsForQuiz, getAssessmentForQuiz, canTakeAssessment, getPendingSubmission, getSavedAnswers } from "@/lib/dal";
import { getCurrentStudent } from "@/lib/dal/student";

export async function GET(
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
    const { canTake, reason, attemptCount } = await canTakeAssessment(assessmentId, student.id);

    // Get assessment details
    const assessment = await getAssessmentForQuiz(assessmentId);
    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    // Get questions (without correct answers)
    const questions = await getQuestionsForQuiz(assessmentId);

    // Check for existing pending submission and get saved answers
    const pendingSubmission = await getPendingSubmission(assessmentId, student.id);
    let savedAnswers: Record<string, { selectedOptionId?: string; textAnswer?: string }> = {};

    if (pendingSubmission) {
      const answersMap = await getSavedAnswers(pendingSubmission.submissionId);
      answersMap.forEach((value, key) => {
        savedAnswers[key] = value;
      });
    }

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        total_points: assessment.total_points,
        time_limit_minutes: assessment.time_limit_minutes,
        instructions: assessment.instructions,
        max_attempts: assessment.max_attempts,
        due_date: assessment.due_date,
        course: assessment.course,
      },
      questions,
      canTake,
      reason,
      attemptCount,
      pendingSubmission,
      savedAnswers,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
