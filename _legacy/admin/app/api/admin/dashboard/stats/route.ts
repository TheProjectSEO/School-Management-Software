import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/dal/admin";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Dashboard stats are readable by any authenticated admin

    const supabase = await createClient();

    const [
      { count: totalStudents },
      { count: totalTeachers },
      { count: totalCourses },
      { count: totalSections },
      { count: activeEnrollments },
      { count: pendingEnrollments },
    ] = await Promise.all([
      supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("school_id", admin.school_id)
        .eq("status", "active"),
      supabase
        .from("teacher_profiles")
        .select("*", { count: "exact", head: true })
        .eq("school_id", admin.school_id)
        .eq("is_active", true),
      supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("school_id", admin.school_id)
        .eq("is_active", true),
      supabase
        .from("sections")
        .select("*", { count: "exact", head: true })
        .eq("school_id", admin.school_id)
        .eq("is_active", true),
      supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("school_id", admin.school_id)
        .eq("status", "active"),
      supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("school_id", admin.school_id)
        .eq("status", "pending"),
    ]);

    return NextResponse.json({
      totalStudents: totalStudents || 0,
      totalTeachers: totalTeachers || 0,
      totalCourses: totalCourses || 0,
      totalSections: totalSections || 0,
      activeEnrollments: activeEnrollments || 0,
      pendingEnrollments: pendingEnrollments || 0,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/dashboard/stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
