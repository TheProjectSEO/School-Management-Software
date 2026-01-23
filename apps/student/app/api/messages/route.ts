/**
 * API Route: Student Messages
 * GET - Get all conversations for the student
 */

import { NextResponse } from "next/server";
import {
  getCurrentStudent,
  getStudentConversations,
  getUnreadMessageCount,
} from "@/lib/dal";

export async function GET() {
  try {
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [conversations, unreadCount] = await Promise.all([
      getStudentConversations(student.id),
      getUnreadMessageCount(student.id),
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
