/**
 * API Route: Message Quota Check
 * GET - Check message quota for a specific teacher
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentStudent, getMessageQuota } from "@/lib/dal";

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get("teacherId");

    if (!teacherId) {
      return NextResponse.json(
        { error: "teacherId is required" },
        { status: 400 }
      );
    }

    const quota = await getMessageQuota(student.id, teacherId);

    return NextResponse.json({ quota });
  } catch (error) {
    console.error("Error in GET /api/messages/quota:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
