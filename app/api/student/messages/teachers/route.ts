/**
 * API Route: Available Teachers for Messaging
 * GET - Get list of teachers the student can message (from enrolled courses)
 */

import { NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { getAvailableTeachers } from "@/lib/dal";

export async function GET() {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }
    const { student } = authResult;

    const teachers = await getAvailableTeachers(student.studentId);

    return NextResponse.json({
      teachers,
    });
  } catch (error) {
    console.error("Error in GET /api/messages/teachers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
