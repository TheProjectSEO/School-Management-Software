/**
 * Quiz data access functions
 */

import { createClient } from "@/lib/supabase/server";
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
 */
export async function getAssessmentForQuiz(
  assessmentId: string
): Promise<AssessmentWithDetails | null> {
  const supabase = await createClient();

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
 */
export async function getQuestionsForQuiz(
  assessmentId: string
): Promise<Question[]> {
  const supabase = await createClient();

  // First get questions
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, assessment_id, question_text, question_type, points, order_index, created_at")
    .eq("assessment_id", assessmentId)
    .order("order_index", { ascending: true });

  if (questionsError) {
    // Only log error if it's not a table-not-found error (quiz tables may not exist yet)
    if (!isTableNotFoundError(questionsError)) {
      console.error("Error fetching questions:", questionsError);
    }
    return [];
  }

  if (!questions || questions.length === 0) {
    return [];
  }

  // Get options for all questions
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
 */
export async function getQuestionsWithAnswers(
  assessmentId: string
): Promise<Question[]> {
  const supabase = await createClient();

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("order_index", { ascending: true });

  if (questionsError) {
    // Only log error if it's not a table-not-found error (quiz tables may not exist yet)
    if (!isTableNotFoundError(questionsError)) {
      console.error("Error fetching questions:", questionsError);
    }
    return [];
  }

  if (!questions || questions.length === 0) {
    return [];
  }

  // Get all options with is_correct
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
 */
export async function startQuiz(
  assessmentId: string,
  studentId: string,
  schoolId: string
): Promise<{ submissionId: string } | null> {
  const supabase = await createClient();

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
 */
export async function saveAnswer(
  submissionId: string,
  questionId: string,
  selectedOptionId?: string,
  textAnswer?: string
): Promise<boolean> {
  const supabase = await createClient();

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
 */
export async function getSavedAnswers(
  submissionId: string
): Promise<Map<string, { selectedOptionId?: string; textAnswer?: string }>> {
  const supabase = await createClient();

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
 */
export async function submitQuiz(
  submissionId: string,
  assessmentId: string,
  payload: QuizSubmissionPayload
): Promise<QuizResult | null> {
  const supabase = await createClient();

  // Get questions with correct answers
  const questions = await getQuestionsWithAnswers(assessmentId);
  if (questions.length === 0) {
    console.error("No questions found for assessment");
    return null;
  }

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  let totalScore = 0;
  let totalPoints = 0;

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
      // For true/false, check against correct_answer
      const studentAnswer = answer.selected_option_id?.toLowerCase();
      isCorrect = studentAnswer === question.correct_answer?.toLowerCase();
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.question_type === "short_answer") {
      // Simple text comparison (case-insensitive, trimmed)
      const studentAnswer = answer.text_answer?.trim().toLowerCase();
      const correctAnswer = question.correct_answer?.trim().toLowerCase();
      // Allow for some flexibility - check if answer contains the correct answer
      if (studentAnswer && correctAnswer) {
        isCorrect = studentAnswer === correctAnswer ||
                    studentAnswer.includes(correctAnswer) ||
                    correctAnswer.includes(studentAnswer);
      } else {
        isCorrect = false;
      }
      pointsEarned = isCorrect ? question.points : 0;
    }

    totalScore += pointsEarned;

    gradedAnswers.push({
      id: "", // Will be set by DB
      submission_id: submissionId,
      question_id: answer.question_id,
      selected_option_id: answer.selected_option_id,
      text_answer: answer.text_answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      created_at: new Date().toISOString(),
    });
  }

  // Upsert all answers
  for (const answer of gradedAnswers) {
    await supabase.from("student_answers").upsert(
      {
        submission_id: answer.submission_id,
        question_id: answer.question_id,
        selected_option_id: answer.selected_option_id || null,
        text_answer: answer.text_answer || null,
        is_correct: answer.is_correct,
        points_earned: answer.points_earned,
      },
      {
        onConflict: "submission_id,question_id",
      }
    );
  }

  // Update submission with score
  const { error: updateError } = await supabase
    .from("submissions")
    .update({
      score: totalScore,
      status: "graded",
      submitted_at: new Date().toISOString(),
      graded_at: new Date().toISOString(),
      time_spent_seconds: payload.time_spent_seconds,
    })
    .eq("id", submissionId);

  if (updateError) {
    console.error("Error updating submission:", updateError);
    return null;
  }

  return {
    submission_id: submissionId,
    score: totalScore,
    total_points: totalPoints,
    percentage: Math.round((totalScore / totalPoints) * 100),
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
 */
export async function getQuizResult(
  submissionId: string
): Promise<QuizResult | null> {
  const supabase = await createClient();

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
  const questionMap = new Map(questions.map((q) => [q.id, q]));

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

  return {
    submission_id: submissionId,
    score: submission.score || 0,
    total_points: totalPoints,
    percentage: totalPoints > 0 ? Math.round(((submission.score || 0) / totalPoints) * 100) : 0,
    answers: (answers || []).map((a) => ({
      ...a,
      question: questionMap.get(a.question_id)!,
      selected_option: a.selected_option_id
        ? questionMap.get(a.question_id)?.options?.find((o) => o.id === a.selected_option_id)
        : undefined,
    })),
  };
}

/**
 * Check if student can take assessment (hasn't exceeded max attempts)
 */
export async function canTakeAssessment(
  assessmentId: string,
  studentId: string
): Promise<{ canTake: boolean; reason?: string; attemptCount: number }> {
  const supabase = await createClient();

  // Get assessment max attempts
  const { data: assessment } = await supabase
    .from("assessments")
    .select("max_attempts, due_date")
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

  return { canTake: true, attemptCount };
}

/**
 * Get pending submission for a student (in-progress quiz)
 */
export async function getPendingSubmission(
  assessmentId: string,
  studentId: string
): Promise<{ submissionId: string; startedAt: string } | null> {
  const supabase = await createClient();

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
