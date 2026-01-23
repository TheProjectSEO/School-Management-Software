import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("enrollment_qr_codes")
    .select("id, code, name, description, target_grade_levels, available_tracks, is_active, scan_count, application_count, expires_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("list qr codes error", error);
    return NextResponse.json({ error: "Failed to list QR codes" }, { status: 500 });
  }

  return NextResponse.json({ qrCodes: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServiceClient();

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
      created_by: body.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("create qr code error", error);
    return NextResponse.json({ error: "Failed to create QR code" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
