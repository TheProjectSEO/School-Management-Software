import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

// Columns on teacher_profiles: id, profile_id, school_id, employee_id,
// department, specialization, is_active, created_at, updated_at

const TEACHER_SELECT = `
  id,
  profile_id,
  school_id,
  employee_id,
  department,
  specialization,
  is_active,
  created_at,
  updated_at
`;

const PROFILE_SELECT = `id, full_name, phone, avatar_url`;

/**
 * GET /api/teacher/profile
 * Fetch teacher profile details
 */
export async function GET() {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.teacher;

  try {
    const supabase = createServiceClient();

    // Fetch teacher_profiles
    const { data: teacherProfile, error } = await supabase
      .from("teacher_profiles")
      .select(TEACHER_SELECT)
      .eq("id", teacherId)
      .single();

    if (error || !teacherProfile) {
      console.error("Error fetching teacher profile:", error);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    // Fetch school_profiles separately (no FK join)
    const { data: schoolProfile } = await supabase
      .from("school_profiles")
      .select(PROFILE_SELECT)
      .eq("id", teacherProfile.profile_id)
      .single();

    // Fetch school separately
    const { data: school } = await supabase
      .from("schools")
      .select("id, name, logo_url")
      .eq("id", teacherProfile.school_id)
      .single();

    const profile = {
      ...teacherProfile,
      profile: schoolProfile || null,
      school: school || null,
    };

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
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, profileId } = authResult.teacher;

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { fullName, phone, department, specialization } = body;

    // Update school_profiles (full_name, phone)
    if (fullName || phone !== undefined) {
      const profileUpdates: Record<string, string | null> = {};
      if (fullName) profileUpdates.full_name = fullName.trim();
      if (phone !== undefined) profileUpdates.phone = phone?.trim() || null;

      const { error: profileError } = await supabase
        .from("school_profiles")
        .update(profileUpdates)
        .eq("id", profileId);

      if (profileError) {
        console.error("Error updating school_profiles:", profileError);
        return NextResponse.json(
          { error: "Failed to update profile" },
          { status: 500 }
        );
      }
    }

    // Update teacher_profiles (department, specialization)
    if (department !== undefined || specialization !== undefined) {
      const teacherUpdates: Record<string, string | null> = {};
      if (department !== undefined) teacherUpdates.department = department?.trim() || null;
      if (specialization !== undefined) teacherUpdates.specialization = specialization?.trim() || null;
      teacherUpdates.updated_at = new Date().toISOString();

      const { error: teacherError } = await supabase
        .from("teacher_profiles")
        .update(teacherUpdates)
        .eq("id", teacherId);

      if (teacherError) {
        console.error("Error updating teacher_profiles:", teacherError);
        return NextResponse.json(
          { error: "Failed to update teacher profile" },
          { status: 500 }
        );
      }
    }

    // Fetch updated profile (flat queries)
    const { data: teacherProfile } = await supabase
      .from("teacher_profiles")
      .select(TEACHER_SELECT)
      .eq("id", teacherId)
      .single();

    const { data: schoolProfile } = await supabase
      .from("school_profiles")
      .select(PROFILE_SELECT)
      .eq("id", profileId)
      .single();

    const { data: school } = await supabase
      .from("schools")
      .select("id, name, logo_url")
      .eq("id", teacherProfile?.school_id)
      .single();

    const updatedProfile = {
      ...teacherProfile,
      profile: schoolProfile || null,
      school: school || null,
    };

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("Teacher profile PATCH error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
