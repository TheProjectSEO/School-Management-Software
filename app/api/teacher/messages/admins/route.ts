import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";

/**
 * GET /api/teacher/messages/admins
 * Get available admins the teacher can message (same school)
 */
export async function GET() {
  try {
    const authResult = await requireTeacherAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { schoolId } = authResult.teacher;
    const supabase = createServiceClient();

    // Get admin profile_ids in the same school
    const { data: admins, error: adminsError } = await supabase
      .from("admins")
      .select("id, profile_id, role")
      .eq("school_id", schoolId);

    if (adminsError) {
      console.error("Error fetching admins:", adminsError);
      return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
    }

    if (!admins || admins.length === 0) {
      return NextResponse.json({ admins: [] });
    }

    // Fetch profile data separately
    const profileIds = admins.map((a) => a.profile_id);
    const { data: profiles } = await supabase
      .from("school_profiles")
      .select("id, full_name, avatar_url")
      .in("id", profileIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const adminsList = admins.map((admin) => {
      const profile = profileMap.get(admin.profile_id);
      return {
        admin_id: admin.id,
        profile_id: admin.profile_id,
        role: admin.role,
        full_name: profile?.full_name || "Admin",
        avatar_url: profile?.avatar_url,
      };
    });

    return NextResponse.json({ admins: adminsList });
  } catch (error) {
    console.error("Error in GET /api/teacher/messages/admins:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
