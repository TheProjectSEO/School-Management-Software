import { createClient } from "@/lib/supabase/server";
import { logAuditEvent, PaginatedResult, BulkImportResult } from "./admin";

// Types
export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  section_id: string;
  academic_year_id: string;
  status: "active" | "completed" | "dropped" | "pending";
  grade: number | null;
  enrolled_at: string;
  completed_at: string | null;
  dropped_at: string | null;
  drop_reason: string | null;
  students: {
    id: string;
    profile_id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  };
  courses: {
    id: string;
    name: string;
    code: string;
  };
  sections: {
    id: string;
    name: string;
    grade_level: string;
  };
}

export interface CreateEnrollmentInput {
  studentId: string;
  courseId: string;
  sectionId: string;
  academicYearId?: string;
}

export interface BulkEnrollmentInput {
  courseId: string;
  sectionId: string;
  studentIds: string[];
  academicYearId?: string;
}

// Enrollment Functions
export async function listEnrollments(params: {
  search?: string;
  status?: string;
  courseId?: string;
  sectionId?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<Enrollment>> {
  const supabase = await createClient();
  const { search, status, courseId, sectionId, page = 1, pageSize = 20 } = params;

  let query = supabase
    .from("enrollments")
    .select(
      `
      id,
      student_id,
      course_id,
      section_id,
      academic_year_id,
      status,
      grade,
      enrolled_at,
      completed_at,
      dropped_at,
      drop_reason,
      students (
        id,
        profile_id,
        profiles (
          full_name,
          email
        )
      ),
      courses (
        id,
        name,
        code
      ),
      sections (
        id,
        name,
        grade_level
      )
    `,
      { count: "exact" }
    );

  if (search) {
    query = query.or(`students.profiles.full_name.ilike.%${search}%,courses.name.ilike.%${search}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  if (sectionId) {
    query = query.eq("section_id", sectionId);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .range(from, to)
    .order("enrolled_at", { ascending: false });

  if (error) {
    console.error("Error listing enrollments:", error);
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  return {
    data: (data || []) as unknown as Enrollment[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getEnrollmentById(enrollmentId: string): Promise<Enrollment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      id,
      student_id,
      course_id,
      section_id,
      academic_year_id,
      status,
      grade,
      enrolled_at,
      completed_at,
      dropped_at,
      drop_reason,
      students (
        id,
        profile_id,
        profiles (
          full_name,
          email
        )
      ),
      courses (
        id,
        name,
        code
      ),
      sections (
        id,
        name,
        grade_level
      )
    `)
    .eq("id", enrollmentId)
    .single();

  if (error) {
    console.error("Error getting enrollment:", error);
    return null;
  }

  return data as unknown as Enrollment;
}

export async function createEnrollment(
  input: CreateEnrollmentInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  try {
    // Check if enrollment already exists
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", input.studentId)
      .eq("course_id", input.courseId)
      .eq("section_id", input.sectionId)
      .eq("status", "active")
      .single();

    if (existing) {
      return { success: false, error: "Student is already enrolled in this course" };
    }

    const { data, error } = await supabase
      .from("enrollments")
      .insert({
        student_id: input.studentId,
        course_id: input.courseId,
        section_id: input.sectionId,
        academic_year_id: input.academicYearId,
        status: "active",
        enrolled_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      action: "create",
      entityType: "enrollment",
      entityId: data.id,
      newValues: input as unknown as Record<string, unknown>,
    });

    return { success: true, id: data.id };
  } catch (error) {
    console.error("Error creating enrollment:", error);
    return { success: false, error: "Failed to create enrollment" };
  }
}

export async function approveEnrollment(
  enrollmentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("enrollments")
    .update({ status: "active" })
    .eq("id", enrollmentId)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "approve",
    entityType: "enrollment",
    entityId: enrollmentId,
  });

  return { success: true };
}

export async function dropEnrollment(
  enrollmentId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("enrollments")
    .update({
      status: "dropped",
      dropped_at: new Date().toISOString(),
      drop_reason: reason,
    })
    .eq("id", enrollmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "drop",
    entityType: "enrollment",
    entityId: enrollmentId,
    metadata: { reason },
  });

  return { success: true };
}

export async function transferEnrollment(
  enrollmentId: string,
  newSectionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current enrollment
  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment) {
    return { success: false, error: "Enrollment not found" };
  }

  const oldSectionId = enrollment.section_id;

  const { error } = await supabase
    .from("enrollments")
    .update({ section_id: newSectionId })
    .eq("id", enrollmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "transfer",
    entityType: "enrollment",
    entityId: enrollmentId,
    oldValues: { section_id: oldSectionId },
    newValues: { section_id: newSectionId },
  });

  return { success: true };
}

export async function completeEnrollment(
  enrollmentId: string,
  grade: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("enrollments")
    .update({
      status: "completed",
      grade,
      completed_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: "complete",
    entityType: "enrollment",
    entityId: enrollmentId,
    newValues: { grade },
  });

  return { success: true };
}

export async function bulkEnroll(
  input: BulkEnrollmentInput
): Promise<BulkImportResult> {
  const result: BulkImportResult = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < input.studentIds.length; i++) {
    const studentId = input.studentIds[i];
    const createResult = await createEnrollment({
      studentId,
      courseId: input.courseId,
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
    });

    if (createResult.success) {
      result.success++;
    } else {
      result.failed++;
      result.errors.push({ row: i + 1, message: createResult.error || "Unknown error" });
    }
  }

  await logAuditEvent({
    action: "bulk_enroll",
    entityType: "enrollment",
    metadata: {
      courseId: input.courseId,
      sectionId: input.sectionId,
      total: input.studentIds.length,
      success: result.success,
      failed: result.failed,
    },
  });

  return result;
}

export async function getEnrollmentStats() {
  const supabase = await createClient();

  const { data: stats } = await supabase.rpc("get_enrollment_stats");

  return stats || {
    total: 0,
    active: 0,
    pending: 0,
    completed: 0,
    dropped: 0,
  };
}
