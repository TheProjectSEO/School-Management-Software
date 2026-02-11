import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";

/**
 * GET /api/student/messages/peers
 * Get available peer students the student can message
 * (same section or shared courses)
 */
export async function GET() {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const supabase = createServiceClient();

    const peerStudentIds = new Set<string>();

    // 1. Get students in the same section
    if (student.sectionId) {
      const { data: sectionStudents } = await supabase
        .from("students")
        .select("id, profile_id")
        .eq("section_id", student.sectionId)
        .neq("id", student.studentId);

      for (const s of sectionStudents || []) {
        peerStudentIds.add(s.profile_id);
      }
    }

    // 2. Get student's enrolled course_ids
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_id", student.studentId);

    const courseIds = (enrollments || []).map((e) => e.course_id);

    if (courseIds.length > 0) {
      // 3. Get all students enrolled in same courses
      const { data: courseEnrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .in("course_id", courseIds)
        .neq("student_id", student.studentId);

      const courseStudentIds = [...new Set((courseEnrollments || []).map((e) => e.student_id))];

      if (courseStudentIds.length > 0) {
        // Get profile_ids for these students
        const { data: studentProfiles } = await supabase
          .from("students")
          .select("id, profile_id")
          .in("id", courseStudentIds);

        for (const s of studentProfiles || []) {
          peerStudentIds.add(s.profile_id);
        }
      }
    }

    // Remove self
    peerStudentIds.delete(student.profileId);

    if (peerStudentIds.size === 0) {
      return NextResponse.json({ peers: [] });
    }

    // 4. Fetch profile data for all peers
    const { data: profiles } = await supabase
      .from("school_profiles")
      .select("id, full_name, avatar_url")
      .in("id", Array.from(peerStudentIds));

    const peers = (profiles || []).map((p) => ({
      profile_id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
    }));

    return NextResponse.json({ peers });
  } catch (error) {
    console.error("Error in GET /api/student/messages/peers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
