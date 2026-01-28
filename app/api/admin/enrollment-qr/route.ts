import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasPermission } from "@/lib/dal/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canRead = await hasPermission("settings:read");
    if (!canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("enrollment_qr_codes")
      .select("id, code, name, description, target_grade_levels, available_tracks, is_active, scan_count, application_count, expires_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("list qr codes error", error);
      return NextResponse.json({ error: "Failed to list QR codes" }, { status: 500 });
    }

    return NextResponse.json({ qrCodes: data });
  } catch (error) {
    console.error("Error in GET /api/admin/enrollment-qr:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canCreate = await hasPermission("settings:update");
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("enrollment_qr_codes")
      .insert({
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        target_grade_levels: body.targetGradeLevels ?? [],
        available_tracks: body.availableTracks ?? [],
        max_applications: body.maxApplications ?? null,
        expires_at: body.expiresAt ?? null,
        is_active: true,
        enrollment_url: body.enrollmentUrl ?? null,
        qr_image_url: body.qrImageUrl ?? null,
        created_by: admin.adminId,
        school_id: admin.schoolId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("create qr code error", error);
      return NextResponse.json({ error: "Failed to create QR code" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error("Error in POST /api/admin/enrollment-qr:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
