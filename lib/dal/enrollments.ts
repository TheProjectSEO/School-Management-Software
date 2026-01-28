/**
 * Enrollment Management Data Access Layer
 *
 * Provides functions for managing student enrollments including
 * approval, dropping, and transfers.
 */

import { createClient } from '@/lib/supabase/server';

// Types
export type EnrollmentStatus = 'pending' | 'approved' | 'dropped' | 'transferred';

export interface EnrollmentDetails {
  id: string;
  school_id: string;
  student_id: string;
  course_id: string;
  section_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  approved_at?: string;
  approved_by?: string;
  dropped_at?: string;
  drop_reason?: string;
  transferred_at?: string;
  transferred_to_section_id?: string;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    lrn: string;
    grade_level: string;
    profile?: {
      id: string;
      full_name: string;
      avatar_url?: string;
    };
  };
  course?: {
    id: string;
    name: string;
    subject_code: string;
  };
  section?: {
    id: string;
    name: string;
    grade_level: string;
  };
}

export interface EnrollmentActionResult {
  success: boolean;
  enrollment?: EnrollmentDetails;
  error?: string;
}

/**
 * Get enrollment by ID with full details
 */
export async function getEnrollmentById(
  id: string
): Promise<EnrollmentDetails | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
        *,
        student:students!inner(
          id,
          lrn,
          grade_level,
          profile:school_profiles!inner(
            id,
            full_name,
            avatar_url
          )
        ),
        course:courses!inner(
          id,
          name,
          subject_code
        ),
        section:sections(
          id,
          name,
          grade_level
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching enrollment:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform nested data
    const enrollment: EnrollmentDetails = {
      ...data,
      student: data.student
        ? {
            id: data.student.id,
            lrn: data.student.lrn,
            grade_level: data.student.grade_level,
            profile: data.student.profile?.[0] || data.student.profile,
          }
        : undefined,
      course: data.course?.[0] || data.course,
      section: data.section?.[0] || data.section,
    };

    return enrollment;
  } catch (error) {
    console.error('Unexpected error in getEnrollmentById:', error);
    return null;
  }
}

/**
 * Approve an enrollment
 */
export async function approveEnrollment(
  id: string,
  approvedBy?: string
): Promise<EnrollmentActionResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('enrollments')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error approving enrollment:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      enrollment: data as EnrollmentDetails,
    };
  } catch (error) {
    console.error('Unexpected error in approveEnrollment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Drop a student from enrollment
 */
export async function dropEnrollment(
  id: string,
  reason: string
): Promise<EnrollmentActionResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('enrollments')
      .update({
        status: 'dropped',
        dropped_at: new Date().toISOString(),
        drop_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error dropping enrollment:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      enrollment: data as EnrollmentDetails,
    };
  } catch (error) {
    console.error('Unexpected error in dropEnrollment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Transfer enrollment to a new section
 */
export async function transferEnrollment(
  id: string,
  newSectionId: string
): Promise<EnrollmentActionResult> {
  try {
    const supabase = await createClient();

    // First, get the current enrollment to verify it exists
    const { data: currentEnrollment, error: fetchError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentEnrollment) {
      return {
        success: false,
        error: 'Enrollment not found',
      };
    }

    // Update the enrollment with new section
    const { data, error } = await supabase
      .from('enrollments')
      .update({
        status: 'transferred',
        transferred_at: new Date().toISOString(),
        transferred_to_section_id: newSectionId,
        section_id: newSectionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error transferring enrollment:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      enrollment: data as EnrollmentDetails,
    };
  } catch (error) {
    console.error('Unexpected error in transferEnrollment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Get enrollments with optional filters
 */
// Aliases and additional exports for API routes

export interface CreateEnrollmentInput {
  school_id?: string;
  student_id?: string;
  studentId?: string; // Alias
  course_id?: string;
  courseId?: string; // Alias
  section_id?: string;
  sectionId?: string; // Alias
  status?: EnrollmentStatus;
  academicYearId?: string;
}

export async function createEnrollment(
  input: CreateEnrollmentInput
): Promise<EnrollmentActionResult & { id?: string }> {
  try {
    const supabase = await createClient();

    // Support both snake_case and camelCase parameter names
    const studentId = input.student_id || input.studentId;
    const courseId = input.course_id || input.courseId;
    const sectionId = input.section_id || input.sectionId;
    const schoolId = input.school_id;

    if (!studentId || !courseId || !sectionId) {
      return { success: false, error: 'Missing required fields' };
    }

    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        student_id: studentId,
        course_id: courseId,
        section_id: sectionId,
        school_id: schoolId,
        status: input.status || 'pending',
        enrolled_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating enrollment:', error);
      return { success: false, error: error.message };
    }

    return { success: true, enrollment: data as EnrollmentDetails, id: data.id };
  } catch (error) {
    console.error('Unexpected error in createEnrollment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function bulkEnroll(
  params: CreateEnrollmentInput[] | { courseId: string; sectionId: string; studentIds: string[]; academicYearId?: string }
): Promise<{ success: boolean; created: number; errors: string[] }> {
  try {
    const supabase = await createClient();
    const errors: string[] = [];
    let created = 0;

    // Handle object format with studentIds array
    if (!Array.isArray(params)) {
      const { courseId, sectionId, studentIds, academicYearId } = params;

      for (const studentId of studentIds) {
        const { error } = await supabase.from('enrollments').insert({
          student_id: studentId,
          course_id: courseId,
          section_id: sectionId,
          status: 'pending',
          enrolled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) {
          errors.push(`Failed to enroll student ${studentId}: ${error.message}`);
        } else {
          created++;
        }
      }
    } else {
      // Handle array format
      for (const enrollment of params) {
        const studentId = enrollment.student_id || enrollment.studentId;
        const courseId = enrollment.course_id || enrollment.courseId;
        const sectionId = enrollment.section_id || enrollment.sectionId;

        const { error } = await supabase.from('enrollments').insert({
          student_id: studentId,
          course_id: courseId,
          section_id: sectionId,
          school_id: enrollment.school_id,
          status: enrollment.status || 'pending',
          enrolled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) {
          errors.push(`Failed to enroll student ${studentId}: ${error.message}`);
        } else {
          created++;
        }
      }
    }

    return { success: errors.length === 0, created, errors };
  } catch (error) {
    console.error('Unexpected error in bulkEnroll:', error);
    return { success: false, created: 0, errors: ['An unexpected error occurred'] };
  }
}

export async function getEnrollmentStats(schoolId?: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  dropped: number;
}> {
  try {
    const supabase = await createClient();

    let query = supabase.from('enrollments').select('status');
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching enrollment stats:', error);
      return { total: 0, pending: 0, approved: 0, dropped: 0 };
    }

    const stats = {
      total: data?.length || 0,
      pending: data?.filter((e: any) => e.status === 'pending').length || 0,
      approved: data?.filter((e: any) => e.status === 'approved').length || 0,
      dropped: data?.filter((e: any) => e.status === 'dropped').length || 0,
    };

    return stats;
  } catch (error) {
    console.error('Unexpected error in getEnrollmentStats:', error);
    return { total: 0, pending: 0, approved: 0, dropped: 0 };
  }
}

export async function completeEnrollment(
  id: string
): Promise<EnrollmentActionResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('enrollments')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error completing enrollment:', error);
      return { success: false, error: error.message };
    }

    return { success: true, enrollment: data as EnrollmentDetails };
  } catch (error) {
    console.error('Unexpected error in completeEnrollment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Alias for API routes
export { getEnrollments as listEnrollments };

export async function getEnrollments(params: {
  schoolId?: string;
  sectionId?: string;
  courseId?: string;
  status?: EnrollmentStatus | string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  data: EnrollmentDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  try {
    const supabase = await createClient();
    const { schoolId, sectionId, courseId, status, page = 1, pageSize = 20 } = params;

    let query = supabase
      .from('enrollments')
      .select(
        `
        *,
        student:students!inner(
          id,
          lrn,
          grade_level,
          profile:school_profiles!inner(
            id,
            full_name,
            avatar_url
          )
        ),
        course:courses!inner(
          id,
          name,
          subject_code
        ),
        section:sections(
          id,
          name,
          grade_level
        )
      `,
        { count: 'exact' }
      );

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrollments:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    // Transform the data
    const enrollments: EnrollmentDetails[] = (data || []).map((item: any) => ({
      ...item,
      student: item.student
        ? {
            id: item.student.id,
            lrn: item.student.lrn,
            grade_level: item.student.grade_level,
            profile: item.student.profile?.[0] || item.student.profile,
          }
        : undefined,
      course: item.course?.[0] || item.course,
      section: item.section?.[0] || item.section,
    }));

    return {
      data: enrollments,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Unexpected error in getEnrollments:', error);
    return { data: [], total: 0, page: params.page || 1, pageSize: params.pageSize || 20, totalPages: 0 };
  }
}
