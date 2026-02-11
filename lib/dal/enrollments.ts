/**
 * Enrollment Management Data Access Layer
 *
 * Provides functions for managing student enrollments including
 * approval, dropping, and transfers.
 */

import { createServiceClient } from '@/lib/supabase/service';

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
    const supabase = createServiceClient();

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
    const supabase = createServiceClient();

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
    const supabase = createServiceClient();

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
    const supabase = createServiceClient();

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
    const supabase = createServiceClient();

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
    const supabase = createServiceClient();
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
    const supabase = createServiceClient();

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
    const supabase = createServiceClient();

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
    const supabase = createServiceClient();
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

// ============================================================================
// GROUPED STUDENT ENROLLMENTS (one row per student, courses nested)
// ============================================================================

export interface CourseEnrollment {
  enrollment_id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  section_id: string;
  section_name: string;
  status: string;
  enrolled_at: string;
}

export interface GroupedStudentEnrollment {
  student_id: string;
  student_name: string;
  student_email: string;
  section_id: string;
  section_name: string;
  grade_level: string;
  enrolled_at: string;
  courses: CourseEnrollment[];
}

/**
 * List enrollments grouped by student (one entry per student with nested courses).
 * Uses separate queries per CLAUDE.md (no FK joins).
 */
export async function listGroupedStudentEnrollments(params: {
  schoolId?: string;
  sectionId?: string;
  courseId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  data: GroupedStudentEnrollment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  try {
    const supabase = createServiceClient();
    const { schoolId, sectionId, courseId, status, search, page = 1, pageSize = 20 } = params;

    // Step 1: Get flat enrollment records matching filters (use * to avoid column-not-found errors)
    let baseQuery = supabase
      .from('enrollments')
      .select('*');

    if (schoolId) baseQuery = baseQuery.eq('school_id', schoolId);
    if (sectionId) baseQuery = baseQuery.eq('section_id', sectionId);
    if (courseId) baseQuery = baseQuery.eq('course_id', courseId);
    if (status) baseQuery = baseQuery.eq('status', status);

    const { data: enrollmentRows, error: enrollError } = await baseQuery;

    if (enrollError) {
      console.error('Error fetching enrollment rows:', enrollError);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    // Step 2: Group by student_id
    const enrollmentsByStudent = new Map<string, typeof enrollmentRows>();
    for (const row of enrollmentRows || []) {
      if (!enrollmentsByStudent.has(row.student_id)) {
        enrollmentsByStudent.set(row.student_id, []);
      }
      enrollmentsByStudent.get(row.student_id)!.push(row);
    }

    let uniqueStudentIds = [...enrollmentsByStudent.keys()];

    // Step 3: If search query, filter students by name
    if (search && uniqueStudentIds.length > 0) {
      const { data: studentRows } = await supabase
        .from('students')
        .select('id, profile_id')
        .in('id', uniqueStudentIds);

      const profileIds = (studentRows || []).map(s => s.profile_id).filter(Boolean);

      // Search by school_profiles.id first
      const { data: matchedProfiles } = await supabase
        .from('school_profiles')
        .select('id')
        .in('id', profileIds)
        .ilike('full_name', `%${search}%`);

      const matchedProfileIds = new Set((matchedProfiles || []).map(p => p.id));

      // Also search by auth_user_id for legacy profile_id values
      const { data: matchedByAuth } = await supabase
        .from('school_profiles')
        .select('auth_user_id')
        .in('auth_user_id', profileIds)
        .ilike('full_name', `%${search}%`);

      for (const p of matchedByAuth || []) {
        if (p.auth_user_id) matchedProfileIds.add(p.auth_user_id);
      }

      const studentProfileMap = new Map((studentRows || []).map(s => [s.id, s.profile_id]));

      uniqueStudentIds = uniqueStudentIds.filter(id => {
        const pid = studentProfileMap.get(id);
        return pid && matchedProfileIds.has(pid);
      });
    }

    // Step 4: Paginate by unique students
    const total = uniqueStudentIds.length;
    const totalPages = Math.ceil(total / pageSize);
    const fromIdx = (page - 1) * pageSize;
    const pageStudentIds = uniqueStudentIds.slice(fromIdx, fromIdx + pageSize);

    if (pageStudentIds.length === 0) {
      return { data: [], total, page, pageSize, totalPages };
    }

    // Step 5: Fetch student details (separate queries per CLAUDE.md)
    const { data: students } = await supabase
      .from('students')
      .select('id, profile_id, section_id, grade_level')
      .in('id', pageStudentIds);

    const profileIds = [...new Set((students || []).map(s => s.profile_id).filter(Boolean))];

    // Look up school_profiles by id first
    let profiles: { id: string; full_name: string; avatar_url?: string; email?: string }[] = [];
    if (profileIds.length > 0) {
      const { data } = await supabase
        .from('school_profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', profileIds);
      profiles = data || [];
    }

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // For unresolved profile_ids, try school_profiles.auth_user_id
    // (handles legacy case where students.profile_id = auth.users.id)
    const unresolvedIds = profileIds.filter(pid => !profileMap.has(pid));
    if (unresolvedIds.length > 0) {
      const { data: fallbackProfiles } = await supabase
        .from('school_profiles')
        .select('id, auth_user_id, full_name, avatar_url, email')
        .in('auth_user_id', unresolvedIds);
      for (const p of fallbackProfiles || []) {
        if (p.auth_user_id) profileMap.set(p.auth_user_id, p);
      }
    }
    const studentMap = new Map((students || []).map(s => [s.id, s]));

    // Step 6: Fetch all referenced sections
    const allSectionIds = new Set<string>();
    for (const s of students || []) {
      if (s.section_id) allSectionIds.add(s.section_id);
    }
    for (const sid of pageStudentIds) {
      for (const e of enrollmentsByStudent.get(sid) || []) {
        if (e.section_id) allSectionIds.add(e.section_id);
      }
    }

    const { data: sections } = await supabase
      .from('sections')
      .select('id, name, grade_level')
      .in('id', Array.from(allSectionIds));

    const sectionMap = new Map((sections || []).map(s => [s.id, s]));

    // Step 7: Fetch all referenced courses
    const allCourseIds = new Set<string>();
    for (const sid of pageStudentIds) {
      for (const e of enrollmentsByStudent.get(sid) || []) {
        allCourseIds.add(e.course_id);
      }
    }

    const { data: courses } = await supabase
      .from('courses')
      .select('id, name, subject_code')
      .in('id', Array.from(allCourseIds));

    const courseMap = new Map((courses || []).map(c => [c.id, c]));

    // Step 8: Build grouped result
    const data: GroupedStudentEnrollment[] = pageStudentIds
      .map(studentId => {
        const student = studentMap.get(studentId);
        if (!student) return null;

        const profile = profileMap.get(student.profile_id);
        const section = student.section_id ? sectionMap.get(student.section_id) : null;

        const courseEnrollments: CourseEnrollment[] = (enrollmentsByStudent.get(studentId) || []).map(e => {
          const course = courseMap.get(e.course_id);
          const enrollSection = e.section_id ? sectionMap.get(e.section_id) : null;
          return {
            enrollment_id: e.id,
            course_id: e.course_id,
            course_name: course?.name || 'Unknown',
            course_code: course?.subject_code || '',
            section_id: e.section_id,
            section_name: enrollSection?.name || '',
            status: e.status || 'active',
            enrolled_at: e.enrolled_at || e.created_at,
          };
        });

        return {
          student_id: studentId,
          student_name: profile?.full_name || 'Unknown',
          student_email: profile?.email || '',
          section_id: student.section_id || '',
          section_name: section?.name || 'Not assigned',
          grade_level: student.grade_level || section?.grade_level || '',
          enrolled_at: courseEnrollments[0]?.enrolled_at || '',
          courses: courseEnrollments,
        };
      })
      .filter((item): item is GroupedStudentEnrollment => item !== null);

    return { data, total, page, pageSize, totalPages };
  } catch (error) {
    console.error('Unexpected error in listGroupedStudentEnrollments:', error);
    return { data: [], total: 0, page: params.page || 1, pageSize: params.pageSize || 20, totalPages: 0 };
  }
}
