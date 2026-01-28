import { createClient } from "@/lib/supabase/server";
import { logAuditEvent, PaginatedResult, BulkImportResult } from "./admin";

// Types
export interface Student {
  id: string;
  profile_id: string;
  lrn: string | null;
  grade_level: string;
  section_id: string | null;
  status: "active" | "inactive" | "graduated" | "transferred";
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
  sections: {
    id: string;
    name: string;
    grade_level: string;
  } | null;
}

export interface Teacher {
  id: string;
  profile_id: string;
  employee_id: string;
  department: string | null;
  specialization: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

export interface CreateStudentInput {
  fullName: string;
  email: string;
  lrn?: string;
  gradeLevel: string;
  sectionId?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  school_id?: string;
}

export interface CreateTeacherInput {
  fullName: string;
  email: string;
  employeeId: string;
  department?: string;
  specialization?: string;
  phone?: string;
  hireDate?: string;
  school_id?: string;
}

// Student Functions
export async function getStudentById(studentId: string): Promise<Student | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      profile_id,
      lrn,
      grade_level,
      section_id,
      status,
      created_at,
      updated_at,
      profiles (
        id,
        full_name,
        email,
        phone,
        avatar_url
      ),
      sections (
        id,
        name,
        grade_level
      )
    `)
    .eq("id", studentId)
    .single();

  if (error) {
    console.error("Error getting student:", error);
    return null;
  }

  return data as unknown as Student;
}

export async function createStudent(input: CreateStudentInput): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  try {
    // Create profile first (note: email should be created via Supabase Auth separately)
    const { data: profile, error: profileError } = await supabase
      .from("school_profiles")
      .insert({
        full_name: input.fullName,
        phone: input.phone,
        role: 'student',
        school_id: input.school_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // Create student record
    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({
        profile_id: profile.id,
        school_id: input.school_id,
        lrn: input.lrn,
        grade_level: input.gradeLevel,
        section_id: input.sectionId,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (studentError) {
      return { success: false, error: studentError.message };
    }

    await logAuditEvent({
      action: "create",
      entityType: "student",
      entityId: student.id,
      newValues: { fullName: input.fullName, email: input.email, gradeLevel: input.gradeLevel },
    });

    return { success: true, id: student.id };
  } catch (error) {
    console.error("Error creating student:", error);
    return { success: false, error: "Failed to create student" };
  }
}

export async function updateStudent(
  studentId: string,
  updates: Partial<CreateStudentInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const student = await getStudentById(studentId);
    if (!student) {
      return { success: false, error: "Student not found" };
    }

    // Update profile if name/phone changed (email managed via auth)
    if (updates.fullName || updates.phone) {
      const profileUpdates: Record<string, unknown> = {};
      if (updates.fullName) profileUpdates.full_name = updates.fullName;
      if (updates.phone) profileUpdates.phone = updates.phone;

      const { error: profileError } = await supabase
        .from("school_profiles")
        .update(profileUpdates)
        .eq("id", student.profile_id);

      if (profileError) {
        return { success: false, error: profileError.message };
      }
    }

    // Update student record
    const studentUpdates: Record<string, unknown> = {};
    if (updates.lrn !== undefined) studentUpdates.lrn = updates.lrn;
    if (updates.gradeLevel) studentUpdates.grade_level = updates.gradeLevel;
    if (updates.sectionId !== undefined) studentUpdates.section_id = updates.sectionId;

    if (Object.keys(studentUpdates).length > 0) {
      const { error: studentError } = await supabase
        .from("students")
        .update({ ...studentUpdates, updated_at: new Date().toISOString() })
        .eq("id", studentId);

      if (studentError) {
        return { success: false, error: studentError.message };
      }
    }

    await logAuditEvent({
      action: "update",
      entityType: "student",
      entityId: studentId,
      newValues: updates,
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating student:", error);
    return { success: false, error: "Failed to update student" };
  }
}

export async function updateStudentStatus(
  studentId: string,
  status: "active" | "inactive" | "graduated" | "transferred"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("students")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", studentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "update",
    entityType: "student",
    entityId: studentId,
    newValues: { status },
  });

  return { success: true };
}

export async function bulkUpdateStudentStatus(
  studentIds: string[],
  status: "active" | "inactive"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("students")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", studentIds);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "bulk_update",
    entityType: "student",
    metadata: { studentIds, status },
  });

  return { success: true };
}

export async function bulkImportStudents(
  students: CreateStudentInput[]
): Promise<BulkImportResult> {
  const result: BulkImportResult = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const createResult = await createStudent(student);

    if (createResult.success) {
      result.success++;
    } else {
      result.failed++;
      result.errors.push({ row: i + 1, message: createResult.error || "Unknown error" });
    }
  }

  await logAuditEvent({
    action: "bulk_import",
    entityType: "student",
    metadata: { total: students.length, success: result.success, failed: result.failed },
  });

  return result;
}

// Teacher Functions
export async function getTeacherById(teacherId: string): Promise<Teacher | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_profiles")
    .select(`
      id,
      profile_id,
      employee_id,
      department,
      specialization,
      is_active,
      created_at,
      updated_at,
      profiles (
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq("id", teacherId)
    .single();

  if (error) {
    console.error("Error getting teacher:", error);
    return null;
  }

  return data as unknown as Teacher;
}

export async function createTeacher(input: CreateTeacherInput): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  try {
    // Create profile first (note: email should be created via Supabase Auth separately)
    const { data: profile, error: profileError } = await supabase
      .from("school_profiles")
      .insert({
        full_name: input.fullName,
        phone: input.phone,
        role: 'teacher',
        school_id: input.school_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // Create teacher record
    const { data: teacher, error: teacherError } = await supabase
      .from("teacher_profiles")
      .insert({
        profile_id: profile.id,
        school_id: input.school_id,
        employee_id: input.employeeId,
        department: input.department,
        specialization: input.specialization,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (teacherError) {
      return { success: false, error: teacherError.message };
    }

    await logAuditEvent({
      action: "create",
      entityType: "teacher",
      entityId: teacher.id,
      newValues: { fullName: input.fullName, email: input.email, employeeId: input.employeeId },
    });

    return { success: true, id: teacher.id };
  } catch (error) {
    console.error("Error creating teacher:", error);
    return { success: false, error: "Failed to create teacher" };
  }
}

export async function updateTeacher(
  teacherId: string,
  updates: Partial<CreateTeacherInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const teacher = await getTeacherById(teacherId);
    if (!teacher) {
      return { success: false, error: "Teacher not found" };
    }

    // Update profile if name/email/phone changed
    if (updates.fullName || updates.email || updates.phone) {
      const profileUpdates: Record<string, unknown> = {};
      if (updates.fullName) profileUpdates.full_name = updates.fullName;
      if (updates.email) profileUpdates.email = updates.email;
      if (updates.phone) profileUpdates.phone = updates.phone;

      const { error: profileError } = await supabase
        .from("school_profiles")
        .update(profileUpdates)
        .eq("id", teacher.profile_id);

      if (profileError) {
        return { success: false, error: profileError.message };
      }
    }

    // Update teacher record
    const teacherUpdates: Record<string, unknown> = {};
    if (updates.employeeId) teacherUpdates.employee_id = updates.employeeId;
    if (updates.department !== undefined) teacherUpdates.department = updates.department;
    if (updates.specialization !== undefined) teacherUpdates.specialization = updates.specialization;

    if (Object.keys(teacherUpdates).length > 0) {
      const { error: teacherError } = await supabase
        .from("teacher_profiles")
        .update({ ...teacherUpdates, updated_at: new Date().toISOString() })
        .eq("id", teacherId);

      if (teacherError) {
        return { success: false, error: teacherError.message };
      }
    }

    await logAuditEvent({
      action: "update",
      entityType: "teacher",
      entityId: teacherId,
      newValues: updates,
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating teacher:", error);
    return { success: false, error: "Failed to update teacher" };
  }
}

export async function updateTeacherStatus(
  teacherId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("teacher_profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", teacherId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "update",
    entityType: "teacher",
    entityId: teacherId,
    newValues: { is_active: isActive },
  });

  return { success: true };
}

export async function bulkUpdateTeacherStatus(
  teacherIds: string[],
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("teacher_profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .in("id", teacherIds);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "bulk_update",
    entityType: "teacher",
    metadata: { teacherIds, is_active: isActive },
  });

  return { success: true };
}

export async function bulkImportTeachers(
  teachers: CreateTeacherInput[]
): Promise<BulkImportResult> {
  const result: BulkImportResult = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < teachers.length; i++) {
    const teacher = teachers[i];
    const createResult = await createTeacher(teacher);

    if (createResult.success) {
      result.success++;
    } else {
      result.failed++;
      result.errors.push({ row: i + 1, message: createResult.error || "Unknown error" });
    }
  }

  await logAuditEvent({
    action: "bulk_import",
    entityType: "teacher",
    metadata: { total: teachers.length, success: result.success, failed: result.failed },
  });

  return result;
}

// Bulk Section/Grade Update Functions
export async function bulkUpdateStudentSection(
  studentIds: string[],
  sectionId: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  const supabase = await createClient();

  try {
    // Get the section to update grade_level as well
    const { data: section } = await supabase
      .from("sections")
      .select("grade_level")
      .eq("id", sectionId)
      .single();

    const updateData: Record<string, unknown> = {
      section_id: sectionId,
      updated_at: new Date().toISOString(),
    };

    // Also update grade_level if section has it
    if (section?.grade_level) {
      updateData.grade_level = section.grade_level;
    }

    const { error } = await supabase
      .from("students")
      .update(updateData)
      .in("id", studentIds);

    if (error) {
      return { success: false, updated: 0, error: error.message };
    }

    await logAuditEvent({
      action: "bulk_update",
      entityType: "student",
      metadata: { studentIds, sectionId, action: "section_change" },
    });

    return { success: true, updated: studentIds.length };
  } catch (error) {
    console.error("Error in bulkUpdateStudentSection:", error);
    return { success: false, updated: 0, error: "Failed to update sections" };
  }
}

export async function bulkUpdateStudentGrade(
  studentIds: string[],
  gradeLevel: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("students")
      .update({
        grade_level: gradeLevel,
        updated_at: new Date().toISOString(),
      })
      .in("id", studentIds);

    if (error) {
      return { success: false, updated: 0, error: error.message };
    }

    await logAuditEvent({
      action: "bulk_update",
      entityType: "student",
      metadata: { studentIds, gradeLevel, action: "grade_change" },
    });

    return { success: true, updated: studentIds.length };
  } catch (error) {
    console.error("Error in bulkUpdateStudentGrade:", error);
    return { success: false, updated: 0, error: "Failed to update grades" };
  }
}

// Teacher Assignment Types
export interface TeacherCourseAssignment {
  id: string;
  teacher_id: string;
  course_id: string;
  section_id: string;
  is_primary: boolean;
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

export interface TeacherAdvisory {
  id: string;
  teacher_id: string;
  section_id: string;
  section?: {
    id: string;
    name: string;
    grade_level: string;
    student_count?: number;
  };
}

export interface AvailableSection {
  id: string;
  name: string;
  grade_level: string;
  capacity: number | null;
  student_count: number;
  has_adviser: boolean;
}

export interface AvailableCourse {
  id: string;
  name: string;
  subject_code: string;
  description: string | null;
}

// Teacher Assignment Functions

/**
 * Get sections available for assignment (can filter to only those without adviser)
 */
export async function getAvailableSections(
  schoolId: string,
  onlyWithoutAdviser: boolean = false
): Promise<AvailableSection[]> {
  const supabase = await createClient();

  const { data: sections, error } = await supabase
    .from("sections")
    .select("id, name, grade_level, capacity")
    .eq("school_id", schoolId)
    .order("grade_level")
    .order("name");

  if (error) {
    console.error("Error fetching sections:", error);
    return [];
  }

  if (!sections || sections.length === 0) {
    return [];
  }

  const sectionIds = sections.map((s) => s.id);

  // Batch query: Get student counts for all sections at once
  const { data: studentCounts } = await supabase
    .from("students")
    .select("section_id")
    .in("section_id", sectionIds);

  // Build a map of section_id -> count
  const countMap = new Map<string, number>();
  (studentCounts || []).forEach((s) => {
    const current = countMap.get(s.section_id) || 0;
    countMap.set(s.section_id, current + 1);
  });

  // Batch query: Get all advisers for these sections at once
  const { data: advisers } = await supabase
    .from("section_advisers")
    .select("section_id, teacher_profile_id")
    .in("section_id", sectionIds);

  // Build a set of section IDs that have advisers
  const adviserSet = new Set((advisers || []).map((a) => a.section_id));

  // Combine the data
  const result = sections.map((section) => ({
    id: section.id,
    name: section.name,
    grade_level: section.grade_level,
    capacity: section.capacity,
    student_count: countMap.get(section.id) || 0,
    has_adviser: adviserSet.has(section.id),
  }));

  if (onlyWithoutAdviser) {
    return result.filter((s) => !s.has_adviser);
  }

  return result;
}

/**
 * Get courses available for a teacher to teach
 */
export async function getAvailableCourses(
  schoolId: string
): Promise<AvailableCourse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("id, name, subject_code, description")
    .eq("school_id", schoolId)
    .order("name");

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }

  return (data || []) as AvailableCourse[];
}

/**
 * Get teacher's current course assignments
 */
export async function getTeacherCourseAssignments(
  teacherId: string
): Promise<TeacherCourseAssignment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_assignments")
    .select(`
      id,
      teacher_profile_id,
      course_id,
      section_id,
      is_primary,
      courses (id, name, subject_code),
      sections (id, name, grade_level)
    `)
    .eq("teacher_profile_id", teacherId);

  if (error) {
    console.error("Error fetching teacher course assignments:", error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    teacher_id: item.teacher_profile_id,
    course_id: item.course_id,
    section_id: item.section_id,
    is_primary: item.is_primary,
    course: item.courses as unknown as TeacherCourseAssignment["course"],
    section: item.sections as unknown as TeacherCourseAssignment["section"],
  }));
}

/**
 * Assign a teacher to teach a course in a section
 */
export async function assignTeacherToCourse(
  teacherId: string,
  courseId: string,
  sectionId: string,
  isPrimary: boolean = true,
  schoolId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  try {
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_profile_id", teacherId)
      .eq("course_id", courseId)
      .eq("section_id", sectionId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Teacher is already assigned to this course in this section" };
    }

    const { data, error } = await supabase
      .from("teacher_assignments")
      .insert({
        teacher_profile_id: teacherId,
        course_id: courseId,
        section_id: sectionId,
        is_primary: isPrimary,
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Also update the course's teacher_id for direct lookups
    await supabase
      .from("courses")
      .update({ teacher_id: teacherId })
      .eq("id", courseId);

    await logAuditEvent({
      action: "create",
      entityType: "teacher_assignment",
      entityId: data.id,
      newValues: { teacherId, courseId, sectionId, isPrimary },
    });

    return { success: true, id: data.id };
  } catch (error) {
    console.error("Error assigning teacher to course:", error);
    return { success: false, error: "Failed to assign teacher to course" };
  }
}

/**
 * Remove a teacher's course assignment
 */
export async function removeTeacherCourseAssignment(
  assignmentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get assignment details for audit log
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("teacher_profile_id, course_id, section_id")
      .eq("id", assignmentId)
      .single();

    const { error } = await supabase
      .from("teacher_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Also clear teacher_id from course
    if (assignment) {
      await supabase
        .from("courses")
        .update({ teacher_id: null })
        .eq("id", assignment.course_id);
    }

    await logAuditEvent({
      action: "delete",
      entityType: "teacher_assignment",
      entityId: assignmentId,
      oldValues: assignment ?? undefined,
    });

    return { success: true };
  } catch (error) {
    console.error("Error removing teacher course assignment:", error);
    return { success: false, error: "Failed to remove assignment" };
  }
}

/**
 * Get teacher's current advisory sections
 */
export async function getTeacherAdvisories(
  teacherId: string
): Promise<TeacherAdvisory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("section_advisers")
    .select(`
      id,
      teacher_profile_id,
      section_id,
      sections (id, name, grade_level)
    `)
    .eq("teacher_profile_id", teacherId);

  if (error) {
    console.error("Error fetching teacher advisories:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get section IDs for batch query
  const sectionIds = data.map((item) => item.section_id);

  // Batch query: Get student counts for all advisory sections at once
  const { data: studentCounts } = await supabase
    .from("students")
    .select("section_id")
    .in("section_id", sectionIds);

  // Build a map of section_id -> count
  const countMap = new Map<string, number>();
  (studentCounts || []).forEach((s) => {
    const current = countMap.get(s.section_id) || 0;
    countMap.set(s.section_id, current + 1);
  });

  // Combine the data
  return data.map((item) => {
    const section = item.sections as unknown as { id: string; name: string; grade_level: string };
    return {
      id: item.id,
      teacher_id: item.teacher_profile_id,
      section_id: item.section_id,
      section: section ? {
        ...section,
        student_count: countMap.get(item.section_id) || 0,
      } : undefined,
    };
  });
}

/**
 * Assign a teacher as section adviser with optional auto-enrollment
 */
export async function assignTeacherAsAdviser(
  teacherId: string,
  sectionId: string,
  schoolId: string,
  autoEnrollStudents: boolean = false
): Promise<{ success: boolean; id?: string; enrolledCount?: number; error?: string }> {
  const supabase = await createClient();

  try {
    // Check if section already has an adviser
    const { data: existingAdviser } = await supabase
      .from("section_advisers")
      .select("id, teacher_profile_id")
      .eq("section_id", sectionId)
      .maybeSingle();

    if (existingAdviser) {
      return { success: false, error: "This section already has an adviser" };
    }

    // Create adviser assignment
    const { data: adviser, error: adviserError } = await supabase
      .from("section_advisers")
      .insert({
        teacher_profile_id: teacherId,
        section_id: sectionId,
        school_id: schoolId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (adviserError) {
      return { success: false, error: adviserError.message };
    }

    let enrolledCount = 0;

    // Auto-enroll students if requested
    if (autoEnrollStudents) {
      // Get all students in the section
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("section_id", sectionId)
        .eq("status", "active");

      // Get all courses the teacher teaches in this section
      const { data: teacherCourses } = await supabase
        .from("teacher_assignments")
        .select("course_id")
        .eq("teacher_profile_id", teacherId)
        .eq("section_id", sectionId);

      if (students && students.length > 0 && teacherCourses && teacherCourses.length > 0) {
        // Create enrollment records for each student-course pair
        const enrollments = students.flatMap((student) =>
          teacherCourses.map((course) => ({
            student_id: student.id,
            course_id: course.course_id,
            school_id: schoolId,
            section_id: sectionId,
            enrolled_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
        );

        // Upsert to avoid duplicates
        const { data: enrolledData, error: enrollError } = await supabase
          .from("enrollments")
          .upsert(enrollments, {
            onConflict: "student_id,course_id",
            ignoreDuplicates: true,
          })
          .select("id");

        if (!enrollError && enrolledData) {
          enrolledCount = enrolledData.length;
        }
      }
    }

    await logAuditEvent({
      action: "create",
      entityType: "section_adviser",
      entityId: adviser.id,
      newValues: { teacherId, sectionId, autoEnrollStudents, enrolledCount },
    });

    return { success: true, id: adviser.id, enrolledCount };
  } catch (error) {
    console.error("Error assigning teacher as adviser:", error);
    return { success: false, error: "Failed to assign teacher as adviser" };
  }
}

/**
 * Remove a teacher as section adviser
 */
export async function removeTeacherAsAdviser(
  adviserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get adviser details for audit log
    const { data: adviser } = await supabase
      .from("section_advisers")
      .select("teacher_profile_id, section_id")
      .eq("id", adviserId)
      .single();

    const { error } = await supabase
      .from("section_advisers")
      .delete()
      .eq("id", adviserId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      action: "delete",
      entityType: "section_adviser",
      entityId: adviserId,
      oldValues: adviser ?? undefined,
    });

    return { success: true };
  } catch (error) {
    console.error("Error removing teacher as adviser:", error);
    return { success: false, error: "Failed to remove adviser" };
  }
}

/**
 * Get auto-enrollment preview (count of students and courses)
 */
export async function getAutoEnrollmentPreview(
  teacherId: string,
  sectionId: string
): Promise<{ studentCount: number; courseCount: number }> {
  const supabase = await createClient();

  // Get student count in section
  const { count: studentCount } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("section_id", sectionId)
    .eq("status", "active");

  // Get course count teacher teaches in this section
  const { count: courseCount } = await supabase
    .from("teacher_assignments")
    .select("*", { count: "exact", head: true })
    .eq("teacher_profile_id", teacherId)
    .eq("section_id", sectionId);

  return {
    studentCount: studentCount || 0,
    courseCount: courseCount || 0,
  };
}
