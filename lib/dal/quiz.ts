/**
 * Quiz data access functions
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { generateAiDraftEvaluation } from "@/lib/ai/assessment-grader";
import type {
  Question,
  AnswerOption,
  StudentAnswer,
  AssessmentWithDetails,
  QuizSubmissionPayload,
  QuizResult,
  Course,
} from "./types";

// Helper to check if error is a table-not-found error (PGRST205)
// These tables may not exist yet if quiz feature isn't fully set up
function isTableNotFoundError(error: { code?: string }): boolean {
  return error?.code === "PGRST205";
}

/**
 * Get assessment with full details including questions (without correct answers for students)
 * Uses admin client to bypass RLS since students need to read published assessments
 */
export async function getAssessmentForQuiz(
  assessmentId: string
): Promise<AssessmentWithDetails | null> {
  // Use admin client to bypass RLS - students need to read assessments
  const supabase = createAdminClient();

  const { data: assessment, error } = await supabase
    .from("assessments")
    .select(
      `
      *,
      course:courses(*)
    `
    )
    .eq("id", assessmentId)
    .single();

  if (error) {
    console.error("Error fetching assessment:", error);
    return null;
  }

  return assessment;
}

/**
 * Get questions for an assessment (without correct answers - for taking quiz)
 * Checks both 'questions' table and 'teacher_assessment_questions' table as fallback
 * Uses admin client to bypass RLS since students need to read teacher-created questions
 */
export async function getQuestionsForQuiz(
  assessmentId: string
): Promise<Question[]> {
  // Use admin client to bypass RLS - students need to read questions
  const supabase = createAdminClient();

  // First try the 'questions' table (used by AI save-assessment)
  let { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, assessment_id, question_text, question_type, points, order_index, created_at")
    .eq("assessment_id", assessmentId)
    .order("order_index", { ascending: true });

  if (questionsError && !isTableNotFoundError(questionsError)) {
    console.error("Error fetching questions:", questionsError);
  }

  // If no questions found, try 'teacher_assessment_questions' table as fallback
  if (!questions || questions.length === 0) {
    const { data: taqQuestions, error: taqError } = await supabase
      .from("teacher_assessment_questions")
      .select("id, assessment_id, question_text, question_type, points, order_index, choices_json, created_at")
      .eq("assessment_id", assessmentId)
      .order("order_index", { ascending: true });

    if (taqError && !isTableNotFoundError(taqError)) {
      console.error("Error fetching teacher_assessment_questions:", taqError);
    }

    if (taqQuestions && taqQuestions.length > 0) {
      // Convert teacher_assessment_questions format to Question format
      return taqQuestions.map((q: any) => {
        const options: AnswerOption[] = [];
        if (q.choices_json && Array.isArray(q.choices_json)) {
          q.choices_json.forEach((choice: any, idx: number) => {
            options.push({
              id: `${q.id}-opt-${idx}`,
              question_id: q.id,
              option_text: typeof choice === 'string' ? choice : choice.text || choice.label || String(choice),
              is_correct: false, // Don't expose correct answers
              order_index: idx,
            });
          });
        }
        return {
          id: q.id,
          assessment_id: q.assessment_id,
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          order_index: q.order_index,
          created_at: q.created_at,
          options,
        } as Question;
      });
    }
    return [];
  }

  // Get options for questions from answer_options table
  const questionIds = questions.map((q) => q.id);
  const { data: options, error: optionsError } = await supabase
    .from("answer_options")
    .select("id, question_id, option_text, order_index")
    .in("question_id", questionIds)
    .order("order_index", { ascending: true });

  if (optionsError) {
    console.error("Error fetching options:", optionsError);
  }

  // Map options to questions
  const optionsByQuestion = new Map<string, AnswerOption[]>();
  (options || []).forEach((opt) => {
    const existing = optionsByQuestion.get(opt.question_id) || [];
    existing.push({
      ...opt,
      is_correct: false, // Don't expose correct answers
    });
    optionsByQuestion.set(opt.question_id, existing);
  });

  return questions.map((q) => ({
    ...q,
    options: optionsByQuestion.get(q.id) || [],
  })) as Question[];
}

/**
 * Get questions with correct answers (for grading/review)
 * Checks both 'questions' table and 'teacher_assessment_questions' table as fallback
 * Uses admin client to bypass RLS
 */
export async function getQuestionsWithAnswers(
  assessmentId: string
): Promise<Question[]> {
  const supabase = createAdminClient();

  // First try the 'questions' table
  let { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("order_index", { ascending: true });

  if (questionsError && !isTableNotFoundError(questionsError)) {
    console.error("Error fetching questions:", questionsError);
  }

  // If no questions found, try 'teacher_assessment_questions' table as fallback
  if (!questions || questions.length === 0) {
    const { data: taqQuestions, error: taqError } = await supabase
      .from("teacher_assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("order_index", { ascending: true });

    if (taqError && !isTableNotFoundError(taqError)) {
      console.error("Error fetching teacher_assessment_questions:", taqError);
    }

    if (taqQuestions && taqQuestions.length > 0) {
      // Convert teacher_assessment_questions format to Question format
      return taqQuestions.map((q: any) => {
        const options: AnswerOption[] = [];
        if (q.choices_json && Array.isArray(q.choices_json)) {
          q.choices_json.forEach((choice: any, idx: number) => {
            // Check multiple formats for correct answer detection:
            // 1. choice.is_correct (AI planner format: {id, text, is_correct})
            // 2. answer_key_json.correct_ids includes choice.id (AI planner format)
            // 3. answer_key_json.correctIndex === idx (legacy manual format)
            // 4. answer_key_json.correct === idx (legacy manual format)
            // 5. answer_key_json array includes idx (legacy array format)
            const choiceId = choice.id ?? null;
            const isCorrect =
              choice.is_correct === true ||
              (Array.isArray(q.answer_key_json?.correct_ids) && choiceId != null && q.answer_key_json.correct_ids.includes(choiceId)) ||
              q.answer_key_json?.correctIndex === idx ||
              q.answer_key_json?.correct === idx ||
              (Array.isArray(q.answer_key_json) && q.answer_key_json.includes(idx));
            options.push({
              id: `${q.id}-opt-${idx}`,
              question_id: q.id,
              option_text: typeof choice === 'string' ? choice : choice.text || choice.label || String(choice),
              is_correct: Boolean(isCorrect),
              order_index: idx,
            });
          });
        }

        // Extract correct_answer for short_answer/essay types
        const correctAnswer = q.answer_key_json?.answer ||
          (q.answer_key_json?.acceptable_answers?.[0]) ||
          null;

        return {
          id: q.id,
          assessment_id: q.assessment_id,
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          correct_answer: correctAnswer,
          explanation: undefined,
          order_index: q.order_index,
          created_at: q.created_at,
          options,
        } as Question;
      });
    }
    return [];
  }

  // Get all options with is_correct from answer_options table
  const questionIds = questions.map((q) => q.id);
  const { data: options, error: optionsError } = await supabase
    .from("answer_options")
    .select("*")
    .in("question_id", questionIds)
    .order("order_index", { ascending: true });

  if (optionsError) {
    console.error("Error fetching options:", optionsError);
  }

  const optionsByQuestion = new Map<string, AnswerOption[]>();
  (options || []).forEach((opt) => {
    const existing = optionsByQuestion.get(opt.question_id) || [];
    existing.push(opt);
    optionsByQuestion.set(opt.question_id, existing);
  });

  return questions.map((q) => ({
    ...q,
    options: optionsByQuestion.get(q.id) || [],
  }));
}

/**
 * Start a quiz - creates a pending submission
 * Uses admin client to bypass RLS for creating submissions
 */
export async function startQuiz(
  assessmentId: string,
  studentId: string,
  schoolId: string
): Promise<{ submissionId: string } | null> {
  const supabase = createAdminClient();

  // Check for existing pending submission
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .eq("status", "pending")
    .single();

  if (existing) {
    return { submissionId: existing.id };
  }

  // Get attempt count
  const { count } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId);

  const attemptNumber = (count || 0) + 1;

  // Create new submission
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      assessment_id: assessmentId,
      student_id: studentId,
      school_id: schoolId,
      status: "pending",
      attempt_number: attemptNumber,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error starting quiz:", error);
    return null;
  }

  return { submissionId: data.id };
}

/**
 * Save a single answer (auto-save during quiz)
 * Uses admin client to bypass RLS for saving student answers
 */
export async function saveAnswer(
  submissionId: string,
  questionId: string,
  selectedOptionId?: string,
  textAnswer?: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: submission, error: statusError } = await supabase
    .from("submissions")
    .select("status")
    .eq("id", submissionId)
    .single();

  if (statusError || !submission) {
    return false;
  }

  if (submission.status !== "pending") {
    return false;
  }

  const { error } = await supabase.from("student_answers").upsert(
    {
      submission_id: submissionId,
      question_id: questionId,
      selected_option_id: selectedOptionId || null,
      text_answer: textAnswer || null,
    },
    {
      onConflict: "submission_id,question_id",
    }
  );

  if (error) {
    // Only log error if it's not a table-not-found error (quiz tables may not exist yet)
    if (!isTableNotFoundError(error)) {
      console.error("Error saving answer:", error);
    }
    return false;
  }

  return true;
}

/**
 * Get saved answers for a submission
 * Uses admin client to bypass RLS for reading student answers
 */
export async function getSavedAnswers(
  submissionId: string
): Promise<Map<string, { selectedOptionId?: string; textAnswer?: string }>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("student_answers")
    .select("question_id, selected_option_id, text_answer")
    .eq("submission_id", submissionId);

  if (error) {
    // Only log error if it's not a table-not-found error (quiz tables may not exist yet)
    if (!isTableNotFoundError(error)) {
      console.error("Error fetching saved answers:", error);
    }
    return new Map();
  }

  const answersMap = new Map<string, { selectedOptionId?: string; textAnswer?: string }>();
  (data || []).forEach((a) => {
    answersMap.set(a.question_id, {
      selectedOptionId: a.selected_option_id || undefined,
      textAnswer: a.text_answer || undefined,
    });
  });

  return answersMap;
}

/**
 * Submit quiz and calculate score
 * Uses admin client to bypass RLS for updating submission data
 */
export async function submitQuiz(
  submissionId: string,
  assessmentId: string,
  payload: QuizSubmissionPayload
): Promise<QuizResult | null> {
  const supabase = createAdminClient();

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("id", submissionId)
    .single();

  if (submissionError || !submission || submission.status !== "pending") {
    console.error("Submission is not pending or not found");
    return null;
  }

  // Get questions with correct answers
  const questions = await getQuestionsWithAnswers(assessmentId);
  if (questions.length === 0) {
    console.error("No questions found for assessment");
    return null;
  }

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  let autoScore = 0;
  let totalPoints = 0;
  let subjectivePoints = 0;
  const subjectiveQuestions: {
    id: string;
    prompt: string;
    answer: string;
    maxPoints: number;
    type: string;
  }[] = [];

  // Grade each answer
  const gradedAnswers: StudentAnswer[] = [];

  for (const answer of payload.answers) {
    const question = questionMap.get(answer.question_id);
    if (!question) continue;

    totalPoints += question.points;

    let isCorrect = false;
    let pointsEarned = 0;

    if (question.question_type === "multiple_choice") {
      // Find the correct option
      const correctOption = question.options?.find((o) => o.is_correct);
      isCorrect = correctOption?.id === answer.selected_option_id;
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.question_type === "true_false") {
      // For true/false, check if options exist (custom choices) or use standard true/false
      if (question.options && question.options.length > 0) {
        // Check against the correct option (like multiple_choice)
        const correctOption = question.options.find((o) => o.is_correct);
        isCorrect = correctOption?.id === answer.selected_option_id;
      } else {
        // Standard true/false - check against correct_answer string
        const studentAnswer = answer.selected_option_id?.toLowerCase();
        isCorrect = studentAnswer === question.correct_answer?.toLowerCase();
      }
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.question_type === "short_answer" || question.question_type === "essay") {
      subjectivePoints += question.points;
      subjectiveQuestions.push({
        id: question.id,
        prompt: question.question_text,
        answer: answer.text_answer || "",
        maxPoints: question.points,
        type: question.question_type,
      });
      pointsEarned = 0;
    }

    autoScore += pointsEarned;

    gradedAnswers.push({
      id: "", // Will be set by DB
      submission_id: submissionId,
      question_id: answer.question_id,
      selected_option_id: answer.selected_option_id,
      text_answer: answer.text_answer,
      is_correct: (question.question_type === "short_answer" || question.question_type === "essay") ? null : isCorrect,
      points_earned: (question.question_type === "short_answer" || question.question_type === "essay") ? null : pointsEarned,
      created_at: new Date().toISOString(),
    });
  }

  const { data: assessment } = await supabase
    .from("assessments")
    .select("title, course:courses(name)")
    .eq("id", assessmentId)
    .single();

  const aiDraft = await generateAiDraftEvaluation({
    assessmentTitle: assessment?.title || "Assessment",
    courseName: (assessment?.course as { name?: string } | null)?.name ?? null,
    subjectiveQuestions,
    totalSubjectivePoints: subjectivePoints,
  });

  const aiScore =
    typeof aiDraft?.subjectivePointsAwarded === "number"
      ? autoScore + aiDraft.subjectivePointsAwarded
      : autoScore;

  // Upsert all answers
  for (const answer of gradedAnswers) {
    await supabase.from("student_answers").upsert(
      {
        submission_id: answer.submission_id,
        question_id: answer.question_id,
        selected_option_id: answer.selected_option_id || null,
        text_answer: answer.text_answer || null,
        is_correct: answer.is_correct,
        points_earned: answer.points_earned ?? null,
      },
      {
        onConflict: "submission_id,question_id",
      }
    );
  }

  // Determine if all questions are auto-gradable (no subjective questions)
  const isFullyAutoGradable = subjectivePoints === 0;

  // Update submission with score
  const { error: updateError } = await supabase
    .from("submissions")
    .update({
      // Set score for fully auto-gradable quizzes, otherwise null (pending teacher review)
      score: isFullyAutoGradable ? autoScore : null,
      // Set status to "graded" if fully auto-gradable, otherwise "submitted" (pending review)
      status: isFullyAutoGradable ? "graded" : "submitted",
      submitted_at: new Date().toISOString(),
      time_spent_seconds: payload.time_spent_seconds,
      ai_score: aiScore,
      ai_feedback: aiDraft?.feedback ?? null,
      ai_graded_at: aiDraft ? new Date().toISOString() : null,
    })
    .eq("id", submissionId);

  if (updateError) {
    console.error("Error updating submission:", updateError);
    return null;
  }

  // Queue subjective questions for teacher review
  if (subjectiveQuestions.length > 0) {
    for (const sq of subjectiveQuestions) {
      // Check if item already exists in queue to avoid duplicates
      const { data: existing } = await supabase
        .from("teacher_grading_queue")
        .select("id")
        .eq("submission_id", submissionId)
        .eq("question_id", sq.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("teacher_grading_queue").insert({
          submission_id: submissionId,
          question_id: sq.id,
          question_type: sq.type,
          question_text: sq.prompt,
          student_response: sq.answer,
          max_points: sq.maxPoints,
          status: "pending",
          priority: sq.type === "essay" ? 1 : 0, // Essays get higher priority
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  // Return the final score based on whether it's fully auto-gradable
  const finalScore = isFullyAutoGradable ? autoScore : aiScore;

  return {
    submission_id: submissionId,
    score: finalScore,
    total_points: totalPoints,
    percentage: totalPoints > 0 ? Math.round((finalScore / totalPoints) * 100) : 0,
    answers: gradedAnswers.map((a) => ({
      ...a,
      question: questionMap.get(a.question_id)!,
      selected_option: a.selected_option_id
        ? questionMap.get(a.question_id)?.options?.find((o) => o.id === a.selected_option_id)
        : undefined,
    })),
  };
}

/**
 * Get quiz result for a submission
 * Uses admin client to bypass RLS for reading submission and answers
 */
export async function getQuizResult(
  submissionId: string
): Promise<QuizResult | null> {
  const supabase = createAdminClient();

  // Get submission
  const { data: submission, error: subError } = await supabase
    .from("submissions")
    .select("*, assessment:assessments(*)")
    .eq("id", submissionId)
    .single();

  if (subError || !submission) {
    console.error("Error fetching submission:", subError);
    return null;
  }

  // Get questions with answers
  const questions = await getQuestionsWithAnswers(submission.assessment_id);

  // Get student answers
  const { data: answers, error: ansError } = await supabase
    .from("student_answers")
    .select("*")
    .eq("submission_id", submissionId);

  if (ansError) {
    // Only log error if it's not a table-not-found error (quiz tables may not exist yet)
    if (!isTableNotFoundError(ansError)) {
      console.error("Error fetching student answers:", ansError);
    }
    return null;
  }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  // Build a lookup from question_id → student answer
  const answersMap = new Map(
    (answers || []).map((a) => [a.question_id, a])
  );

  // Iterate over ALL questions (not just student_answers) so that
  // even when student_answers rows are missing, every question still appears.
  const resultAnswers = questions
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((q) => {
      const studentAnswer = answersMap.get(q.id);
      if (studentAnswer) {
        return {
          ...studentAnswer,
          question: q,
          selected_option: studentAnswer.selected_option_id
            ? q.options?.find((o) => o.id === studentAnswer.selected_option_id)
            : undefined,
        };
      }
      // No student answer row for this question — create a placeholder
      return {
        id: `no-answer-${q.id}`,
        submission_id: submissionId,
        question_id: q.id,
        selected_option_id: undefined,
        text_answer: undefined,
        is_correct: false,
        points_earned: 0,
        created_at: "",
        question: q,
        selected_option: undefined,
      };
    });

  return {
    submission_id: submissionId,
    score: submission.score || 0,
    total_points: totalPoints,
    percentage: totalPoints > 0 ? Math.round(((submission.score || 0) / totalPoints) * 100) : 0,
    answers: resultAnswers,
  };
}

/**
 * Internal helper: check if a student has completed all published lessons in a module
 */
async function getModuleCompletionForStudent(
  moduleId: string,
  studentId: string
): Promise<{
  complete: boolean;
  completedLessons: number;
  totalLessons: number;
  moduleName: string;
  moduleId: string;
}> {
  const supabase = createAdminClient();

  // 1. Get module title (flat select — BUG-001 safe)
  const { data: module } = await supabase
    .from("modules")
    .select("id, title")
    .eq("id", moduleId)
    .single();

  const moduleName = (module?.title as string) || "the module";

  // 2. Get all published lesson IDs in the module (flat select)
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("module_id", moduleId)
    .eq("status", "published");

  const totalLessons = lessons?.length || 0;

  // No published lessons means the gate doesn't apply
  if (totalLessons === 0) {
    return { complete: true, completedLessons: 0, totalLessons: 0, moduleName, moduleId };
  }

  const lessonIds = lessons!.map((l: { id: string }) => l.id);

  // 3. Get lessons the student has completed (completed_at IS NOT NULL)
  const { data: progress } = await supabase
    .from("student_progress")
    .select("lesson_id")
    .eq("student_id", studentId)
    .in("lesson_id", lessonIds)
    .not("completed_at", "is", null);

  const completedLessons = progress?.length || 0;

  return {
    complete: completedLessons >= totalLessons,
    completedLessons,
    totalLessons,
    moduleName,
    moduleId,
  };
}

/**
 * Check if student can take assessment (hasn't exceeded max attempts, module completed)
 * Uses admin client to bypass RLS for reading assessment and submission data
 */
export async function canTakeAssessment(
  assessmentId: string,
  studentId: string
): Promise<{
  canTake: boolean;
  reason?: string;
  attemptCount: number;
  prerequisiteModule?: {
    id: string;
    title: string;
    completedLessons: number;
    totalLessons: number;
  };
}> {
  const supabase = createAdminClient();

  // Get assessment max attempts + lesson link
  const { data: assessment } = await supabase
    .from("assessments")
    .select("max_attempts, due_date, lesson_id")
    .eq("id", assessmentId)
    .single();

  if (!assessment) {
    return { canTake: false, reason: "Assessment not found", attemptCount: 0 };
  }

  // Check due date
  if (assessment.due_date && new Date(assessment.due_date) < new Date()) {
    return { canTake: false, reason: "Assessment is past due date", attemptCount: 0 };
  }

  // Count completed attempts
  const { count } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .neq("status", "pending");

  const attemptCount = count || 0;
  const maxAttempts = assessment.max_attempts || 1;

  if (attemptCount >= maxAttempts) {
    return {
      canTake: false,
      reason: `Maximum attempts (${maxAttempts}) reached`,
      attemptCount,
    };
  }

  // Module prerequisite gate — only applies when assessment is linked to a lesson
  if (assessment.lesson_id) {
    // Flat select: lesson → module_id (BUG-001 safe)
    const { data: lesson } = await supabase
      .from("lessons")
      .select("module_id")
      .eq("id", assessment.lesson_id)
      .single();

    if (lesson?.module_id) {
      const completion = await getModuleCompletionForStudent(lesson.module_id, studentId);
      if (!completion.complete) {
        return {
          canTake: false,
          reason: `Complete "${completion.moduleName}" first`,
          attemptCount,
          prerequisiteModule: {
            id: completion.moduleId,
            title: completion.moduleName,
            completedLessons: completion.completedLessons,
            totalLessons: completion.totalLessons,
          },
        };
      }
    }
  }

  return { canTake: true, attemptCount };
}

/**
 * Get pending submission for a student (in-progress quiz)
 * Uses admin client to bypass RLS for reading submission data
 */
export async function getPendingSubmission(
  assessmentId: string,
  studentId: string
): Promise<{ submissionId: string; startedAt: string } | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("submissions")
    .select("id, started_at")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .eq("status", "pending")
    .single();

  if (error || !data) {
    return null;
  }

  return { submissionId: data.id, startedAt: data.started_at };
}
