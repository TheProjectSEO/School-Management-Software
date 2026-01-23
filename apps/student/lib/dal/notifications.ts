/**
 * Notifications, Notes, and Downloads data access functions
 */

import { createClient } from "@/lib/supabase/server";
import type { Notification, Note, Download, QueryOptions } from "./types";

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Get notifications for a student
 */
export async function getNotifications(
  studentId: string,
  options?: QueryOptions & { unreadOnly?: boolean; type?: Notification["type"] }
): Promise<Notification[]> {
  const supabase = await createClient();

  const pageSize = options?.pageSize || 20;
  const page = options?.page || 1;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("student_notifications")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (options?.unreadOnly) {
    query = query.eq("is_read", false);
  }

  if (options?.type) {
    query = query.eq("type", options.type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return data || [];
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(studentId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("student_notifications")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching notification count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("student_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }

  return true;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(studentId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("student_notifications")
    .update({ is_read: true })
    .eq("student_id", studentId)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }

  return true;
}

// ============================================
// NOTES
// ============================================

/**
 * Get notes for a student
 */
export async function getNotes(
  studentId: string,
  options?: QueryOptions & { type?: Note["type"]; courseId?: string; favoritesOnly?: boolean }
): Promise<Note[]> {
  const supabase = await createClient();

  const pageSize = options?.pageSize || 20;
  const page = options?.page || 1;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("student_notes")
    .select("*")
    .eq("student_id", studentId)
    .order(options?.orderBy || "updated_at", {
      ascending: options?.orderDirection === "asc",
    })
    .range(offset, offset + pageSize - 1);

  if (options?.type) {
    query = query.eq("type", options.type);
  }

  if (options?.courseId) {
    query = query.eq("course_id", options.courseId);
  }

  if (options?.favoritesOnly) {
    query = query.eq("is_favorite", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notes:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a new note
 */
export async function createNote(
  note: Omit<Note, "id" | "created_at" | "updated_at">
): Promise<Note | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_notes")
    .insert({
      ...note,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating note:", error);
    return null;
  }

  return data;
}

/**
 * Update a note
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Pick<Note, "title" | "content" | "tags" | "is_favorite">>
): Promise<Note | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_notes")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", noteId)
    .select()
    .single();

  if (error) {
    console.error("Error updating note:", error);
    return null;
  }

  return data;
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("student_notes").delete().eq("id", noteId);

  if (error) {
    console.error("Error deleting note:", error);
    return false;
  }

  return true;
}

// ============================================
// DOWNLOADS
// ============================================

/**
 * Get downloads for a student
 */
export async function getDownloads(
  studentId: string,
  options?: QueryOptions & { status?: Download["status"] }
): Promise<Download[]> {
  const supabase = await createClient();

  const pageSize = options?.pageSize || 20;
  const page = options?.page || 1;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("student_downloads")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching downloads:", error);
    return [];
  }

  return data || [];
}

/**
 * Get download stats for a student
 */
export async function getDownloadStats(studentId: string): Promise<{
  totalDownloads: number;
  totalSizeBytes: number;
  readyCount: number;
  syncingCount: number;
  queuedCount: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_downloads")
    .select("file_size_bytes, status")
    .eq("student_id", studentId);

  if (error) {
    console.error("Error fetching download stats:", error);
    return {
      totalDownloads: 0,
      totalSizeBytes: 0,
      readyCount: 0,
      syncingCount: 0,
      queuedCount: 0,
    };
  }

  return {
    totalDownloads: data?.length || 0,
    totalSizeBytes: data?.reduce((sum, d) => sum + d.file_size_bytes, 0) || 0,
    readyCount: data?.filter((d) => d.status === "ready").length || 0,
    syncingCount: data?.filter((d) => d.status === "syncing").length || 0,
    queuedCount: data?.filter((d) => d.status === "queued").length || 0,
  };
}

/**
 * Add a download
 */
export async function addDownload(
  download: Omit<Download, "id" | "created_at">
): Promise<Download | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_downloads")
    .insert({
      ...download,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding download:", error);
    return null;
  }

  return data;
}

/**
 * Remove a download
 */
export async function removeDownload(downloadId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("student_downloads").delete().eq("id", downloadId);

  if (error) {
    console.error("Error removing download:", error);
    return false;
  }

  return true;
}
