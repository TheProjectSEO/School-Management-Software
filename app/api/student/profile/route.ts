import { NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/student/profile
 * Returns basic student profile info including avatar_url and grade_level.
 */
export async function GET() {
  const authResult = await requireStudentAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  const { student } = authResult;
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("school_profiles")
    .select("full_name, avatar_url")
    .eq("id", student.profileId)
    .single();

  // Fetch grade_level from students table
  const { data: studentRecord } = await supabase
    .from("students")
    .select("grade_level")
    .eq("profile_id", student.profileId)
    .single();

  return NextResponse.json({
    full_name: profile?.full_name || student.fullName,
    avatar_url: profile?.avatar_url || null,
    grade_level: studentRecord?.grade_level || null,
  });
}
