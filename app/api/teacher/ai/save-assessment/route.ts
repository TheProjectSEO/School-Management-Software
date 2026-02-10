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

    const questionRows = questions.map((q: DraftQuestion, index: number) => ({
      assessment_id: assessment.id,
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points || 1,
      correct_answer: q.correct_answer || null,
      explanation: q.explanation || null,
      order_index: index + 1,
    }));

    const { data: insertedQuestions, error: questionsError } = await supabase
      .from("questions")
      .insert(questionRows)
      .select("id, question_type");

    if (questionsError || !insertedQuestions) {
      console.error("Question insert error:", questionsError?.message, questionsError?.code, questionsError?.details);
      await supabase.from("assessments").delete().eq("id", assessment.id);
      return NextResponse.json(
        { error: questionsError?.message || "Failed to create questions" },
        { status: 500 }
      );
    }

    const optionRows: {
      question_id: string;
      option_text: string;
      is_correct: boolean;
      order_index: number;
    }[] = [];

    insertedQuestions.forEach((question, index) => {
      const draft = questions[index] as DraftQuestion;
      if (question.question_type === "multiple_choice" && draft?.options) {
        draft.options.forEach((opt: { text: string; isCorrect: boolean }, optIndex: number) => {
          optionRows.push({
            question_id: question.id,
            option_text: opt.text,
            is_correct: Boolean(opt.isCorrect),
            order_index: optIndex + 1,
          });
        });
      }
    });

    if (optionRows.length > 0) {
      const { error: optionsError } = await supabase
        .from("answer_options")
        .insert(optionRows);

      if (optionsError) {
        console.error("Option insert error:", optionsError);
      }
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
