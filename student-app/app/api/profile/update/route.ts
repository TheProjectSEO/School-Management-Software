import { NextRequest, NextResponse } from "next/server";
import { updateStudentProfile } from "@/lib/dal/student";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, full_name, phone } = body;

    // Validate required fields
    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    // Validate full_name
    if (full_name !== undefined) {
      const trimmedName = full_name.trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Full name cannot be empty" }, { status: 400 });
      }
      if (trimmedName.length < 2) {
        return NextResponse.json(
          { error: "Full name must be at least 2 characters" },
          { status: 400 }
        );
      }
    }

    // Validate phone format (if provided)
    if (phone !== undefined && phone.trim()) {
      const phoneRegex = /^(\+63|0)?9\d{9}$/;
      const cleanPhone = phone.replace(/[\s\-()]/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        return NextResponse.json(
          { error: "Please enter a valid Philippine phone number" },
          { status: 400 }
        );
      }
    }

    // Verify the user owns this profile
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify profile belongs to user
    const { data: profile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("auth_user_id")
      .eq("id", profileId)
      .maybeSingle();

    if (profileCheckError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.auth_user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this profile" },
        { status: 403 }
      );
    }

    // Prepare updates object
    const updates: { full_name?: string; phone?: string } = {};

    if (full_name !== undefined) {
      updates.full_name = full_name.trim();
    }

    if (phone !== undefined) {
      updates.phone = phone.trim();
    }

    // Update profile in Supabase
    const updatedProfile = await updateStudentProfile(profileId, updates);

    if (!updatedProfile) {
      return NextResponse.json(
        { error: "Failed to update profile. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        id: updatedProfile.id,
        full_name: updatedProfile.full_name,
        phone: updatedProfile.phone,
        avatar_url: updatedProfile.avatar_url,
        updated_at: updatedProfile.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in profile update API:", error);
    return NextResponse.json(
      {
        error: "An error occurred while updating your profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
