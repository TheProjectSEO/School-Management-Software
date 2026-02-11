import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/dal/admin";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch school name
    let schoolName = "School";
    try {
      const supabase = createServiceClient();
      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", admin.schoolId)
        .maybeSingle();
      if (school?.name) schoolName = school.name;
    } catch {
      // ignore
    }

    return NextResponse.json({
      adminProfileId: admin.adminId,
      profileId: admin.profileId,
      schoolId: admin.schoolId,
      schoolName,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
