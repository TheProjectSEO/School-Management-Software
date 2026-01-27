/**
 * API Route for Urgent Announcements
 * GET - Get urgent/high-priority unread announcements for dashboard alerts
 */

import { NextResponse } from "next/server";
import { getCurrentStudent, getUrgentAnnouncements } from "@/lib/dal";

export async function GET() {
  try {
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const announcements = await getUrgentAnnouncements(student.id);

    return NextResponse.json({
      announcements,
      count: announcements.length,
    });
  } catch (error) {
    console.error("Error in GET /api/announcements/urgent:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
