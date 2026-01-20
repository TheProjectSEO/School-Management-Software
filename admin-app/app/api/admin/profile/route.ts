import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id, school_id")
      .eq("profile_id", profile.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      adminProfileId: adminProfile.id,
      profileId: profile.id,
      schoolId: adminProfile.school_id,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
