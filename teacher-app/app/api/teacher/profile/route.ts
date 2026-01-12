// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * GET /api/teacher/profile
 * Fetch teacher profile details
 */
export async function GET() {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;

  try {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("n8n_content_creation.teacher_profiles")
      .select(
        `
        *,
        school:n8n_content_creation.schools(id, name, logo_url),
        profile:profiles(
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        )
      `
      )
      .eq("id", teacherId)
      .single();

    if (error) {
      console.error("Error fetching teacher profile:", error);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Teacher profile GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/teacher/profile
 * Update teacher profile
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, profileId } = authResult.context;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      firstName,
      lastName,
      phone,
      avatarUrl,
      bio,
      specialization,
      officeHours,
    } = body;

    // Update base profile if name/phone/avatar changed
    if (firstName || lastName || phone || avatarUrl) {
      const profileUpdates: any = {};
      if (firstName) profileUpdates.first_name = firstName.trim();
      if (lastName) profileUpdates.last_name = lastName.trim();
      if (phone !== undefined) profileUpdates.phone = phone?.trim() || null;
      if (avatarUrl !== undefined)
        profileUpdates.avatar_url = avatarUrl?.trim() || null;

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", profileId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        return NextResponse.json(
          { error: "Failed to update profile" },
          { status: 500 }
        );
      }
    }

    // Update teacher-specific fields
    if (bio !== undefined || specialization || officeHours !== undefined) {
      const teacherUpdates: any = {};
      if (bio !== undefined) teacherUpdates.bio = bio?.trim() || null;
      if (specialization)
        teacherUpdates.specialization = specialization.trim();
      if (officeHours !== undefined)
        teacherUpdates.office_hours = officeHours || null;

      const { error: teacherError } = await supabase
        .from("n8n_content_creation.teacher_profiles")
        .update(teacherUpdates)
        .eq("id", teacherId);

      if (teacherError) {
        console.error("Error updating teacher profile:", teacherError);
        return NextResponse.json(
          { error: "Failed to update teacher profile" },
          { status: 500 }
        );
      }
    }

    // Fetch updated profile
    const { data: updatedProfile, error: fetchError } = await supabase
      .from("n8n_content_creation.teacher_profiles")
      .select(
        `
        *,
        school:n8n_content_creation.schools(id, name, logo_url),
        profile:profiles(
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        )
      `
      )
      .eq("id", teacherId)
      .single();

    if (fetchError) {
      console.error("Error fetching updated profile:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch updated profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("Teacher profile PATCH error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
