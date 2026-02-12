import { NextResponse } from "next/server";
import { markAllNotificationsAsRead } from "@/lib/dal";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";

export async function POST() {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;

    const success = await markAllNotificationsAsRead(student.studentId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to mark all notifications as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in mark-all-read API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
