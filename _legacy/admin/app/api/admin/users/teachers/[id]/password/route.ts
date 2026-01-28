import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// POST /api/admin/users/teachers/[id]/password - Reset teacher password
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

    const { id: teacherId } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get teacher's profile to find auth_user_id
    const { data: teacher, error: teacherError } = await supabase
      .from("teacher_profiles")
      .select(`
        id,
        profile_id,
        school_profiles!inner (
          id,
          auth_user_id
        )
      `)
      .eq("id", teacherId)
      .single();

    if (teacherError || !teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const profile = teacher.school_profiles as unknown as { id: string; auth_user_id: string | null };

    if (!profile?.auth_user_id) {
      return NextResponse.json(
        { error: "Teacher has no linked auth account" },
        { status: 400 }
      );
    }

    // Use service role client to update password
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const adminClient = createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      profile.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }

    // Log audit event
    await supabase.rpc("log_audit", {
      p_action: "password_reset",
      p_entity_type: "teacher",
      p_entity_id: teacherId,
      p_metadata: { resetBy: admin.profile_id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/admin/users/teachers/[id]/password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
