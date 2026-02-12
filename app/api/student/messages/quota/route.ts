/**
 * API Route: Message Quota Check
 * GET - Check message quota for a specific teacher
 */

import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { getMessageQuota } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }
    const { student } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get("teacherId");

    if (!teacherId) {
      return NextResponse.json(
        { error: "teacherId is required" },
        { status: 400 }
      );
    }

    const quota = await getMessageQuota(student.studentId, teacherId);

    return NextResponse.json({ quota });
  } catch (error) {
    console.error("Error in GET /api/messages/quota:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
