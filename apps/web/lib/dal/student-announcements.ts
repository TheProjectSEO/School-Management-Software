/**
 * Student Announcements Data Access Layer
 * Handles fetching announcements targeted to the student and read tracking
 * Uses public.teacher_announcements table (unified schema)
 */

import { createClient } from "@/lib/supabase/server";
import type { Announcement, QueryOptions } from "./types";

// ============================================
// ANNOUNCEMENTS
// ============================================

/**
 * Get announcements for a student
 * Fetches published announcements that target the student's section, grade, course, or school
 */
export async function getStudentAnnouncements(
  studentId: string,
  options?: QueryOptions & {
    unreadOnly?: boolean;
    priority?: Announcement["priority"];
    includeExpired?: boolean;
  }
): Promise<Announcement[]> {
  const supabase = await createClient();

  const pageSize = options?.pageSize || 20;
  const page = options?.page || 1;
  const offset = (page - 1) * pageSize;

  // First get student's section, grade, and enrolled courses
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(`
      id,
      section_id,
      grade_level,
      school_id,
      enrollments (
        course_id
      )
    `)
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    console.error("Error fetching student data:", studentError);
    return [];
  }

  // Handle case where student doesn't exist (e.g., new student with no enrollments)
  if (!student) {
    return [];
  }

  const courseIds = student.enrollments?.map((e: { course_id: string }) => e.course_id) || [];

  // Build query for announcements
  let query = supabase
    .from("teacher_announcements")
    .select(`
      *,
      teacher:teacher_profiles!inner (
        id,
        profile:school_profiles (
          full_name,
          avatar_url
        )
      )
    `)
    .eq("school_id", student.school_id)
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Filter by expiration unless explicitly including expired
  if (!options?.includeExpired) {
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  // Filter by priority if specified
  if (options?.priority) {
    query = query.eq("priority", options.priority);
  }

  const { data: announcements, error } = await query;

  if (error) {
    console.error("Error fetching announcements:", error);
    return [];
  }

  if (!announcements || announcements.length === 0) {
    return [];
  }

  // Filter announcements that target this student
  const targetedAnnouncements = announcements.filter((announcement) => {
    // School-wide announcements target everyone
    if (announcement.target_type === "school") {
      return true;
    }

    // Section-targeted announcements
    if (announcement.target_type === "section" && student.section_id) {
      return announcement.target_section_ids?.includes(student.section_id);
    }

    // Grade-level targeted announcements
    if (announcement.target_type === "grade" && student.grade_level) {
      return announcement.target_grade_levels?.includes(student.grade_level);
    }

    // Course-targeted announcements
    if (announcement.target_type === "course" && courseIds.length > 0) {
      return announcement.target_course_ids?.some((id: string) => courseIds.includes(id));
    }

    return false;
  });

  // Get read status for these announcements
  const announcementIds = targetedAnnouncements.map((a) => a.id);

  if (announcementIds.length > 0) {
    const { data: reads } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("student_id", studentId)
      .in("announcement_id", announcementIds);

    const readIds = new Set(reads?.map((r) => r.announcement_id) || []);

    // Add is_read flag to announcements
    const announcementsWithReadStatus = targetedAnnouncements.map((announcement) => ({
      ...announcement,
      is_read: readIds.has(announcement.id),
    }));

    // Filter by unread if requested
    if (options?.unreadOnly) {
      return announcementsWithReadStatus.filter((a) => !a.is_read);
    }

    return announcementsWithReadStatus;
  }

  return targetedAnnouncements.map((a) => ({ ...a, is_read: false }));
}

/**
 * Get a single announcement by ID with full details
 */
export async function getAnnouncementDetail(
  announcementId: string,
  studentId: string
): Promise<Announcement | null> {
  const supabase = await createClient();

  // Fetch the announcement
  const { data: announcement, error } = await supabase
    .from("teacher_announcements")
    .select(`
      *,
      teacher:teacher_profiles!inner (
        id,
        profile:school_profiles (
          full_name,
          avatar_url
        )
      )
    `)
    .eq("id", announcementId)
    .eq("is_published", true)
    .single();

  if (error || !announcement) {
    console.error("Error fetching announcement:", error);
    return null;
  }

  // Check if student has read this announcement
  const { data: readRecord } = await supabase
    .from("announcement_reads")
    .select("id")
    .eq("announcement_id", announcementId)
    .eq("student_id", studentId)
    .single();

  return {
    ...announcement,
    is_read: !!readRecord,
  };
}

/**
 * Mark an announcement as read
 * Records in announcement_reads table
 */
export async function markAnnouncementAsRead(
  announcementId: string,
  studentId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Check if already read
  const { data: existing } = await supabase
    .from("announcement_reads")
    .select("id")
    .eq("announcement_id", announcementId)
    .eq("student_id", studentId)
    .single();

  if (existing) {
    // Already marked as read
    return true;
  }

  // Insert read record
  const { error } = await supabase
    .from("announcement_reads")
    .insert({
      announcement_id: announcementId,
      student_id: studentId,
      read_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Error marking announcement as read:", error);
    return false;
  }

  // Also mark the corresponding notification as read if exists
  await supabase
    .from("student_notifications")
    .update({ is_read: true })
    .eq("student_id", studentId)
    .eq("announcement_id", announcementId);

  return true;
}

/**
 * Get unread announcement count for a student
 */
export async function getUnreadAnnouncementCount(studentId: string): Promise<number> {
  const announcements = await getStudentAnnouncements(studentId, { unreadOnly: true });
  return announcements.length;
}

/**
 * Get urgent/high-priority unread announcements
 * Useful for displaying alerts on the dashboard
 */
export async function getUrgentAnnouncements(studentId: string): Promise<Announcement[]> {
  const supabase = await createClient();

  // First get student's context
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(`
      id,
      section_id,
      grade_level,
      school_id,
      enrollments (
        course_id
      )
    `)
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    console.error("Error fetching student data:", studentError);
    return [];
  }

  // Handle case where student doesn't exist
  if (!student) {
    return [];
  }

  const courseIds = student.enrollments?.map((e: { course_id: string }) => e.course_id) || [];

  // Get urgent/high priority announcements
  const { data: announcements, error } = await supabase
    .from("teacher_announcements")
    .select(`
      *,
      teacher:teacher_profiles!inner (
        id,
        profile:school_profiles (
          full_name,
          avatar_url
        )
      )
    `)
    .eq("school_id", student.school_id)
    .eq("is_published", true)
    .in("priority", ["urgent", "high"])
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("priority", { ascending: true }) // urgent first
    .order("published_at", { ascending: false })
    .limit(5);

  if (error || !announcements) {
    return [];
  }

  // Filter to only those targeting this student
  const targetedAnnouncements = announcements.filter((announcement) => {
    if (announcement.target_type === "school") return true;
    if (announcement.target_type === "section" && student.section_id) {
      return announcement.target_section_ids?.includes(student.section_id);
    }
    if (announcement.target_type === "grade" && student.grade_level) {
      return announcement.target_grade_levels?.includes(student.grade_level);
    }
    if (announcement.target_type === "course" && courseIds.length > 0) {
      return announcement.target_course_ids?.some((id: string) => courseIds.includes(id));
    }
    return false;
  });

  // Check read status
  if (targetedAnnouncements.length > 0) {
    const ids = targetedAnnouncements.map((a) => a.id);
    const { data: reads } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("student_id", studentId)
      .in("announcement_id", ids);

    const readIds = new Set(reads?.map((r) => r.announcement_id) || []);

    // Only return unread urgent announcements
    return targetedAnnouncements
      .filter((a) => !readIds.has(a.id))
      .map((a) => ({ ...a, is_read: false }));
  }

  return targetedAnnouncements.map((a) => ({ ...a, is_read: false }));
}
