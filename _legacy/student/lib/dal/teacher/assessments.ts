/**
 * Teacher Assessments Data Access Layer
 *
 * Handles question banks, assessments, and quiz snapshot generation.
 * All queries use n8n_content_creation schema.
 */

import { createClient } from '@/lib/supabase/server';

// Types
export interface QuestionBank {
  id: string;
  subject_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  question_count?: number;
}

export interface CreateQuestionBankInput {
  subject_id: string;
  name: string;
  description?: string;
  created_by: string;
}

export interface Question {
  id: string;
  bank_id: string;
  type: 'mcq' | 'true_false' | 'short_answer' | 'essay' | 'coding';
  prompt: string;
  choices_json?: Record<string, unknown>;
  answer_key_json?: Record<string, unknown>;
  tags_json?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  points?: number;
  created_by: string;
  created_at: string;
}

export interface AddQuestionInput {
  bank_id: string;
  type: 'mcq' | 'true_false' | 'short_answer' | 'essay' | 'coding';
  prompt: string;
  choices_json?: Record<string, unknown>;
  answer_key_json?: Record<string, unknown>;
  tags_json?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  points?: number;
  created_by: string;
}

export interface Assessment {
  id: string;
  subject_id?: string;
  section_subject_id?: string;
  type: 'quiz' | 'assignment' | 'project' | 'midterm' | 'final';
  title: string;
  instructions?: string;
  settings_json?: Record<string, unknown>;
  rubric_template_id?: string;
  open_at?: string;
  close_at?: string;
  time_limit?: number; // minutes
  attempts_allowed?: number;
  allow_resubmission: boolean;
  status: 'draft' | 'published' | 'closed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAssessmentInput {
  subject_id?: string;
  section_subject_id?: string;
  type: 'quiz' | 'assignment' | 'project' | 'midterm' | 'final';
  title: string;
  instructions?: string;
  settings_json?: Record<string, unknown>;
  rubric_template_id?: string;
  open_at?: string;
  close_at?: string;
  time_limit?: number;
  attempts_allowed?: number;
  allow_resubmission?: boolean;
  created_by: string;
}

export interface BankRule {
  id: string;
  assessment_id: string;
  bank_id: string;
  pick_count: number;
  tag_filter_json?: string[];
  shuffle_questions: boolean;
  shuffle_choices: boolean;
  seed_mode: 'fixed' | 'per_student' | 'per_attempt';
  created_at: string;
}

export interface AddBankRuleInput {
  assessment_id: string;
  bank_id: string;
  pick_count: number;
  tag_filter_json?: string[];
  shuffle_questions?: boolean;
  shuffle_choices?: boolean;
  seed_mode?: 'fixed' | 'per_student' | 'per_attempt';
}

export interface QuizSnapshot {
  id: string;
  assessment_id: string;
  student_id: string;
  questions_json: Record<string, unknown>[];
  seed_value: string;
  created_at: string;
}

/**
 * Get all question banks for a course/subject
 */
export async function getQuestionBanks(subjectId: string): Promise<QuestionBank[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('question_banks')
      .select(`
        *,
        questions (count)
      `)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching question banks:', error);
      return [];
    }

    return (data || []).map((bank: any) => ({
      ...bank,
      question_count: bank.questions?.[0]?.count || 0
    })) as QuestionBank[];
  } catch (error) {
    console.error('Unexpected error in getQuestionBanks:', error);
    return [];
  }
}

/**
 * Create a new question bank
 */
export async function createQuestionBank(
  input: CreateQuestionBankInput
): Promise<QuestionBank | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('question_banks')
      .insert({
        subject_id: input.subject_id,
        name: input.name,
        description: input.description,
        created_by: input.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating question bank:', error);
      return null;
    }

    return data as QuestionBank;
  } catch (error) {
    console.error('Unexpected error in createQuestionBank:', error);
    return null;
  }
}

/**
 * Add a question to a bank
 */
export async function addQuestionToBank(input: AddQuestionInput): Promise<Question | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('questions')
      .insert({
        bank_id: input.bank_id,
        type: input.type,
        prompt: input.prompt,
        choices_json: input.choices_json,
        answer_key_json: input.answer_key_json,
        tags_json: input.tags_json,
        difficulty: input.difficulty,
        points: input.points || 1,
        created_by: input.created_by,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding question to bank:', error);
      return null;
    }

    return data as Question;
  } catch (error) {
    console.error('Unexpected error in addQuestionToBank:', error);
    return null;
  }
}

/**
 * Create an assessment (template or instance)
 */
export async function createAssessment(input: CreateAssessmentInput): Promise<Assessment | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        subject_id: input.subject_id,
        section_subject_id: input.section_subject_id,
        type: input.type,
        title: input.title,
        instructions: input.instructions,
        settings_json: input.settings_json,
        rubric_template_id: input.rubric_template_id,
        open_at: input.open_at,
        close_at: input.close_at,
        time_limit: input.time_limit,
        attempts_allowed: input.attempts_allowed || 1,
        allow_resubmission: input.allow_resubmission || false,
        status: 'draft',
        created_by: input.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assessment:', error);
      return null;
    }

    return data as Assessment;
  } catch (error) {
    console.error('Unexpected error in createAssessment:', error);
    return null;
  }
}

/**
 * Add question bank rules to an assessment
 * Defines randomization behavior
 */
export async function addBankRules(
  assessmentId: string,
  rules: AddBankRuleInput[]
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const records = rules.map(rule => ({
      assessment_id: assessmentId,
      bank_id: rule.bank_id,
      pick_count: rule.pick_count,
      tag_filter_json: rule.tag_filter_json,
      shuffle_questions: rule.shuffle_questions ?? true,
      shuffle_choices: rule.shuffle_choices ?? true,
      seed_mode: rule.seed_mode || 'per_student',
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('assessment_bank_rules')
      .insert(records);

    if (error) {
      console.error('Error adding bank rules:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in addBankRules:', error);
    return false;
  }
}

/**
 * Generate a quiz snapshot for a student
 * Applies randomization rules and saves selected questions
 */
export async function generateQuizSnapshot(
  assessmentId: string,
  studentId: string
): Promise<QuizSnapshot | null> {
  try {
    const supabase = await createClient();

    // Get bank rules for this assessment
    const { data: rules, error: rulesError } = await supabase
      .from('assessment_bank_rules')
      .select('*')
      .eq('assessment_id', assessmentId);

    if (rulesError || !rules || rules.length === 0) {
      console.error('Error fetching bank rules:', rulesError);
      return null;
    }

    // For each rule, pick questions from the bank
    const selectedQuestions: any[] = [];

    for (const rule of rules) {
      let query = supabase
        .from('questions')
        .select('*')
        .eq('bank_id', rule.bank_id);

      // Apply tag filter if specified
      if (rule.tag_filter_json && Array.isArray(rule.tag_filter_json)) {
        query = query.contains('tags_json', rule.tag_filter_json);
      }

      const { data: questions } = await query;

      if (!questions || questions.length === 0) continue;

      // Generate seed based on seed_mode
      let seed: string;
      if (rule.seed_mode === 'fixed') {
        seed = `${assessmentId}`;
      } else if (rule.seed_mode === 'per_student') {
        seed = `${assessmentId}-${studentId}`;
      } else {
        // per_attempt
        seed = `${assessmentId}-${studentId}-${Date.now()}`;
      }

      // Simple shuffle using seed as random source
      const seededRandom = (s: string) => {
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
          hash = ((hash << 5) - hash) + s.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash) / 0x7fffffff;
      };

      const shuffled = [...questions].sort(() => seededRandom(seed) - 0.5);

      // Pick specified count
      const picked = shuffled.slice(0, rule.pick_count);

      // Shuffle choices if specified
      if (rule.shuffle_choices) {
        picked.forEach(q => {
          if (q.choices_json && Array.isArray(q.choices_json)) {
            q.choices_json = [...q.choices_json].sort(() => seededRandom(seed + q.id) - 0.5);
          }
        });
      }

      selectedQuestions.push(...picked);
    }

    // Final shuffle of all questions if any rule specifies it
    const shouldShuffleQuestions = rules.some(r => r.shuffle_questions);
    if (shouldShuffleQuestions) {
      const seed = `${assessmentId}-${studentId}`;
      const seededRandom = (s: string) => {
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
          hash = ((hash << 5) - hash) + s.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash) / 0x7fffffff;
      };
      selectedQuestions.sort(() => seededRandom(seed) - 0.5);
    }

    // Save snapshot
    const { data, error } = await supabase
      .from('quiz_snapshots')
      .insert({
        assessment_id: assessmentId,
        student_id: studentId,
        questions_json: selectedQuestions,
        seed_value: `${assessmentId}-${studentId}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quiz snapshot:', error);
      return null;
    }

    return data as QuizSnapshot;
  } catch (error) {
    console.error('Unexpected error in generateQuizSnapshot:', error);
    return null;
  }
}

/**
 * Get questions from a specific bank
 */
export async function getBankQuestions(bankId: string): Promise<Question[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('bank_id', bankId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching bank questions:', error);
      return [];
    }

    return data as Question[];
  } catch (error) {
    console.error('Unexpected error in getBankQuestions:', error);
    return [];
  }
}
