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
}

export interface CreateTeacherInput {
  fullName: string;
  email: string;
  employeeId: string;
  department?: string;
  specialization?: string;
  phone?: string;
  hireDate?: string;
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
      .from("profiles")
      .insert({
        full_name: input.fullName,
        phone: input.phone,
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
        lrn: input.lrn,
        grade_level: input.gradeLevel,
        section_id: input.sectionId,
        status: "active",
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
        .from("profiles")
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
      .from("profiles")
      .insert({
        full_name: input.fullName,
        phone: input.phone,
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
        employee_id: input.employeeId,
        department: input.department,
        specialization: input.specialization,
        is_active: true,
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
        .from("profiles")
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
