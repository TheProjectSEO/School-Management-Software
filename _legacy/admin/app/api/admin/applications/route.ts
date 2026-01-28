import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Number(searchParams.get("limit") || 50);

  let query = supabase
    .from("student_applications")
    .select(
      "id, first_name, last_name, email, phone, applying_for_grade, preferred_track, status, submitted_at, updated_at, qr_code_id"
    )
    .order("submitted_at", { ascending: false })
    .limit(Math.min(limit, 200));

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("admin applications list error", error);
    return NextResponse.json({ error: "Failed to list applications" }, { status: 500 });
  }

  return NextResponse.json({ applications: data });
}
