/**
 * API Route for Student Announcements
 * GET - Get announcements targeted to the current student
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentStudent, getStudentAnnouncements, getUnreadAnnouncementCount } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const priority = searchParams.get("priority") as "low" | "normal" | "high" | "urgent" | null;

    const [announcements, unreadCount] = await Promise.all([
      getStudentAnnouncements(student.id, {
        page,
        pageSize,
        unreadOnly,
        priority: priority || undefined,
      }),
      getUnreadAnnouncementCount(student.id),
    ]);

    return NextResponse.json({
      announcements,
      unreadCount,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error in GET /api/announcements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
