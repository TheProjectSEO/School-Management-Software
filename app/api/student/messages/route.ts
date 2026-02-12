/**
 * API Route: Student Messages
 * GET - Get all conversations for the student
 */

import { NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import {
  getStudentConversations,
  getUnreadMessageCount,
} from "@/lib/dal";

export async function GET() {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }
    const { student } = authResult;

    const [conversations, unreadCount] = await Promise.all([
      getStudentConversations(student.studentId),
      getUnreadMessageCount(student.studentId),
    ]);

    return NextResponse.json({
      conversations,
      unreadCount,
    });
  } catch (error) {
    console.error("Error in GET /api/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
