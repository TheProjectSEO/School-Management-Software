/**
 * Teacher Identity & Profile Data Access Layer
 *
 * Handles authentication context, teacher profile, and assignment lookups.
 * All queries use n8n_content_creation schema.
 */

import { createClient } from '@/lib/supabase/server';

// Types
export interface Teacher {
  id: string;
  user_id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TeacherAssignment {
  id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  section_name: string;
  subject_name: string;
  subject_code?: string;
  program_name: string;
  year_level: string;
  enrollment_count: number;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Get authenticated teacher profile
 * Uses auth context to fetch teacher details from n8n_content_creation.teacher_profiles
 */
export async function getCurrentTeacher(): Promise<Teacher | null> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return null;
    }

    // Fetch teacher profile
    const { data, error } = await supabase
      .from('teacher_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching teacher profile:', error);
      return null;
    }

    return data as Teacher;
  } catch (error) {
    console.error('Unexpected error in getCurrentTeacher:', error);
    return null;
  }
}

/**
 * Get all section/subject assignments for a teacher
 * Returns joined data from section_subjects with section and subject details
 */
export async function getTeacherAssignments(teacherId: string): Promise<TeacherAssignment[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('section_subjects')
      .select(`
        id,
        section_id,
        subject_id,
        teacher_id,
        sections (
          id,
          name,
          program_id,
          year_level_id,
          programs (
            name
          ),
          year_levels (
            name
          )
        ),
        subjects (
          id,
          name,
          code
        ),
        section_enrollments (
          count
        )
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teacher assignments:', error);
      return [];
    }

    // Transform to flat structure
    return (data || []).map((item: any) => ({
      id: item.id,
      section_id: item.section_id,
      subject_id: item.subject_id,
      teacher_id: item.teacher_id,
      section_name: item.sections?.name || 'Unknown Section',
      subject_name: item.subjects?.name || 'Unknown Subject',
      subject_code: item.subjects?.code,
      program_name: item.sections?.programs?.name || 'Unknown Program',
      year_level: item.sections?.year_levels?.name || 'Unknown Year',
      enrollment_count: item.section_enrollments?.length || 0,
      created_at: item.created_at
    }));
  } catch (error) {
    console.error('Unexpected error in getTeacherAssignments:', error);
    return [];
  }
}

/**
 * Get teacher's school details
 * Fetches from n8n_content_creation.schools
 */
export async function getTeacherSchool(teacherId: string): Promise<School | null> {
  try {
    const supabase = await createClient();

    // First get teacher's school_id
    const { data: teacher, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select('school_id')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      console.error('Error fetching teacher school_id:', teacherError);
      return null;
    }

    // Then fetch school details
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', teacher.school_id)
      .single();

    if (schoolError) {
      console.error('Error fetching school:', schoolError);
      return null;
    }

    return school as School;
  } catch (error) {
    console.error('Unexpected error in getTeacherSchool:', error);
    return null;
  }
}

/**
 * Verify teacher has access to a specific section
 * Used for authorization checks in route handlers
 */
export async function verifyTeacherSectionAccess(
  teacherId: string,
  sectionId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('section_subjects')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('section_id', sectionId)
      .limit(1);

    if (error) {
      console.error('Error verifying section access:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Unexpected error in verifyTeacherSectionAccess:', error);
    return false;
  }
}

/**
 * Verify teacher has access to a specific subject
 * Used for authorization checks in route handlers
 */
export async function verifyTeacherSubjectAccess(
  teacherId: string,
  subjectId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('section_subjects')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('subject_id', subjectId)
      .limit(1);

    if (error) {
      console.error('Error verifying subject access:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Unexpected error in verifyTeacherSubjectAccess:', error);
    return false;
  }
}
