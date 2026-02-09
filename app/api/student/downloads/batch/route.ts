import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";

/**
 * Get download URLs for multiple files at once (for Download All feature)
 * Uses JWT-based authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { downloadIds } = body;

    if (!Array.isArray(downloadIds) || downloadIds.length === 0) {
      return NextResponse.json({ error: "Invalid download IDs" }, { status: 400 });
    }

    // Use JWT-based authentication
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const supabase = createServiceClient();

    // Get all downloads
    const { data: downloads, error } = await supabase
      .from("student_downloads")
      .select("*")
      .eq("student_id", student.studentId)
      .in("id", downloadIds);

    if (error || !downloads) {
      return NextResponse.json({ error: "Failed to fetch downloads" }, { status: 500 });
    }

    // Generate URLs for each download
    const downloadUrls = await Promise.all(
      downloads.map(async (download) => {
        let url = download.file_url;

        // If file_url is a Supabase Storage path, generate signed URL
        if (download.file_url.startsWith("storage/")) {
          const bucket = download.file_url.split("/")[1];
          const path = download.file_url.replace(`storage/${bucket}/`, "");

          const { data: signedUrl } = await supabase.storage.from(bucket).createSignedUrl(path, 3600); // 1 hour

          if (signedUrl) {
            url = signedUrl.signedUrl;
          }
        }

        return {
          id: download.id,
          title: download.title,
          url,
          fileName: download.title + (download.file_type ? "." + download.file_type.split("/")[1] : ""),
        };
      })
    );

    return NextResponse.json({ downloads: downloadUrls });
  } catch (error) {
    console.error("Error preparing batch download:", error);
    return NextResponse.json({ error: "Failed to prepare downloads" }, { status: 500 });
  }
}
