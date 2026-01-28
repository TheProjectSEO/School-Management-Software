import { NextRequest, NextResponse } from "next/server";
import { hasPermission, getCurrentAdmin } from "@/lib/dal/admin";
import { getTeacherById, resetUserPassword, getAuthUserIdFromProfileId, createAuthAccountForProfile } from "@/lib/dal/users";

// POST /api/admin/users/teachers/[id]/reset-password - Reset teacher password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canUpdate = await hasPermission("users:update");
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newPassword, email, createAccount } = body;

    // Get the teacher to find their profile_id
    const teacher = await getTeacherById(id);
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get the auth user ID from the profile
    let authUserId = await getAuthUserIdFromProfileId(teacher.profile_id);

    // If no auth account exists
    if (!authUserId) {
      // If createAccount flag is set and email is provided, create one
      if (createAccount && email) {
        const createResult = await createAuthAccountForProfile(
          teacher.profile_id,
          email,
          newPassword
        );

        if (!createResult.success) {
          return NextResponse.json({ error: createResult.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          temporaryPassword: createResult.password,
          accountCreated: true,
        });
      }

      // Otherwise return error indicating no auth account
      return NextResponse.json(
        {
          error: "Teacher does not have an auth account",
          code: "NO_AUTH_ACCOUNT",
          needsEmail: true
        },
        { status: 400 }
      );
    }

    // Reset the password
    const result = await resetUserPassword(authUserId, newPassword);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      temporaryPassword: result.password,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers/[id]/reset-password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
