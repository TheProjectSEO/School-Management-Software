import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * POST /api/teacher/profile/avatar
 * Upload a new avatar image.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireTeacherAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { teacher } = authResult;
    const supabase = createServiceClient();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${teacher.userId}/${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
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

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("school_profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teacher.profileId);

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
 * DELETE /api/teacher/profile/avatar
 * Remove the current avatar.
 */
export async function DELETE() {
  try {
    const authResult = await requireTeacherAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { teacher } = authResult;
    const supabase = createServiceClient();

    const { data: profile, error: profileError } = await supabase
      .from("school_profiles")
      .select("avatar_url")
      .eq("id", teacher.profileId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    if (profile?.avatar_url) {
      const urlParts = profile.avatar_url.split("/avatars/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("avatars").remove([filePath]);
      }
    }

    const { error: updateError } = await supabase
      .from("school_profiles")
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teacher.profileId);

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
