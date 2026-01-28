/**
 * Downloads data access functions
 */

import { createClient } from "@/lib/supabase/server";
import type { Download } from "./types";

/**
 * Get all downloads for a student
 */
export async function getDownloads(studentId: string): Promise<Download[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_downloads")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching downloads:", error);
    return [];
  }

  return data || [];
}

/**
 * Get download statistics for a student
 */
export async function getDownloadStats(studentId: string): Promise<{
  totalDownloads: number;
  readyDownloads: number;
  queuedDownloads: number;
  syncingDownloads: number;
  errorDownloads: number;
  totalSizeBytes: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_downloads")
    .select("status, file_size_bytes")
    .eq("student_id", studentId);

  if (error) {
    console.error("Error fetching download stats:", error);
    return {
      totalDownloads: 0,
      readyDownloads: 0,
      queuedDownloads: 0,
      syncingDownloads: 0,
      errorDownloads: 0,
      totalSizeBytes: 0,
    };
  }

  const downloads = data || [];

  return {
    totalDownloads: downloads.length,
    readyDownloads: downloads.filter((d) => d.status === "ready").length,
    queuedDownloads: downloads.filter((d) => d.status === "queued").length,
    syncingDownloads: downloads.filter((d) => d.status === "syncing").length,
    errorDownloads: downloads.filter((d) => d.status === "error").length,
    totalSizeBytes: downloads.reduce((sum, d) => sum + (d.file_size_bytes || 0), 0),
  };
}

// Export type for stats return value
export type DownloadStats = {
  totalDownloads: number;
  readyDownloads: number;
  queuedDownloads: number;
  syncingDownloads: number;
  errorDownloads: number;
  totalSizeBytes: number;
};

/**
 * Get downloads filtered by status
 */
export async function getDownloadsByStatus(
  studentId: string,
  status: "ready" | "syncing" | "queued" | "error"
): Promise<Download[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_downloads")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching downloads by status:", error);
    return [];
  }

  return data || [];
}

/**
 * Delete a download
 */
export async function deleteDownload(downloadId: string, studentId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("student_downloads")
    .delete()
    .eq("id", downloadId)
    .eq("student_id", studentId);

  if (error) {
    console.error("Error deleting download:", error);
    return false;
  }

  return true;
}

/**
 * Update download status
 */
export async function updateDownloadStatus(
  downloadId: string,
  studentId: string,
  status: "ready" | "syncing" | "queued" | "error"
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("student_downloads")
    .update({ status })
    .eq("id", downloadId)
    .eq("student_id", studentId);

  if (error) {
    console.error("Error updating download status:", error);
    return false;
  }

  return true;
}

/**
 * Get downloads filtered by file type
 */
export async function getDownloadsByFileType(studentId: string, fileType: string): Promise<Download[]> {
  const supabase = await createClient();

  let query = supabase.from("student_downloads").select("*").eq("student_id", studentId);

  // Filter by file type category
  if (fileType === "Videos") {
    query = query.ilike("file_type", "video/%");
  } else if (fileType === "Documents") {
    query = query.or("file_type.ilike.%pdf%,file_type.ilike.%document%,file_type.ilike.%msword%");
  } else if (fileType === "Images") {
    query = query.ilike("file_type", "image/%");
  } else if (fileType === "Audio") {
    query = query.ilike("file_type", "audio/%");
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching downloads by file type:", error);
    return [];
  }

  return data || [];
}

/**
 * Get a single download by ID
 */
export async function getDownload(downloadId: string, studentId: string): Promise<Download | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_downloads")
    .select("*")
    .eq("id", downloadId)
    .eq("student_id", studentId)
    .single();

  if (error) {
    console.error("Error fetching download:", error);
    return null;
  }

  return data;
}
