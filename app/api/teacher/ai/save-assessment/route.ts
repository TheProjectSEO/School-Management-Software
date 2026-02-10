import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

type DraftQuestion = {
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  points: number;
  explanation?: string | null;
  correct_answer?: string | null;
  options?: { text: string; isCorrect: boolean }[];
};

export async function POST(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, schoolId } = authResult.teacher;

  try {
    const supabase = createAdminClient();
    const body = await request.json();

    const {
      courseId,
      lessonId,
      title,
      type,
      instructions,
      dueDate,
      timeLimitMinutes,
      maxAttempts,
      publishNow,
      questions,
    } = body;

    if (!courseId || !title?.trim() || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Course, title, and questions are required" },
        { status: 400 }
      );
    }

    const { count } = await supabase
      .from("teacher_assignments")
      .select("*", { count: "exact", head: true })
      .eq("teacher_profile_id", teacherId)
      .eq("course_id", courseId);

    if (!count) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: course } = await supabase
      .from("courses")
      .select("section_id")
      .eq("id", courseId)
      .single();

    const totalPoints = questions.reduce(
      (sum: number, q: DraftQuestion) => sum + (q.points || 0),
      0
    );

    const insertData: Record<string, unknown> = {
      title: title.trim(),
      type: type || "quiz",
      course_id: courseId,
      section_id: course?.section_id || null,
      school_id: schoolId,
      instructions: instructions?.trim() || null,
      due_date: dueDate || null,
      time_limit_minutes: timeLimitMinutes || null,
      max_attempts: maxAttempts || 1,
      total_points: totalPoints,
      status: publishNow ? "published" : "draft",
      created_by: teacherId,
    };
    if (lessonId) insertData.lesson_id = lessonId;

    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .insert(insertData)
      .select()
      .single();

    if (assessmentError || !assessment) {
      console.error("Assessment insert error:", assessmentError?.message, assessmentError?.code, assessmentError?.details);
      return NextResponse.json(
        { error: assessmentError?.message || "Failed to create assessment" },
        { status: 500 }
      );
    }

    // Convert AI-generated questions to teacher_assessment_questions format
    // This is the same table the assessment builder/detail page reads from
    const questionRows = questions.map((q: DraftQuestion, index: number) => {
      let choices_json: unknown = null;
      let answer_key_json: unknown = null;

      if (q.question_type === "multiple_choice" && q.options) {
        // Convert options to choices_json format: [{id, text, is_correct}]
        choices_json = q.options.map((opt, optIndex) => ({
          id: String.fromCharCode(97 + optIndex), // a, b, c, d...
          text: opt.text,
          is_correct: Boolean(opt.isCorrect),
        }));
        // Set answer_key_json with correct_ids
        answer_key_json = {
          correct_ids: q.options
            .map((opt, optIndex) => opt.isCorrect ? String.fromCharCode(97 + optIndex) : null)
            .filter(Boolean),
        };
      } else if (q.question_type === "true_false") {
        choices_json = [
          { id: "true", text: "True", is_correct: q.correct_answer?.toLowerCase() === "true" },
          { id: "false", text: "False", is_correct: q.correct_answer?.toLowerCase() !== "true" },
        ];
        answer_key_json = {
          correct_ids: [q.correct_answer?.toLowerCase() === "true" ? "true" : "false"],
        };
      } else if (q.question_type === "short_answer" && q.correct_answer) {
        answer_key_json = {
          type: "short_answer",
          acceptable_answers: [q.correct_answer],
          case_sensitive: false,
        };
      }

      return {
        assessment_id: assessment.id,
        question_text: q.question_text,
        question_type: q.question_type,
        choices_json,
        answer_key_json,
        points: q.points || 1,
        explanation: q.explanation || null,
        order_index: index,
      };
    });

    const { error: questionsError } = await supabase
      .from("teacher_assessment_questions")
      .insert(questionRows);

    if (questionsError) {
      console.error("Question insert error:", questionsError.message, questionsError.code, questionsError.details);
      // Rollback the assessment
      await supabase.from("assessments").delete().eq("id", assessment.id);
      return NextResponse.json(
        { error: questionsError.message || "Failed to create questions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error("AI save assessment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
