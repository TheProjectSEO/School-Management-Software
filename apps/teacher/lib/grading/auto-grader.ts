/**
 * Auto-Grading Logic for MSU School Management Software
 * Handles automatic grading of various question types
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// Types
// ============================================

export type QuestionType =
  | 'multiple_choice_single'
  | 'multiple_choice_multi'
  | 'true_false'
  | 'short_answer'
  | 'matching'
  | 'fill_in_blank'
  | 'essay'
  | 'ordering'

export type GradingType = 'all_or_nothing' | 'partial_credit'

export interface AnswerKeyMultipleChoiceSingle {
  type: 'multiple_choice_single'
  correct_id: string
}

export interface AnswerKeyMultipleChoiceMulti {
  type: 'multiple_choice_multi'
  correct_ids: string[]
  grading_type?: GradingType
}

export interface AnswerKeyTrueFalse {
  type: 'true_false'
  correct_value: boolean
}

export interface AnswerKeyShortAnswer {
  type: 'short_answer'
  acceptable_answers: string[]
  case_sensitive?: boolean
  trim_whitespace?: boolean
}

export interface AnswerKeyMatching {
  type: 'matching'
  pairs: { left_id: string; right_id: string }[]
  grading_type?: GradingType
}

export interface AnswerKeyFillInBlank {
  type: 'fill_in_blank'
  blanks: {
    position: number
    acceptable_answers: string[]
    case_sensitive?: boolean
  }[]
  grading_type?: GradingType
}

export interface AnswerKeyOrdering {
  type: 'ordering'
  correct_order: string[]
  grading_type?: GradingType
}

export interface AnswerKeyEssay {
  type: 'essay'
  rubric?: {
    criteria: { name: string; max_points: number; description: string }[]
  }
}

export type AnswerKey =
  | AnswerKeyMultipleChoiceSingle
  | AnswerKeyMultipleChoiceMulti
  | AnswerKeyTrueFalse
  | AnswerKeyShortAnswer
  | AnswerKeyMatching
  | AnswerKeyFillInBlank
  | AnswerKeyOrdering
  | AnswerKeyEssay

export interface AutoGradeResult {
  questionId: string
  isAutoGradable: boolean
  pointsAwarded: number | null
  maxPoints: number
  feedback?: string
  needsManualReview: boolean
  details?: {
    correctCount?: number
    totalCount?: number
    incorrectItems?: string[]
  }
}

export interface SubmissionGradeResult {
  submissionId: string
  totalPoints: number
  maxPoints: number
  autoGradedCount: number
  pendingManualCount: number
  results: AutoGradeResult[]
}

export interface StudentResponse {
  questionId: string
  questionType: QuestionType
  response: string | string[] | { [key: string]: string } | boolean | null
  maxPoints: number
  answerKey: AnswerKey | null
}

// ============================================
// Helper Functions
// ============================================

/**
 * Rounds a number to the nearest 0.5
 */
function roundToHalf(num: number): number {
  return Math.round(num * 2) / 2
}

/**
 * Normalizes text for comparison (trim and lowercase unless case sensitive)
 */
function normalizeText(text: string, caseSensitive: boolean = false, trimWhitespace: boolean = true): string {
  let result = text
  if (trimWhitespace) {
    result = result.trim()
  }
  if (!caseSensitive) {
    result = result.toLowerCase()
  }
  return result
}

/**
 * Parses a student response that might be stored as JSON string
 */
function parseResponse(response: string | string[] | { [key: string]: string } | boolean | null): any {
  if (response === null || response === undefined) return null
  if (typeof response !== 'string') return response

  try {
    return JSON.parse(response)
  } catch {
    return response
  }
}

// ============================================
// Auto-Grading Functions for Each Question Type
// ============================================

/**
 * Grade a multiple choice single answer question
 */
function gradeMultipleChoiceSingle(
  studentResponse: string | null,
  answerKey: AnswerKeyMultipleChoiceSingle,
  maxPoints: number
): AutoGradeResult {
  if (!studentResponse) {
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: 0,
      maxPoints,
      feedback: 'No answer provided.',
      needsManualReview: false
    }
  }

  const isCorrect = studentResponse === answerKey.correct_id

  return {
    questionId: '',
    isAutoGradable: true,
    pointsAwarded: isCorrect ? maxPoints : 0,
    maxPoints,
    feedback: isCorrect ? 'Correct!' : 'Incorrect.',
    needsManualReview: false
  }
}

/**
 * Grade a multiple choice multiple answer question
 */
function gradeMultipleChoiceMulti(
  studentResponse: string[] | string | null,
  answerKey: AnswerKeyMultipleChoiceMulti,
  maxPoints: number,
  gradingType: GradingType = 'partial_credit'
): AutoGradeResult {
  let selected: string[] = []

  if (studentResponse) {
    if (Array.isArray(studentResponse)) {
      selected = studentResponse
    } else if (typeof studentResponse === 'string') {
      // Try to parse as JSON array
      const parsed = parseResponse(studentResponse)
      selected = Array.isArray(parsed) ? parsed : [studentResponse]
    }
  }

  const correctSet = new Set(answerKey.correct_ids)
  const selectedSet = new Set(selected)

  // Count correct selections and incorrect selections
  let correctCount = 0
  let incorrectCount = 0
  const incorrectItems: string[] = []

  for (const id of selected) {
    if (correctSet.has(id)) {
      correctCount++
    } else {
      incorrectCount++
      incorrectItems.push(id)
    }
  }

  // Count missed correct answers
  const missedCount = answerKey.correct_ids.length - correctCount

  if (gradingType === 'all_or_nothing') {
    const isFullyCorrect = correctCount === answerKey.correct_ids.length && incorrectCount === 0
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: isFullyCorrect ? maxPoints : 0,
      maxPoints,
      feedback: isFullyCorrect ? 'Correct!' : `Incorrect. You got ${correctCount} of ${answerKey.correct_ids.length} correct answers.`,
      needsManualReview: false,
      details: {
        correctCount,
        totalCount: answerKey.correct_ids.length,
        incorrectItems
      }
    }
  }

  // Partial credit: (correct - wrong) / total, minimum 0
  const rawScore = Math.max(0, correctCount - incorrectCount) / answerKey.correct_ids.length
  const points = roundToHalf(rawScore * maxPoints)

  return {
    questionId: '',
    isAutoGradable: true,
    pointsAwarded: points,
    maxPoints,
    feedback: points === maxPoints
      ? 'Correct!'
      : `Partial credit: ${correctCount} correct, ${incorrectCount} incorrect out of ${answerKey.correct_ids.length} options.`,
    needsManualReview: false,
    details: {
      correctCount,
      totalCount: answerKey.correct_ids.length,
      incorrectItems
    }
  }
}

/**
 * Grade a true/false question
 */
function gradeTrueFalse(
  studentResponse: boolean | string | null,
  answerKey: AnswerKeyTrueFalse,
  maxPoints: number
): AutoGradeResult {
  if (studentResponse === null || studentResponse === undefined) {
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: 0,
      maxPoints,
      feedback: 'No answer provided.',
      needsManualReview: false
    }
  }

  // Handle string responses
  let boolResponse: boolean
  if (typeof studentResponse === 'string') {
    boolResponse = studentResponse.toLowerCase() === 'true'
  } else {
    boolResponse = Boolean(studentResponse)
  }

  const isCorrect = boolResponse === answerKey.correct_value

  return {
    questionId: '',
    isAutoGradable: true,
    pointsAwarded: isCorrect ? maxPoints : 0,
    maxPoints,
    feedback: isCorrect ? 'Correct!' : 'Incorrect.',
    needsManualReview: false
  }
}

/**
 * Grade a short answer question
 */
function gradeShortAnswer(
  studentResponse: string | null,
  answerKey: AnswerKeyShortAnswer,
  maxPoints: number
): AutoGradeResult {
  if (!studentResponse || studentResponse.trim() === '') {
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: 0,
      maxPoints,
      feedback: 'No answer provided.',
      needsManualReview: false
    }
  }

  const caseSensitive = answerKey.case_sensitive ?? false
  const trimWhitespace = answerKey.trim_whitespace ?? true

  const normalizedResponse = normalizeText(studentResponse, caseSensitive, trimWhitespace)

  const isCorrect = answerKey.acceptable_answers.some(answer =>
    normalizeText(answer, caseSensitive, trimWhitespace) === normalizedResponse
  )

  return {
    questionId: '',
    isAutoGradable: true,
    pointsAwarded: isCorrect ? maxPoints : 0,
    maxPoints,
    feedback: isCorrect ? 'Correct!' : 'Incorrect. Your answer did not match any acceptable answers.',
    needsManualReview: false
  }
}

/**
 * Grade a matching question
 */
function gradeMatching(
  studentResponse: { [leftId: string]: string } | string | null,
  answerKey: AnswerKeyMatching,
  maxPoints: number,
  gradingType: GradingType = 'partial_credit'
): AutoGradeResult {
  if (!studentResponse) {
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: 0,
      maxPoints,
      feedback: 'No answer provided.',
      needsManualReview: false
    }
  }

  let matches: { [leftId: string]: string }
  if (typeof studentResponse === 'string') {
    const parsed = parseResponse(studentResponse)
    matches = typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } else {
    matches = studentResponse
  }

  // Create a map of correct pairs
  const correctMap = new Map<string, string>()
  for (const pair of answerKey.pairs) {
    correctMap.set(pair.left_id, pair.right_id)
  }

  let correctCount = 0
  const incorrectItems: string[] = []

  for (const [leftId, rightId] of Object.entries(matches)) {
    if (correctMap.get(leftId) === rightId) {
      correctCount++
    } else {
      incorrectItems.push(leftId)
    }
  }

  const totalPairs = answerKey.pairs.length

  if (gradingType === 'all_or_nothing') {
    const isFullyCorrect = correctCount === totalPairs
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: isFullyCorrect ? maxPoints : 0,
      maxPoints,
      feedback: isFullyCorrect ? 'All matches correct!' : `Incorrect. You got ${correctCount} of ${totalPairs} matches correct.`,
      needsManualReview: false,
      details: { correctCount, totalCount: totalPairs, incorrectItems }
    }
  }

  // Partial credit
  const points = roundToHalf((correctCount / totalPairs) * maxPoints)

  return {
    questionId: '',
    isAutoGradable: true,
    pointsAwarded: points,
    maxPoints,
    feedback: points === maxPoints
      ? 'All matches correct!'
      : `${correctCount} of ${totalPairs} matches correct.`,
    needsManualReview: false,
    details: { correctCount, totalCount: totalPairs, incorrectItems }
  }
}

/**
 * Grade a fill-in-the-blank question
 */
function gradeFillInBlank(
  studentResponse: string[] | string | null,
  answerKey: AnswerKeyFillInBlank,
  maxPoints: number,
  gradingType: GradingType = 'partial_credit'
): AutoGradeResult {
  if (!studentResponse) {
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: 0,
      maxPoints,
      feedback: 'No answer provided.',
      needsManualReview: false
    }
  }

  let answers: string[]
  if (Array.isArray(studentResponse)) {
    answers = studentResponse
  } else if (typeof studentResponse === 'string') {
    const parsed = parseResponse(studentResponse)
    answers = Array.isArray(parsed) ? parsed : [studentResponse]
  } else {
    answers = []
  }

  let correctCount = 0
  const incorrectItems: string[] = []
  const totalBlanks = answerKey.blanks.length

  for (const blank of answerKey.blanks) {
    const studentAnswer = answers[blank.position] ?? ''
    const caseSensitive = blank.case_sensitive ?? false
    const normalizedStudent = normalizeText(studentAnswer, caseSensitive)

    const isCorrect = blank.acceptable_answers.some(
      acceptable => normalizeText(acceptable, caseSensitive) === normalizedStudent
    )

    if (isCorrect) {
      correctCount++
    } else {
      incorrectItems.push(`Blank ${blank.position + 1}`)
    }
  }

  if (gradingType === 'all_or_nothing') {
    const isFullyCorrect = correctCount === totalBlanks
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: isFullyCorrect ? maxPoints : 0,
      maxPoints,
      feedback: isFullyCorrect ? 'All blanks correct!' : `Incorrect. You got ${correctCount} of ${totalBlanks} blanks correct.`,
      needsManualReview: false,
      details: { correctCount, totalCount: totalBlanks, incorrectItems }
    }
  }

  // Partial credit
  const points = roundToHalf((correctCount / totalBlanks) * maxPoints)

  return {
    questionId: '',
    isAutoGradable: true,
    pointsAwarded: points,
    maxPoints,
    feedback: points === maxPoints
      ? 'All blanks correct!'
      : `${correctCount} of ${totalBlanks} blanks correct.`,
    needsManualReview: false,
    details: { correctCount, totalCount: totalBlanks, incorrectItems }
  }
}

/**
 * Grade an ordering question
 */
function gradeOrdering(
  studentResponse: string[] | string | null,
  answerKey: AnswerKeyOrdering,
  maxPoints: number,
  gradingType: GradingType = 'partial_credit'
): AutoGradeResult {
  if (!studentResponse) {
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: 0,
      maxPoints,
      feedback: 'No answer provided.',
      needsManualReview: false
    }
  }

  let order: string[]
  if (Array.isArray(studentResponse)) {
    order = studentResponse
  } else if (typeof studentResponse === 'string') {
    const parsed = parseResponse(studentResponse)
    order = Array.isArray(parsed) ? parsed : []
  } else {
    order = []
  }

  const correctOrder = answerKey.correct_order
  let correctCount = 0
  const incorrectItems: string[] = []

  for (let i = 0; i < correctOrder.length; i++) {
    if (order[i] === correctOrder[i]) {
      correctCount++
    } else {
      incorrectItems.push(`Position ${i + 1}`)
    }
  }

  const totalItems = correctOrder.length

  if (gradingType === 'all_or_nothing') {
    const isFullyCorrect = correctCount === totalItems
    return {
      questionId: '',
      isAutoGradable: true,
      pointsAwarded: isFullyCorrect ? maxPoints : 0,
      maxPoints,
      feedback: isFullyCorrect ? 'Perfect order!' : `Incorrect order. ${correctCount} of ${totalItems} items in correct position.`,
      needsManualReview: false,
      details: { correctCount, totalCount: totalItems, incorrectItems }
    }
  }

  // Partial credit
  const points = roundToHalf((correctCount / totalItems) * maxPoints)

  return {
    questionId: '',
    isAutoGradable: true,
    pointsAwarded: points,
    maxPoints,
    feedback: points === maxPoints
      ? 'Perfect order!'
      : `${correctCount} of ${totalItems} items in correct position.`,
    needsManualReview: false,
    details: { correctCount, totalCount: totalItems, incorrectItems }
  }
}

/**
 * Returns result for essay questions (always needs manual review)
 */
function gradeEssay(maxPoints: number): AutoGradeResult {
  return {
    questionId: '',
    isAutoGradable: false,
    pointsAwarded: null,
    maxPoints,
    feedback: 'This essay question requires manual grading.',
    needsManualReview: true
  }
}

// ============================================
// Main Auto-Grading Functions
// ============================================

/**
 * Auto-grade a single question response
 */
export function autoGradeQuestion(
  questionType: QuestionType | string,
  studentResponse: string | string[] | { [key: string]: string } | boolean | null,
  answerKey: AnswerKey | null,
  maxPoints: number,
  gradingType: GradingType = 'partial_credit'
): AutoGradeResult {
  // If no answer key, needs manual review
  if (!answerKey) {
    return {
      questionId: '',
      isAutoGradable: false,
      pointsAwarded: null,
      maxPoints,
      feedback: 'No answer key available. Manual grading required.',
      needsManualReview: true
    }
  }

  // Parse the response if it's a JSON string
  const parsedResponse = parseResponse(studentResponse)

  switch (questionType) {
    case 'multiple_choice_single':
      return gradeMultipleChoiceSingle(
        parsedResponse as string | null,
        answerKey as AnswerKeyMultipleChoiceSingle,
        maxPoints
      )

    case 'multiple_choice_multi':
      return gradeMultipleChoiceMulti(
        parsedResponse as string[] | string | null,
        answerKey as AnswerKeyMultipleChoiceMulti,
        maxPoints,
        (answerKey as AnswerKeyMultipleChoiceMulti).grading_type ?? gradingType
      )

    case 'true_false':
      return gradeTrueFalse(
        parsedResponse as boolean | string | null,
        answerKey as AnswerKeyTrueFalse,
        maxPoints
      )

    case 'short_answer':
      return gradeShortAnswer(
        parsedResponse as string | null,
        answerKey as AnswerKeyShortAnswer,
        maxPoints
      )

    case 'matching':
      return gradeMatching(
        parsedResponse as { [leftId: string]: string } | string | null,
        answerKey as AnswerKeyMatching,
        maxPoints,
        (answerKey as AnswerKeyMatching).grading_type ?? gradingType
      )

    case 'fill_in_blank':
      return gradeFillInBlank(
        parsedResponse as string[] | string | null,
        answerKey as AnswerKeyFillInBlank,
        maxPoints,
        (answerKey as AnswerKeyFillInBlank).grading_type ?? gradingType
      )

    case 'ordering':
      return gradeOrdering(
        parsedResponse as string[] | string | null,
        answerKey as AnswerKeyOrdering,
        maxPoints,
        (answerKey as AnswerKeyOrdering).grading_type ?? gradingType
      )

    case 'essay':
      return gradeEssay(maxPoints)

    default:
      return {
        questionId: '',
        isAutoGradable: false,
        pointsAwarded: null,
        maxPoints,
        feedback: `Unknown question type: ${questionType}. Manual grading required.`,
        needsManualReview: true
      }
  }
}

/**
 * Auto-grade an entire submission
 */
export async function autoGradeSubmission(submissionId: string): Promise<SubmissionGradeResult> {
  const supabase = await createClient()

  // Get submission with assessment questions
  const { data: submission, error: submissionError } = await supabase
    .from('submissions')
    .select(`
      id,
      assessment_id,
      student_id,
      status
    `)
    .eq('id', submissionId)
    .single()

  if (submissionError || !submission) {
    console.error('Error fetching submission:', submissionError)
    return {
      submissionId,
      totalPoints: 0,
      maxPoints: 0,
      autoGradedCount: 0,
      pendingManualCount: 0,
      results: []
    }
  }

  // Get assessment questions with answer keys
  const { data: questions, error: questionsError } = await supabase
    .from('teacher_assessment_questions')
    .select('*')
    .eq('assessment_id', submission.assessment_id)
    .order('order_index', { ascending: true })

  if (questionsError || !questions) {
    console.error('Error fetching questions:', questionsError)
    return {
      submissionId,
      totalPoints: 0,
      maxPoints: 0,
      autoGradedCount: 0,
      pendingManualCount: 0,
      results: []
    }
  }

  // Get student answers - try different table names as the schema might vary
  const { data: studentAnswers, error: answersError } = await supabase
    .from('student_answers')
    .select('*')
    .eq('submission_id', submissionId)

  // If student_answers doesn't exist, check for responses stored differently
  let answerMap = new Map<string, any>()
  if (!answersError && studentAnswers) {
    for (const answer of studentAnswers) {
      answerMap.set(answer.question_id, answer)
    }
  }

  const results: AutoGradeResult[] = []
  let totalPoints = 0
  let maxPoints = 0
  let autoGradedCount = 0
  let pendingManualCount = 0
  const questionsForManualQueue: { questionId: string; response: string; maxPoints: number; questionText: string; questionType: string }[] = []

  for (const question of questions) {
    const studentAnswer = answerMap.get(question.id)
    const response = studentAnswer?.selected_option_id || studentAnswer?.text_answer || null
    const answerKey = question.answer_key_json as AnswerKey | null

    const result = autoGradeQuestion(
      question.question_type,
      response,
      answerKey,
      question.points || 1,
      'partial_credit'
    )

    result.questionId = question.id
    results.push(result)

    maxPoints += question.points || 1

    if (result.isAutoGradable && result.pointsAwarded !== null) {
      totalPoints += result.pointsAwarded
      autoGradedCount++

      // Update student answer with grading result if answer exists
      if (studentAnswer) {
        await supabase
          .from('student_answers')
          .update({
            is_correct: result.pointsAwarded === question.points,
            points_earned: result.pointsAwarded
          })
          .eq('id', studentAnswer.id)
      }
    } else {
      pendingManualCount++
      questionsForManualQueue.push({
        questionId: question.id,
        response: response || '',
        maxPoints: question.points || 1,
        questionText: question.question_text || '',
        questionType: question.question_type || 'essay'
      })
    }
  }

  // Queue items for manual grading
  if (questionsForManualQueue.length > 0) {
    await queueForManualGrading(
      submissionId,
      questionsForManualQueue
    )
  }

  // Update submission with auto-graded score (partial if some need manual)
  const newStatus = pendingManualCount > 0 ? 'pending_review' : 'graded'

  await supabase
    .from('submissions')
    .update({
      score: totalPoints,
      status: newStatus,
      graded_at: pendingManualCount === 0 ? new Date().toISOString() : null
    })
    .eq('id', submissionId)

  return {
    submissionId,
    totalPoints,
    maxPoints,
    autoGradedCount,
    pendingManualCount,
    results
  }
}

/**
 * Queue items that need manual grading
 */
export async function queueForManualGrading(
  submissionId: string,
  questions: {
    questionId: string
    response: string
    maxPoints: number
    questionText?: string
    questionType?: string
    rubricJson?: any
  }[]
): Promise<number> {
  const supabase = await createClient()

  let queuedCount = 0

  for (const q of questions) {
    // Check if already in queue
    const { data: existing } = await supabase
      .from('teacher_grading_queue')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('question_id', q.questionId)
      .single()

    if (existing) {
      continue // Already queued
    }

    const { error } = await supabase
      .from('teacher_grading_queue')
      .insert({
        submission_id: submissionId,
        question_id: q.questionId,
        question_type: q.questionType || 'essay',
        question_text: q.questionText || '',
        student_response: q.response,
        max_points: q.maxPoints,
        rubric_json: q.rubricJson || null,
        status: 'pending',
        priority: q.questionType === 'essay' ? 1 : 0 // Essays get higher priority
      })

    if (!error) {
      queuedCount++
    } else {
      console.error('Error queueing for manual grading:', error)
    }
  }

  return queuedCount
}

/**
 * Process a newly submitted assessment - auto-grade and queue manual items
 */
export async function processSubmission(submissionId: string): Promise<{
  autoGradedPoints: number
  pendingManual: number
  totalPossible: number
}> {
  const result = await autoGradeSubmission(submissionId)

  return {
    autoGradedPoints: result.totalPoints,
    pendingManual: result.pendingManualCount,
    totalPossible: result.maxPoints
  }
}

/**
 * Re-grade a submission (useful after answer key changes)
 */
export async function regradeSubmission(submissionId: string): Promise<SubmissionGradeResult> {
  const supabase = await createClient()

  // Clear existing grading queue items for this submission
  await supabase
    .from('teacher_grading_queue')
    .delete()
    .eq('submission_id', submissionId)
    .eq('status', 'pending')

  // Re-run auto-grading
  return autoGradeSubmission(submissionId)
}
