import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { createServiceClient } from "@/lib/supabase/service";
import { generateAiDraftEvaluation } from "@/lib/ai/assessment-grader";

/**
 * POST /api/teacher/ai/grade-response
 * Generate AI-suggested feedback and score for a submission's subjective answers.
 *
 * Body: { submissionId: string }
 * Returns: { success, suggestion: { feedback, suggested_points, max_points, percentage } }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;

  try {
    const body = await request.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: "submissionId is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch submission + answers (flat selects — BUG-001 safe)
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("id, assessment_id, student_id, status")
      .eq("id", submissionId)
      .single();

    if (subError || !submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify teacher owns this assessment's course
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, title, course_id")
      .eq("id", submission.assessment_id)
      .single();

    if (!assessment) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("course_id", assessment.course_id)
      .eq("teacher_profile_id", teacherId)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    // Get course name
    const { data: course } = await supabase
      .from("courses")
      .select("name")
      .eq("id", assessment.course_id)
      .single();

    // Fetch answers for this submission
    const { data: answers, error: ansError } = await supabase
      .from("submission_answers")
      .select("id, question_id, text_answer")
      .eq("submission_id", submissionId);

    if (ansError || !answers?.length) {
      return NextResponse.json(
        { success: false, error: "No answers found for this submission" },
        { status: 404 }
      );
    }

    // Fetch question details for the answered questions
    const questionIds = answers.map((a) => a.question_id);
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_text, type, points")
      .in("id", questionIds);

    if (!questions?.length) {
      return NextResponse.json(
        { success: false, error: "Questions not found" },
        { status: 404 }
      );
    }

    // Build map for fast lookup
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Collect only subjective questions with actual text answers
    const subjectiveQuestions = answers
      .filter((a) => {
        const q = questionMap.get(a.question_id);
        return (
          q &&
          ["essay", "short_answer"].includes(q.type) &&
          a.text_answer?.trim()
        );
      })
      .map((a) => {
        const q = questionMap.get(a.question_id)!;
        return {
          id: a.question_id,
          prompt: q.question_text,
          answer: a.text_answer!,
          maxPoints: q.points,
          type: q.type,
        };
      });

    if (subjectiveQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: "No subjective questions with answers found" },
        { status: 400 }
      );
    }

    const totalSubjectivePoints = subjectiveQuestions.reduce(
      (sum, q) => sum + q.maxPoints,
      0
    );

    // Generate AI evaluation
    const aiDraft = await generateAiDraftEvaluation({
      assessmentTitle: assessment.title,
      courseName: course?.name ?? null,
      subjectiveQuestions,
      totalSubjectivePoints,
    });

    if (!aiDraft) {
      return NextResponse.json(
        { success: false, error: "AI evaluation failed to generate. Check OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestion: {
        feedback: aiDraft.feedback,
        suggested_points: aiDraft.subjectivePointsAwarded,
        max_points: totalSubjectivePoints,
        percentage: Math.round(
          (aiDraft.subjectivePointsAwarded / totalSubjectivePoints) * 100
        ),
      },
      message: "AI feedback generated. Please review before applying.",
    });
  } catch (error) {
    console.error("AI grade-response error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during AI grading" },
      { status: 500 }
    );
  }
}
