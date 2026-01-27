import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";

/**
 * POST /api/student/profile/avatar
 * Upload a new avatar image.
 * Uses JWT-based authentication.
 */
export async function POST(request: NextRequest) {
  try {
    // Use JWT-based authentication
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const supabase = await createClient();

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Generate unique filename using student userId
    const fileExt = file.name.split(".").pop();
    const fileName = `${student.userId}/${Date.now()}.${fileExt}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image. Please try again." },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    // Update profile with new avatar URL using profileId
    const { error: updateError } = await supabase
      .from("school_profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", student.profileId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatarUrl: publicUrl,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "An error occurred while uploading the image." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/student/profile/avatar
 * Remove the current avatar.
 * Uses JWT-based authentication.
 */
export async function DELETE() {
  try {
    // Use JWT-based authentication
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const supabase = await createClient();

    // Get current profile to find avatar URL
    const { data: profile, error: profileError } = await supabase
      .from("school_profiles")
      .select("avatar_url")
      .eq("id", student.profileId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    if (profile?.avatar_url) {
      // Extract file path from URL
      const urlParts = profile.avatar_url.split("/avatars/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        // Delete from storage
        await supabase.storage.from("avatars").remove([filePath]);
      }
    }

    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from("school_profiles")
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", student.profileId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { error: "An error occurred while removing the image." },
      { status: 500 }
    );
  }
}
