/**
 * API Route for Urgent Announcements
 * GET - Get urgent/high-priority unread announcements for dashboard alerts
 */

import { NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { getUrgentAnnouncements } from "@/lib/dal";

export async function GET() {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }
    const { student } = authResult;

    const announcements = await getUrgentAnnouncements(student.studentId);

    return NextResponse.json({
      announcements,
      count: announcements.length,
    });
  } catch (error) {
    console.error("Error in GET /api/announcements/urgent:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
