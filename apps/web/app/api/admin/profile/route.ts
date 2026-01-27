import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/dal/admin";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      adminProfileId: admin.adminId,
      profileId: admin.profileId,
      schoolId: admin.schoolId,
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
