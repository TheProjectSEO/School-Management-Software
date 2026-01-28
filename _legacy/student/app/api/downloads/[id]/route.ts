import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the download record
    const { data: download, error } = await supabase
      .from("student_downloads")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !download) {
      return NextResponse.json({ error: "Download not found" }, { status: 404 });
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

    // Verify student owns this download
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .single();

    if (!student || download.student_id !== student.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If file_url is a Supabase Storage path, generate signed URL
    if (download.file_url.startsWith("storage/")) {
      const bucket = download.file_url.split("/")[1];
      const path = download.file_url.replace(`storage/${bucket}/`, "");

      const { data: signedUrl } = await supabase.storage.from(bucket).createSignedUrl(path, 3600); // 1 hour

      if (signedUrl) {
        return NextResponse.json({ url: signedUrl.signedUrl });
      }
    }

    // Return the file URL directly
    return NextResponse.json({ url: download.file_url });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    // Delete the download
    const { error } = await supabase
      .from("student_downloads")
      .delete()
      .eq("id", id)
      .eq("student_id", student.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete download" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting download:", error);
    return NextResponse.json({ error: "Failed to delete download" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["ready", "syncing", "queued", "error"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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

    // Update the download status
    const { error } = await supabase
      .from("student_downloads")
      .update({ status })
      .eq("id", id)
      .eq("student_id", student.id);

    if (error) {
      return NextResponse.json({ error: "Failed to update download" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating download:", error);
    return NextResponse.json({ error: "Failed to update download" }, { status: 500 });
  }
}
