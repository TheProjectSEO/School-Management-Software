/**
 * Teacher Grading Data Access Layer
 *
 * Handles submissions, grading workflow, rubric scoring, and grade release.
 * All queries use n8n_content_creation schema.
 */

import { createClient } from '@/lib/supabase/server';

// Types
export interface Submission {
  id: string;
  assessment_id: string;
  student_id: string;
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  attempt_no: number;
  submitted_at?: string;
  graded_at?: string;
  graded_by?: string;
  score?: number;
  max_score?: number;
  feedback_released: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  student_name?: string;
  assessment_title?: string;
  assessment_type?: string;
}

export interface SubmissionVersion {
  id: string;
  submission_id: string;
  version_no: number;
  payload_json?: Record<string, unknown>;
  file_paths_json?: string[];
  created_at: string;
}

export interface RubricTemplate {
  id: string;
  title: string;
  scope_subject_id?: string;
  criteria_json: RubricCriterion[];
  levels_json: RubricLevel[];
  created_by: string;
  created_at: string;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  weight?: number;
}

export interface RubricLevel {
  id: string;
  name: string;
  score: number;
  description?: string;
}

export interface RubricScore {
  id: string;
  submission_id: string;
  rubric_template_id: string;
  scores_json: Record<string, number>; // criterion_id -> level_score
  total_score: number;
  graded_by: string;
  graded_at: string;
}

export interface GradeSubmissionInput {
  submission_id: string;
  score: number;
  max_score: number;
  graded_by: string;
}

export interface ApplyRubricScoreInput {
  submission_id: string;
  rubric_id: string;
  scores: Record<string, number>; // criterion_id -> level_score
  graded_by: string;
}

export interface Feedback {
  id: string;
  submission_id: string;
  teacher_comment?: string;
  inline_notes_json?: Record<string, unknown>;
  is_released: boolean;
  released_at?: string;
  released_by?: string;
  created_by: string;
  created_at: string;
}

export interface CreateFeedbackInput {
  submission_id: string;
  teacher_comment?: string;
  inline_notes_json?: Record<string, unknown>;
  created_by: string;
}

/**
 * Get pending submissions for a teacher (grading inbox)
 * Returns submissions needing review across all teacher's assessments
 */
export async function getPendingSubmissions(teacherId: string): Promise<Submission[]> {
  try {
    const supabase = await createClient();

    // Get all section_subject_ids for this teacher
    const { data: assignments } = await supabase
      .from('section_subjects')
      .select('id')
      .eq('teacher_id', teacherId);

    if (!assignments || assignments.length === 0) {
      return [];
    }

    const sectionSubjectIds = assignments.map(a => a.id);

    // Get submissions for assessments in these sections
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        assessments (
          id,
          title,
          type,
          section_subject_id
        ),
        student_profiles (
          first_name,
          last_name
        )
      `)
      .in('assessments.section_subject_id', sectionSubjectIds)
      .in('status', ['submitted'])
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending submissions:', error);
      return [];
    }

    return (data || []).map((sub: any) => ({
      ...sub,
      student_name: `${sub.student_profiles?.first_name || ''} ${sub.student_profiles?.last_name || ''}`.trim(),
      assessment_title: sub.assessments?.title,
      assessment_type: sub.assessments?.type
    })) as Submission[];
  } catch (error) {
    console.error('Unexpected error in getPendingSubmissions:', error);
    return [];
  }
}

/**
 * Get submission details including versions
 */
export async function getSubmission(submissionId: string): Promise<Submission | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        assessments (
          id,
          title,
          type,
          instructions,
          rubric_template_id
        ),
        student_profiles (
          first_name,
          last_name,
          email
        ),
        submission_versions (
          id,
          version_no,
          payload_json,
          file_paths_json,
          created_at
        )
      `)
      .eq('id', submissionId)
      .single();

    if (error) {
      console.error('Error fetching submission:', error);
      return null;
    }

    return {
      ...data,
      student_name: `${data.student_profiles?.first_name || ''} ${data.student_profiles?.last_name || ''}`.trim(),
      assessment_title: data.assessments?.title,
      assessment_type: data.assessments?.type
    } as Submission;
  } catch (error) {
    console.error('Unexpected error in getSubmission:', error);
    return null;
  }
}

/**
 * Grade a submission (apply score)
 */
export async function gradeSubmission(input: GradeSubmissionInput): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('submissions')
      .update({
        status: 'graded',
        score: input.score,
        max_score: input.max_score,
        graded_by: input.graded_by,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', input.submission_id);

    if (error) {
      console.error('Error grading submission:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in gradeSubmission:', error);
    return false;
  }
}

/**
 * Apply rubric scoring to a submission
 * Calculates total score from criterion scores
 */
export async function applyRubricScore(input: ApplyRubricScoreInput): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get rubric template to calculate total
    const { data: rubric } = await supabase
      .from('rubric_templates')
      .select('*')
      .eq('id', input.rubric_id)
      .single();

    if (!rubric) {
      console.error('Rubric template not found');
      return false;
    }

    // Calculate total score
    const totalScore = Object.values(input.scores).reduce((sum, score) => sum + score, 0);

    // Save rubric score
    const { error: scoreError } = await supabase
      .from('rubric_scores')
      .insert({
        submission_id: input.submission_id,
        rubric_template_id: input.rubric_id,
        scores_json: input.scores,
        total_score: totalScore,
        graded_by: input.graded_by,
        graded_at: new Date().toISOString()
      });

    if (scoreError) {
      console.error('Error saving rubric score:', scoreError);
      return false;
    }

    // Update submission status and score
    const { error: submissionError } = await supabase
      .from('submissions')
      .update({
        status: 'graded',
        score: totalScore,
        graded_by: input.graded_by,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', input.submission_id);

    if (submissionError) {
      console.error('Error updating submission:', submissionError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in applyRubricScore:', error);
    return false;
  }
}

/**
 * Release grades for all submissions of an assessment
 * Sets feedback_released=true for all graded submissions
 */
export async function releaseGrades(
  assessmentId: string,
  releasedBy: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Update all graded submissions
    const { error: submissionError } = await supabase
      .from('submissions')
      .update({
        feedback_released: true,
        updated_at: new Date().toISOString()
      })
      .eq('assessment_id', assessmentId)
      .eq('status', 'graded');

    if (submissionError) {
      console.error('Error releasing submission grades:', submissionError);
      return false;
    }

    // Get graded submission IDs first
    const { data: gradedSubmissions } = await supabase
      .from('submissions')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('status', 'graded');

    const submissionIds = (gradedSubmissions || []).map(s => s.id);

    if (submissionIds.length === 0) {
      return true; // No submissions to release
    }

    // Release all feedback for these submissions
    const { error: feedbackError } = await supabase
      .from('feedback')
      .update({
        is_released: true,
        released_at: new Date().toISOString(),
        released_by: releasedBy
      })
      .in('submission_id', submissionIds);

    if (feedbackError) {
      console.error('Error releasing feedback:', feedbackError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in releaseGrades:', error);
    return false;
  }
}

/**
 * Create feedback for a submission
 * Starts as unreleased (is_released=false)
 */
export async function createFeedback(input: CreateFeedbackInput): Promise<Feedback | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        submission_id: input.submission_id,
        teacher_comment: input.teacher_comment,
        inline_notes_json: input.inline_notes_json,
        is_released: false,
        created_by: input.created_by,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feedback:', error);
      return null;
    }

    return data as Feedback;
  } catch (error) {
    console.error('Unexpected error in createFeedback:', error);
    return null;
  }
}

/**
 * Get rubric templates for a subject
 */
export async function getRubricTemplates(subjectId: string): Promise<RubricTemplate[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rubric_templates')
      .select('*')
      .or(`scope_subject_id.eq.${subjectId},scope_subject_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rubric templates:', error);
      return [];
    }

    return data as RubricTemplate[];
  } catch (error) {
    console.error('Unexpected error in getRubricTemplates:', error);
    return [];
  }
}

/**
 * Get rubric score for a submission
 */
export async function getSubmissionRubricScore(
  submissionId: string
): Promise<RubricScore | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rubric_scores')
      .select('*')
      .eq('submission_id', submissionId)
      .order('graded_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching rubric score:', error);
      return null;
    }

    return data as RubricScore;
  } catch (error) {
    console.error('Unexpected error in getSubmissionRubricScore:', error);
    return null;
  }
}
