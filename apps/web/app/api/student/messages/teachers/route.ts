/**
 * API Route: Available Teachers for Messaging
 * GET - Get list of teachers the student can message (from enrolled courses)
 */

import { NextResponse } from "next/server";
import { getCurrentStudent, getAvailableTeachers } from "@/lib/dal";

export async function GET() {
  try {
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teachers = await getAvailableTeachers(student.id);

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
