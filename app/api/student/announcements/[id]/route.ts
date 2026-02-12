/**
 * API Route for Single Announcement
 * GET - Get announcement details
 * POST - Mark announcement as read
 */

import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { getAnnouncementDetail, markAnnouncementAsRead } from "@/lib/dal";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }
    const { student } = authResult;

    const { id } = await params;
    const announcement = await getAnnouncementDetail(id, student.studentId);

    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("Error in GET /api/announcements/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }
    const { student } = authResult;

    const { id } = await params;
    const success = await markAnnouncementAsRead(id, student.studentId);

    if (!success) {
      return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/announcements/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
