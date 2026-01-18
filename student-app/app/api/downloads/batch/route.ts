import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Get download URLs for multiple files at once (for Download All feature)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { downloadIds } = body;

    if (!Array.isArray(downloadIds) || downloadIds.length === 0) {
      return NextResponse.json({ error: "Invalid download IDs" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile first (profiles table links auth_user_id to profile_id)
    const { data: profile } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get student ID using profile_id
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get all downloads
    const { data: downloads, error } = await supabase
      .from("student_downloads")
      .select("*")
      .eq("student_id", student.id)
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
