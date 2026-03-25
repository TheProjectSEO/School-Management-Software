/**
 * User Management Data Access Layer
 *
 * Provides functions for managing students and teachers,
 * including listing, fetching details, and updating profiles.
 */

import { createAdminClient } from '@/lib/supabase/admin';

// Types
export interface StudentListFilters {
  schoolId?: string;
  sectionId?: string;
  gradeLevel?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentListItem {
  id: string;
  profile_id: string;
  school_id: string;
  section_id?: string;
  lrn: string;
  grade_level: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  section_name?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentDetails extends StudentListItem {
  phone?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  status?: string;
  profile?: {
    id: string;
    auth_user_id: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    email?: string;
  };
  section?: {
    id: string;
    name: string;
    grade_level: string;
  };
  enrollments?: {
    id: string;
    course_id: string;
    course_name: string;
    enrolled_at: string;
    status: string;
  }[];
}

export interface UpdateStudentInput {
  lrn?: string;
  grade_level?: string;
  section_id?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
}

export interface TeacherListFilters {
  schoolId?: string;
  department?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TeacherListItem {
  id: string;
  profile_id: string;
  school_id: string;
  employee_id?: string;
  department?: string;
  specialization?: string;
  is_active: boolean;
  full_name: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherDetails extends TeacherListItem {
  phone?: string;
  profile?: {
    id: string;
    auth_user_id: string;
    full_name: string;
    phone?: string;
    avatar_url?: string;
    email?: string;
  };
  school?: {
    id: string;
    name: string;
  };
  assignments?: {
    id: string;
    course_id: string;
    course_name: string;
    section_id: string;
    section_name: string;
  }[];
}

export interface UpdateTeacherInput {
  employee_id?: string;
  department?: string;
  specialization?: string;
  is_active?: boolean;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface CreateStudentInput {
  school_id: string;
  profile_id?: string;
  lrn: string;
  grade_level?: string;
  section_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  // Temporary password for new account
  temporaryPassword?: string;
  // camelCase aliases
  fullName?: string;
  gradeLevel?: string;
  sectionId?: string;
  // Additional fields (snake_case)
  birth_date?: string;
  gender?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  // Additional fields (camelCase aliases)
  birthDate?: string;
  guardianName?: string;
  guardianPhone?: string;
}

export interface CreateTeacherInput {
  school_id: string;
  profile_id?: string;
  employee_id?: string;
  department?: string;
  specialization?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  // Temporary password for new account
  temporaryPassword?: string;
  // camelCase aliases
  fullName?: string;
  employeeId?: string;
  // Additional fields (snake_case)
  hire_date?: string;
  // Additional fields (camelCase aliases)
  hireDate?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// STUDENTS
// ============================================================================

/**
 * Get students list with optional filters
 */
export async function getStudents(
  filters: StudentListFilters
): Promise<PaginatedResult<StudentListItem>> {
  try {
    const supabase = createAdminClient();
    const {
      schoolId,
      sectionId,
      gradeLevel,
      search,
      page = 1,
      pageSize = 20,
    } = filters;

    let query = supabase.from('students').select(
      `
        id,
        profile_id,
        school_id,
        section_id,
        lrn,
        grade_level,
        created_at,
        updated_at,
        profile:school_profiles!inner(
          id,
          full_name,
          avatar_url
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

    if (gradeLevel) {
      query = query.eq('grade_level', gradeLevel);
    }

    if (search) {
      query = query.or(
        `lrn.ilike.%${search}%,profile.full_name.ilike.%${search}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching students:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    // Transform the data
    const students: StudentListItem[] = (data || []).map((student: any) => ({
      id: student.id,
      profile_id: student.profile_id,
      school_id: student.school_id,
      section_id: student.section_id,
      lrn: student.lrn || '',
      grade_level: student.grade_level || '',
      full_name:
        student.profile?.[0]?.full_name ||
        student.profile?.full_name ||
        'Unknown',
      avatar_url:
        student.profile?.[0]?.avatar_url || student.profile?.avatar_url,
      section_name:
        student.section?.[0]?.name || student.section?.name || undefined,
      created_at: student.created_at,
      updated_at: student.updated_at,
    }));

    return {
      data: students,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Unexpected error in getStudents:', error);
    return {
      data: [],
      total: 0,
      page: filters.page || 1,
      pageSize: filters.pageSize || 20,
      totalPages: 0,
    };
  }
}

/**
 * Get student details by ID
 */
export async function getStudentById(id: string): Promise<StudentDetails | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('students')
      .select(
        `
        *,
        profile:school_profiles!inner(
          id,
          auth_user_id,
          full_name,
          phone,
          avatar_url,
          email
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
      console.error('Error fetching student by ID:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Get enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(
        `
        id,
        course_id,
        enrolled_at,
        status,
        course:courses!inner(name)
      `
      )
      .eq('student_id', id);

    const studentDetails: StudentDetails = {
      id: data.id,
      profile_id: data.profile_id,
      school_id: data.school_id,
      section_id: data.section_id,
      lrn: data.lrn || '',
      grade_level: data.grade_level || '',
      status: data.status,
      full_name:
        data.profile?.[0]?.full_name || data.profile?.full_name || 'Unknown',
      email: data.profile?.[0]?.email || data.profile?.email,
      phone: data.profile?.[0]?.phone || data.profile?.phone,
      avatar_url: data.profile?.[0]?.avatar_url || data.profile?.avatar_url,
      section_name: data.section?.[0]?.name || data.section?.name,
      birth_date: data.birth_date,
      gender: data.gender,
      address: data.address,
      guardian_name: data.guardian_name,
      guardian_phone: data.guardian_phone,
      created_at: data.created_at,
      updated_at: data.updated_at,
      profile: data.profile?.[0] || data.profile,
      section: data.section?.[0] || data.section,
      enrollments: (enrollments || []).map((e: any) => ({
        id: e.id,
        course_id: e.course_id,
        course_name: e.course?.[0]?.name || e.course?.name || 'Unknown',
        enrolled_at: e.enrolled_at,
        status: e.status,
      })),
    };

    return studentDetails;
  } catch (error) {
    console.error('Unexpected error in getStudentById:', error);
    return null;
  }
}

/**
 * Update student information
 */
export async function updateStudent(
  id: string,
  updates: UpdateStudentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Separate student and profile updates
    const studentUpdates: Record<string, unknown> = {};
    const profileUpdates: Record<string, unknown> = {};

    if (updates.lrn !== undefined) studentUpdates.lrn = updates.lrn;
    if (updates.grade_level !== undefined)
      studentUpdates.grade_level = updates.grade_level;
    if (updates.section_id !== undefined)
      studentUpdates.section_id = updates.section_id;
    if (updates.birth_date !== undefined)
      studentUpdates.birth_date = updates.birth_date;
    if (updates.gender !== undefined) studentUpdates.gender = updates.gender;
    if (updates.address !== undefined) studentUpdates.address = updates.address;
    if (updates.guardian_name !== undefined)
      studentUpdates.guardian_name = updates.guardian_name;
    if (updates.guardian_phone !== undefined)
      studentUpdates.guardian_phone = updates.guardian_phone;

    if (updates.full_name !== undefined)
      profileUpdates.full_name = updates.full_name;
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
    if (updates.avatar_url !== undefined)
      profileUpdates.avatar_url = updates.avatar_url;

    // Get the student to find profile_id
    const { data: student } = await supabase
      .from('students')
      .select('profile_id')
      .eq('id', id)
      .single();

    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    // Update student table if needed
    if (Object.keys(studentUpdates).length > 0) {
      const { error: studentError } = await supabase
        .from('students')
        .update({
          ...studentUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (studentError) {
        console.error('Error updating student:', studentError);
        return { success: false, error: studentError.message };
      }
    }

    // Update profile table if needed
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('school_profiles')
        .update({
          ...profileUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.profile_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return { success: false, error: profileError.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateStudent:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// ============================================================================
// TEACHERS
// ============================================================================

/**
 * Get teachers list with optional filters
 */
export async function getTeachers(
  filters: TeacherListFilters
): Promise<PaginatedResult<TeacherListItem>> {
  try {
    const supabase = createAdminClient();
    const {
      schoolId,
      department,
      isActive,
      search,
      page = 1,
      pageSize = 20,
    } = filters;

    let query = supabase.from('teacher_profiles').select(
      `
        id,
        profile_id,
        school_id,
        employee_id,
        department,
        specialization,
        is_active,
        created_at,
        updated_at,
        profile:school_profiles!inner(
          id,
          full_name,
          avatar_url
        )
      `,
      { count: 'exact' }
    );

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    if (department) {
      query = query.eq('department', department);
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    if (search) {
      query = query.or(
        `employee_id.ilike.%${search}%,profile.full_name.ilike.%${search}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teachers:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    // Transform the data
    const teachers: TeacherListItem[] = (data || []).map((teacher: any) => ({
      id: teacher.id,
      profile_id: teacher.profile_id,
      school_id: teacher.school_id,
      employee_id: teacher.employee_id,
      department: teacher.department,
      specialization: teacher.specialization,
      is_active: teacher.is_active,
      full_name:
        teacher.profile?.[0]?.full_name ||
        teacher.profile?.full_name ||
        'Unknown',
      avatar_url:
        teacher.profile?.[0]?.avatar_url || teacher.profile?.avatar_url,
      created_at: teacher.created_at,
      updated_at: teacher.updated_at,
    }));

    return {
      data: teachers,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  } catch (error) {
    console.error('Unexpected error in getTeachers:', error);
    return {
      data: [],
      total: 0,
      page: filters.page || 1,
      pageSize: filters.pageSize || 20,
      totalPages: 0,
    };
  }
}

/**
 * Get teacher details by ID
 */
export async function getTeacherById(id: string): Promise<TeacherDetails | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('teacher_profiles')
      .select(
        `
        *,
        profile:school_profiles!inner(
          id,
          auth_user_id,
          full_name,
          phone,
          avatar_url,
          email
        ),
        school:schools(
          id,
          name
        )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching teacher by ID:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Get assignments
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select(
        `
        id,
        course_id,
        section_id,
        course:courses!inner(name),
        section:sections!inner(name)
      `
      )
      .eq('teacher_profile_id', id);

    const teacherDetails: TeacherDetails = {
      id: data.id,
      profile_id: data.profile_id,
      school_id: data.school_id,
      employee_id: data.employee_id,
      department: data.department,
      specialization: data.specialization,
      is_active: data.is_active,
      full_name:
        data.profile?.[0]?.full_name || data.profile?.full_name || 'Unknown',
      email: data.profile?.[0]?.email || data.profile?.email,
      phone: data.profile?.[0]?.phone || data.profile?.phone,
      avatar_url: data.profile?.[0]?.avatar_url || data.profile?.avatar_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
      profile: data.profile?.[0] || data.profile,
      school: data.school?.[0] || data.school,
      assignments: (assignments || []).map((a: any) => ({
        id: a.id,
        course_id: a.course_id,
        course_name: a.course?.[0]?.name || a.course?.name || 'Unknown',
        section_id: a.section_id,
        section_name: a.section?.[0]?.name || a.section?.name || 'Unknown',
      })),
    };

    return teacherDetails;
  } catch (error) {
    console.error('Unexpected error in getTeacherById:', error);
    return null;
  }
}

/**
 * Update teacher information
 */
export async function updateTeacher(
  id: string,
  updates: UpdateTeacherInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Separate teacher and profile updates
    const teacherUpdates: Record<string, unknown> = {};
    const profileUpdates: Record<string, unknown> = {};

    if (updates.employee_id !== undefined)
      teacherUpdates.employee_id = updates.employee_id;
    if (updates.department !== undefined)
      teacherUpdates.department = updates.department;
    if (updates.specialization !== undefined)
      teacherUpdates.specialization = updates.specialization;
    if (updates.is_active !== undefined)
      teacherUpdates.is_active = updates.is_active;

    if (updates.full_name !== undefined)
      profileUpdates.full_name = updates.full_name;
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
    if (updates.avatar_url !== undefined)
      profileUpdates.avatar_url = updates.avatar_url;

    // Get the teacher to find profile_id
    const { data: teacher } = await supabase
      .from('teacher_profiles')
      .select('profile_id')
      .eq('id', id)
      .single();

    if (!teacher) {
      return { success: false, error: 'Teacher not found' };
    }

    // Update teacher table if needed
    if (Object.keys(teacherUpdates).length > 0) {
      const { error: teacherError } = await supabase
        .from('teacher_profiles')
        .update({
          ...teacherUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (teacherError) {
        console.error('Error updating teacher:', teacherError);
        return { success: false, error: teacherError.message };
      }
    }

    // Update profile table if needed
    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('school_profiles')
        .update({
          ...profileUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teacher.profile_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return { success: false, error: profileError.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateTeacher:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all available sections (for dropdowns)
 */
export async function getSections(
  schoolId?: string
): Promise<{ id: string; name: string; grade_level: string }[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('sections')
      .select('id, name, grade_level')
      .order('grade_level', { ascending: true })
      .order('name', { ascending: true });

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sections:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in getSections:', error);
    return [];
  }
}

/**
 * Get all available departments (for dropdowns)
 */
export async function getDepartments(
  schoolId?: string
): Promise<string[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('teacher_profiles')
      .select('department')
      .not('department', 'is', null);

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching departments:', error);
      return [];
    }

    // Get unique departments
    const departments = new Set<string>();
    (data || []).forEach((item: any) => {
      if (item.department) {
        departments.add(item.department);
      }
    });

    return Array.from(departments).sort();
  } catch (error) {
    console.error('Unexpected error in getDepartments:', error);
    return [];
  }
}

// ============================================================================
// STUDENT CREATE/STATUS FUNCTIONS
// ============================================================================

/**
 * Create a new student
 */
export async function createStudent(
  input: CreateStudentInput
): Promise<{ success: boolean; id?: string; error?: string; temporaryPassword?: string }> {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Normalize camelCase inputs to snake_case
    const fullName = input.full_name ?? input.fullName;
    const gradeLevel = input.grade_level ?? input.gradeLevel;
    const sectionId = input.section_id ?? input.sectionId;
    const birthDate = input.birth_date ?? input.birthDate;
    const guardianName = input.guardian_name ?? input.guardianName;
    const guardianPhone = input.guardian_phone ?? input.guardianPhone;

    // Generate a temporary password if not provided
    const temporaryPassword = input.temporaryPassword || generateTemporaryPassword();

    // First create the profile if not provided
    let profileId = input.profile_id;
    let authUserId: string | null = null;

    if (!profileId) {
      // If email is provided, create an auth user first
      if (input.email) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: input.email,
          password: temporaryPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: fullName,
            role: 'student',
            requires_password_change: true,
          },
        });

        if (authError) {
          console.error('Error creating auth user:', authError);
          const isEmailExists =
            authError.code === 'email_exists' ||
            authError.message?.includes('already registered') ||
            authError.message?.includes('already exists');
          if (isEmailExists) {
            return {
              success: false,
              error: 'Email already exists. This email address is already registered to another account in the system (student, teacher, or admin). Each person must use a unique email address.',
            };
          }
          return { success: false, error: authError.message };
        }

        authUserId = authUser.user.id;
      }

      const { data: profile, error: profileError } = await supabase
        .from('school_profiles')
        .insert({
          auth_user_id: authUserId,
          full_name: fullName,
          phone: input.phone,
          role: 'student',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Clean up auth user if profile creation fails
        if (authUserId) {
          await supabase.auth.admin.deleteUser(authUserId);
        }
        return { success: false, error: profileError.message };
      }

      profileId = profile.id;
    }

    // Create the student record
    const studentData: Record<string, unknown> = {
      school_id: input.school_id,
      profile_id: profileId,
      lrn: input.lrn,
      grade_level: gradeLevel,
      section_id: sectionId,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (birthDate) studentData.birth_date = birthDate;
    if (input.gender) studentData.gender = input.gender;
    if (input.address) studentData.address = input.address;
    if (guardianName) studentData.guardian_name = guardianName;
    if (guardianPhone) studentData.guardian_phone = guardianPhone;

    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert(studentData)
      .select('id')
      .single();

    if (studentError) {
      console.error('Error creating student:', studentError);
      return { success: false, error: studentError.message };
    }

    return {
      success: true,
      id: student.id,
      temporaryPassword: input.email ? temporaryPassword : undefined
    };
  } catch (error) {
    console.error('Unexpected error in createStudent:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update student status
 */
export async function updateStudentStatus(
  id: string,
  status: 'active' | 'inactive' | 'suspended' | 'graduated' | 'transferred'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('students')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating student status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateStudentStatus:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Bulk update student status
 */
export async function bulkUpdateStudentStatus(
  ids: string[],
  status: 'active' | 'inactive' | 'suspended' | 'graduated' | 'transferred'
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Fetch all profile_ids in one query
    const { data: students, error: fetchError } = await supabase
      .from('students')
      .select('id, profile_id')
      .in('id', ids);

    if (fetchError || !students || students.length === 0) {
      return { success: false, updated: 0, errors: [fetchError?.message || 'No students found'] };
    }

    const profileIds = students.map(s => s.profile_id).filter(Boolean);

    // Batch update both tables
    const [studentsResult, profilesResult] = await Promise.all([
      supabase
        .from('students')
        .update({ status, updated_at: now })
        .in('id', ids),
      supabase
        .from('school_profiles')
        .update({ status, updated_at: now })
        .in('id', profileIds),
    ]);

    const errors: string[] = [];
    if (studentsResult.error) errors.push(`students table: ${studentsResult.error.message}`);
    if (profilesResult.error) errors.push(`school_profiles table: ${profilesResult.error.message}`);

    if (errors.length > 0) {
      return { success: false, updated: 0, errors };
    }

    return { success: true, updated: students.length, errors: [] };
  } catch (error) {
    console.error('Unexpected error in bulkUpdateStudentStatus:', error);
    return { success: false, updated: 0, errors: ['An unexpected error occurred'] };
  }
}

/**
 * Bulk import students
 */
export async function bulkImportStudents(
  students: CreateStudentInput[]
): Promise<{ success: boolean; created: number; errors: string[] }> {
  try {
    const errors: string[] = [];
    let created = 0;

    for (const student of students) {
      const result = await createStudent(student);
      if (result.success) {
        created++;
      } else {
        errors.push(`Failed to create student ${student.lrn}: ${result.error}`);
      }
    }

    return { success: errors.length === 0, created, errors };
  } catch (error) {
    console.error('Unexpected error in bulkImportStudents:', error);
    return { success: false, created: 0, errors: ['An unexpected error occurred'] };
  }
}

// ============================================================================
// TEACHER CREATE/STATUS FUNCTIONS
// ============================================================================

/**
 * Create a new teacher
 */
export async function createTeacher(
  input: CreateTeacherInput
): Promise<{ success: boolean; id?: string; error?: string; temporaryPassword?: string }> {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Normalize camelCase inputs to snake_case
    const fullName = input.full_name ?? input.fullName;
    const employeeId = input.employee_id ?? input.employeeId;
    const hireDate = input.hire_date ?? input.hireDate;

    // Generate a temporary password if not provided
    const temporaryPassword = input.temporaryPassword || generateTemporaryPassword();

    // First create the profile if not provided
    let profileId = input.profile_id;
    let authUserId: string | null = null;

    if (!profileId) {
      // If email is provided, create an auth user first
      if (input.email) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: input.email,
          password: temporaryPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: fullName,
            role: 'teacher',
            requires_password_change: true,
          },
        });

        if (authError) {
          console.error('Error creating auth user:', authError);
          const isEmailExists =
            authError.code === 'email_exists' ||
            authError.message?.includes('already registered') ||
            authError.message?.includes('already exists');
          if (isEmailExists) {
            return {
              success: false,
              error: 'Email already exists. This email address is already registered to another account in the system (student, teacher, or admin). Each person must use a unique email address.',
            };
          }
          return { success: false, error: authError.message };
        }

        authUserId = authUser.user.id;
      }

      const { data: profile, error: profileError } = await supabase
        .from('school_profiles')
        .insert({
          auth_user_id: authUserId,
          full_name: fullName,
          email: input.email || null,
          phone: input.phone,
          role: 'teacher',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Clean up auth user if profile creation fails
        if (authUserId) {
          await supabase.auth.admin.deleteUser(authUserId);
        }
        return { success: false, error: profileError.message };
      }

      profileId = profile.id;
    }

    // Create the teacher profile
    const teacherData: Record<string, unknown> = {
      school_id: input.school_id,
      profile_id: profileId,
      employee_id: employeeId,
      department: input.department,
      specialization: input.specialization,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (hireDate) teacherData.hire_date = hireDate;

    const { data: teacher, error: teacherError } = await supabase
      .from('teacher_profiles')
      .insert(teacherData)
      .select('id')
      .single();

    if (teacherError) {
      console.error('Error creating teacher:', teacherError);
      return { success: false, error: teacherError.message };
    }

    return {
      success: true,
      id: teacher.id,
      temporaryPassword: input.email ? temporaryPassword : undefined
    };
  } catch (error) {
    console.error('Unexpected error in createTeacher:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reset user password (for admin use)
 */
export async function resetUserPassword(
  authUserId: string,
  newPassword?: string
): Promise<{ success: boolean; password?: string; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Generate a temporary password if not provided
    const password = newPassword || generateTemporaryPassword();

    const { error } = await supabase.auth.admin.updateUserById(authUserId, {
      password,
      user_metadata: {
        requires_password_change: true,
      },
    });

    if (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.message };
    }

    return { success: true, password };
  } catch (error) {
    console.error('Unexpected error in resetUserPassword:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get auth user ID from profile ID
 */
export async function getAuthUserIdFromProfileId(
  profileId: string
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('school_profiles')
      .select('auth_user_id')
      .eq('id', profileId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.auth_user_id;
  } catch (error) {
    console.error('Error getting auth user ID:', error);
    return null;
  }
}

/**
 * Create an auth account for an existing profile that doesn't have one
 */
export async function createAuthAccountForProfile(
  profileId: string,
  email: string,
  password?: string
): Promise<{ success: boolean; authUserId?: string; password?: string; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Check if profile already has an auth account
    const { data: profile, error: profileError } = await supabase
      .from('school_profiles')
      .select('auth_user_id, full_name, role')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (profile.auth_user_id) {
      return { success: false, error: 'Profile already has an auth account' };
    }

    // Generate a temporary password if not provided
    const tempPassword = password || generateTemporaryPassword();

    // Create the auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name,
        role: profile.role,
        requires_password_change: true,
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return { success: false, error: authError.message };
    }

    // Update the profile with the auth user ID and email
    const { error: updateError } = await supabase
      .from('school_profiles')
      .update({
        auth_user_id: authUser.user.id,
        email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      // Clean up auth user if profile update fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: updateError.message };
    }

    return {
      success: true,
      authUserId: authUser.user.id,
      password: tempPassword,
    };
  } catch (error) {
    console.error('Unexpected error in createAuthAccountForProfile:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Generate a random temporary password
 */
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const specialChars = '!@#$%';
  let password = '';

  // Add 8 alphanumeric characters
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Add 1 special character
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

  // Add 1 more alphanumeric
  password += chars.charAt(Math.floor(Math.random() * chars.length));

  return password;
}

/**
 * Update teacher email (requires admin password verification)
 * This updates the email in Supabase auth
 */
export async function updateTeacherEmail(
  teacherId: string,
  newEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Get the teacher's profile to find auth_user_id
    const { data: teacher, error: teacherError } = await supabase
      .from('teacher_profiles')
      .select('profile_id')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      return { success: false, error: 'Teacher not found' };
    }

    // Get the auth_user_id from school_profiles
    const { data: profile, error: profileError } = await supabase
      .from('school_profiles')
      .select('auth_user_id')
      .eq('id', teacher.profile_id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (!profile.auth_user_id) {
      return { success: false, error: 'Teacher does not have an auth account. Create one first via password reset.' };
    }

    // Update the email in Supabase auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.auth_user_id,
      { email: newEmail }
    );

    if (updateError) {
      console.error('Error updating email in auth:', updateError);
      return { success: false, error: updateError.message };
    }

    // Also update school_profiles.email so the UI reflects the change
    const { error: profileUpdateError } = await supabase
      .from('school_profiles')
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq('id', teacher.profile_id);

    if (profileUpdateError) {
      console.error('Error updating school_profiles email (non-fatal):', profileUpdateError);
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateTeacherEmail:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update student email (requires admin password verification)
 * This updates the email in Supabase auth and school_profiles
 */
export async function updateStudentEmail(
  studentId: string,
  newEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Get the student's profile_id
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('profile_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return { success: false, error: 'Student not found' };
    }

    // Get the auth_user_id from school_profiles
    const { data: profile, error: profileError } = await supabase
      .from('school_profiles')
      .select('auth_user_id')
      .eq('id', student.profile_id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found' };
    }

    if (!profile.auth_user_id) {
      return { success: false, error: 'Student does not have an auth account. Create one first via password reset.' };
    }

    // Update the email in Supabase auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.auth_user_id,
      { email: newEmail }
    );

    if (updateError) {
      console.error('Error updating email in auth:', updateError);
      return { success: false, error: updateError.message };
    }

    // Also update school_profiles.email so the UI reflects the change
    const { error: profileUpdateError } = await supabase
      .from('school_profiles')
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq('id', student.profile_id);

    if (profileUpdateError) {
      console.error('Error updating school_profiles email (non-fatal):', profileUpdateError);
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateStudentEmail:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update teacher status
 */
export async function updateTeacherStatus(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('teacher_profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating teacher status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateTeacherStatus:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Bulk update teacher status
 */
export async function bulkUpdateTeacherStatus(
  ids: string[],
  isActive: boolean
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    const errors: string[] = [];
    let updated = 0;

    for (const id of ids) {
      const { error } = await supabase
        .from('teacher_profiles')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        errors.push(`Failed to update teacher ${id}: ${error.message}`);
      } else {
        updated++;
      }
    }

    return { success: errors.length === 0, updated, errors };
  } catch (error) {
    console.error('Unexpected error in bulkUpdateTeacherStatus:', error);
    return { success: false, updated: 0, errors: ['An unexpected error occurred'] };
  }
}

/**
 * Bulk import teachers
 */
export async function bulkImportTeachers(
  teachers: CreateTeacherInput[]
): Promise<{ success: boolean; created: number; errors: string[] }> {
  try {
    const errors: string[] = [];
    let created = 0;

    for (const teacher of teachers) {
      const result = await createTeacher(teacher);
      if (result.success) {
        created++;
      } else {
        errors.push(`Failed to create teacher ${teacher.full_name}: ${result.error}`);
      }
    }

    return { success: errors.length === 0, created, errors };
  } catch (error) {
    console.error('Unexpected error in bulkImportTeachers:', error);
    return { success: false, created: 0, errors: ['An unexpected error occurred'] };
  }
}

// ============================================================================
// BULK STUDENT SECTION/GRADE UPDATE FUNCTIONS
// ============================================================================

/**
 * Bulk update student section
 */
export async function bulkUpdateStudentSection(
  studentIds: string[],
  sectionId: string
): Promise<{ success: boolean; updated: number; enrollmentsCreated: number; errors: string[] }> {
  try {
    const supabase = createAdminClient();
    const errors: string[] = [];
    let updated = 0;
    let enrollmentsCreated = 0;

    // Get the section to update grade_level and school_id
    const { data: section } = await supabase
      .from('sections')
      .select('grade_level, school_id')
      .eq('id', sectionId)
      .single();

    // Get all course_ids assigned to this section via teacher_assignments
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select('course_id')
      .eq('section_id', sectionId);

    const courseIds = [...new Set((assignments || []).map((a) => a.course_id))];

    for (const id of studentIds) {
      const updateData: Record<string, unknown> = {
        section_id: sectionId,
        updated_at: new Date().toISOString(),
      };

      // Also update grade_level if section has it
      if (section?.grade_level) {
        updateData.grade_level = section.grade_level;
      }

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id);

      if (error) {
        errors.push(`Failed to update student ${id}: ${error.message}`);
        continue;
      }

      updated++;

      // Auto-enroll student in all courses assigned to this section
      if (courseIds.length > 0 && section?.school_id) {
        const enrollmentRows = courseIds.map((courseId) => ({
          student_id: id,
          course_id: courseId,
          section_id: sectionId,
          school_id: section.school_id,
          status: 'active' as const,
          enrolled_at: new Date().toISOString(),
        }));

        const { data: upserted, error: enrollError } = await supabase
          .from('enrollments')
          .upsert(enrollmentRows, { onConflict: 'student_id,course_id' })
          .select('id');

        if (enrollError) {
          errors.push(`Failed to enroll student ${id}: ${enrollError.message}`);
        } else {
          enrollmentsCreated += upserted?.length || 0;
        }
      }
    }

    return { success: errors.length === 0, updated, enrollmentsCreated, errors };
  } catch (error) {
    console.error('Unexpected error in bulkUpdateStudentSection:', error);
    return { success: false, updated: 0, enrollmentsCreated: 0, errors: ['An unexpected error occurred'] };
  }
}

/**
 * Bulk update student grade level
 */
export async function bulkUpdateStudentGrade(
  studentIds: string[],
  gradeLevel: string
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  try {
    const supabase = createAdminClient();
    const errors: string[] = [];
    let updated = 0;

    for (const id of studentIds) {
      const { error } = await supabase
        .from('students')
        .update({
          grade_level: gradeLevel,
          // Optionally clear section_id when changing grade
          // section_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        errors.push(`Failed to update student ${id}: ${error.message}`);
      } else {
        updated++;
      }
    }

    return { success: errors.length === 0, updated, errors };
  } catch (error) {
    console.error('Unexpected error in bulkUpdateStudentGrade:', error);
    return { success: false, updated: 0, errors: ['An unexpected error occurred'] };
  }
}
