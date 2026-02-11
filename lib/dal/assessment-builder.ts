/**
 * Assessment Builder Data Access Layer (DAL)
 *
 * Client-side functions for interacting with the assessment builder API.
 * All functions return typed responses and handle errors consistently.
 */

import {
  Assessment,
  AssessmentQuestion,
  CreateQuestionInput,
} from '@/lib/types/assessment-builder';

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
  input: CreateQuestionInput
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
