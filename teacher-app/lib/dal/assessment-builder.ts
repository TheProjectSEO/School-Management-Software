/**
 * Assessment Builder Data Access Layer (DAL)
 *
 * Client-side functions for interacting with the assessment builder API.
 * All functions return typed responses and handle errors consistently.
 */

import {
  Assessment,
  AssessmentQuestion,
  BankQuestion,
  BankRule,
  QuestionBank,
  CreateQuestionInput,
  CreateBankInput,
  UpdateBankInput,
  BankRuleInput,
  QuestionFilters,
  BankFilters,
  ImportResult,
} from '@/teacher-app/lib/types/assessment-builder';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const json = await response.json();

    if (!response.ok) {
      return { data: null, error: json.error || 'Request failed' };
    }

    return { data: json, error: null };
  } catch (error) {
    console.error('API fetch error:', error);
    return { data: null, error: 'Network error' };
  }
}

// ============================================================================
// ASSESSMENT FUNCTIONS
// ============================================================================

/**
 * Fetch assessments for teacher
 */
export async function getAssessments(params?: {
  subjectId?: string;
  type?: string;
  view?: 'templates' | 'instances';
}) {
  const searchParams = new URLSearchParams();
  if (params?.subjectId) searchParams.set('subjectId', params.subjectId);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.view) searchParams.set('view', params.view);

  const url = `/api/teacher/assessments?${searchParams.toString()}`;
  return fetchApi<{ assessments: Assessment[] }>(url);
}

/**
 * Create a new assessment template
 */
export async function createAssessment(input: {
  subjectId: string;
  type: string;
  title: string;
  instructions?: string;
  defaultSettings?: Record<string, unknown>;
  rubricTemplateId?: string;
}) {
  return fetchApi<{ assessment: Assessment }>('/api/teacher/assessments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update an assessment
 */
export async function updateAssessment(
  assessmentId: string,
  input: Partial<Assessment>
) {
  return fetchApi<{ assessment: Assessment }>(
    `/api/teacher/assessments/${assessmentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  );
}

/**
 * Publish an assessment
 */
export async function publishAssessment(assessmentId: string) {
  return fetchApi<{ success: boolean }>(
    `/api/teacher/assessments/${assessmentId}/publish`,
    { method: 'POST' }
  );
}

// ============================================================================
// ASSESSMENT QUESTIONS FUNCTIONS
// ============================================================================

/**
 * Get questions for an assessment
 */
export async function getAssessmentQuestions(assessmentId: string) {
  return fetchApi<{ questions: AssessmentQuestion[] }>(
    `/api/teacher/assessments/${assessmentId}/questions`
  );
}

/**
 * Add a question to an assessment
 */
export async function addQuestionToAssessment(
  assessmentId: string,
  input: CreateQuestionInput | { bankQuestionId: string }
) {
  return fetchApi<{ question: AssessmentQuestion }>(
    `/api/teacher/assessments/${assessmentId}/questions`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
}

/**
 * Add multiple questions to an assessment (bulk)
 */
export async function addQuestionsToAssessment(
  assessmentId: string,
  questions: CreateQuestionInput[]
) {
  return fetchApi<{ questions: AssessmentQuestion[] }>(
    `/api/teacher/assessments/${assessmentId}/questions`,
    {
      method: 'PUT',
      body: JSON.stringify({ questions }),
    }
  );
}

/**
 * Update a question in an assessment
 */
export async function updateAssessmentQuestion(
  assessmentId: string,
  questionId: string,
  input: Partial<CreateQuestionInput>
) {
  return fetchApi<{ question: AssessmentQuestion }>(
    `/api/teacher/assessments/${assessmentId}/questions/${questionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  );
}

/**
 * Delete a question from an assessment
 */
export async function deleteAssessmentQuestion(
  assessmentId: string,
  questionId: string
) {
  return fetchApi<{ success: boolean }>(
    `/api/teacher/assessments/${assessmentId}/questions`,
    {
      method: 'DELETE',
      body: JSON.stringify({ questionId }),
    }
  );
}

/**
 * Reorder questions in an assessment
 */
export async function reorderAssessmentQuestions(
  assessmentId: string,
  questionIds: string[]
) {
  return fetchApi<{ questions: AssessmentQuestion[] }>(
    `/api/teacher/assessments/${assessmentId}/reorder`,
    {
      method: 'POST',
      body: JSON.stringify({ questionIds }),
    }
  );
}

// ============================================================================
// BANK RULES FUNCTIONS
// ============================================================================

/**
 * Get bank rules for an assessment
 */
export async function getBankRules(assessmentId: string) {
  return fetchApi<{ rules: BankRule[] }>(
    `/api/teacher/assessments/${assessmentId}/bank-rules`
  );
}

/**
 * Add a bank rule to an assessment
 */
export async function addBankRule(
  assessmentId: string,
  input: BankRuleInput
) {
  return fetchApi<{ rule: BankRule }>(
    `/api/teacher/assessments/${assessmentId}/bank-rules`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
}

/**
 * Update a bank rule
 */
export async function updateBankRule(
  assessmentId: string,
  ruleId: string,
  input: Partial<BankRuleInput>
) {
  return fetchApi<{ rule: BankRule }>(
    `/api/teacher/assessments/${assessmentId}/bank-rules`,
    {
      method: 'PUT',
      body: JSON.stringify({ ruleId, ...input }),
    }
  );
}

/**
 * Delete a bank rule
 */
export async function deleteBankRule(assessmentId: string, ruleId: string) {
  return fetchApi<{ success: boolean }>(
    `/api/teacher/assessments/${assessmentId}/bank-rules`,
    {
      method: 'DELETE',
      body: JSON.stringify({ ruleId }),
    }
  );
}

// ============================================================================
// QUESTION BANK FUNCTIONS
// ============================================================================

/**
 * Get question banks for teacher
 */
export async function getQuestionBanks(filters?: BankFilters) {
  const searchParams = new URLSearchParams();
  if (filters?.subjectId) searchParams.set('subjectId', filters.subjectId);
  if (filters?.searchQuery) searchParams.set('search', filters.searchQuery);

  const url = `/api/teacher/question-banks?${searchParams.toString()}`;
  return fetchApi<{ banks: QuestionBank[] }>(url);
}

/**
 * Create a new question bank
 */
export async function createQuestionBank(input: CreateBankInput) {
  return fetchApi<{ bank: QuestionBank }>('/api/teacher/question-banks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update a question bank
 */
export async function updateQuestionBank(
  bankId: string,
  input: UpdateBankInput
) {
  return fetchApi<{ bank: QuestionBank }>(
    `/api/teacher/question-banks/${bankId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  );
}

/**
 * Delete a question bank
 */
export async function deleteQuestionBank(bankId: string) {
  return fetchApi<{ success: boolean }>(
    `/api/teacher/question-banks/${bankId}`,
    { method: 'DELETE' }
  );
}

// ============================================================================
// BANK QUESTIONS FUNCTIONS
// ============================================================================

/**
 * Get questions in a bank
 */
export async function getBankQuestions(
  bankId: string,
  filters?: QuestionFilters
) {
  const searchParams = new URLSearchParams();
  if (filters?.types?.length) searchParams.set('type', filters.types.join(','));
  if (filters?.difficulties?.length)
    searchParams.set('difficulty', filters.difficulties.join(','));
  if (filters?.tags?.length) searchParams.set('tags', filters.tags.join(','));
  if (filters?.searchQuery) searchParams.set('search', filters.searchQuery);

  const url = `/api/teacher/question-banks/${bankId}/questions?${searchParams.toString()}`;
  return fetchApi<{ questions: BankQuestion[] }>(url);
}

/**
 * Add a question to a bank
 */
export async function addQuestionToBank(
  bankId: string,
  input: CreateQuestionInput
) {
  return fetchApi<{ question: BankQuestion }>(
    `/api/teacher/question-banks/${bankId}/questions`,
    {
      method: 'POST',
      body: JSON.stringify({
        type: input.content.type,
        prompt: input.prompt,
        choices: 'options' in input.content ? input.content.options : null,
        answerKey: getAnswerKey(input.content),
        explanation: input.explanation,
        points: input.points,
        difficulty: input.difficulty,
        tags: input.tags,
      }),
    }
  );
}

/**
 * Update a question in a bank
 */
export async function updateBankQuestion(
  bankId: string,
  questionId: string,
  input: Partial<CreateQuestionInput>
) {
  return fetchApi<{ question: BankQuestion }>(
    `/api/teacher/question-banks/${bankId}/questions/${questionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  );
}

/**
 * Delete a question from a bank
 */
export async function deleteBankQuestion(bankId: string, questionId: string) {
  return fetchApi<{ success: boolean }>(
    `/api/teacher/question-banks/${bankId}/questions/${questionId}`,
    { method: 'DELETE' }
  );
}

/**
 * Import questions to a bank
 */
export async function importQuestionsToBank(
  bankId: string,
  questions: unknown[],
  format: 'csv' | 'json'
): Promise<{ data: ImportResult | null; error: string | null }> {
  return fetchApi<ImportResult>('/api/teacher/question-banks/import', {
    method: 'POST',
    body: JSON.stringify({ bankId, questions, format }),
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract answer key from question content for bank storage
 */
function getAnswerKey(content: CreateQuestionInput['content']): unknown {
  switch (content.type) {
    case 'multiple_choice_single':
    case 'multiple_choice_multi':
      return content.options.filter((o) => o.isCorrect).map((o) => o.id);
    case 'true_false':
      return content.correctAnswer;
    case 'short_answer':
      return {
        answers: content.expectedAnswers,
        caseSensitive: content.caseSensitive,
        partialMatch: content.partialMatchAllowed,
      };
    case 'essay':
      return {
        rubric: content.rubricGuidelines,
        sampleAnswer: content.sampleAnswer,
        wordLimits: {
          min: content.minWords,
          max: content.maxWords,
        },
      };
    case 'matching':
      return content.pairs;
    case 'fill_in_blank':
      return content.blanks;
    default:
      return null;
  }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS (for future use)
// ============================================================================

/**
 * Subscribe to assessment changes (placeholder for real-time updates)
 */
export function subscribeToAssessmentChanges(
  assessmentId: string,
  callback: (change: unknown) => void
) {
  // TODO: Implement Supabase Realtime subscription
  console.log('Realtime subscription not yet implemented', assessmentId, callback);
  return () => {
    // Cleanup function
  };
}
