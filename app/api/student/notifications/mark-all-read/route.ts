import { NextRequest, NextResponse } from "next/server";
import { markAllNotificationsAsRead } from "@/lib/dal";

export async function POST(request: NextRequest) {
  try {
    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const success = await markAllNotificationsAsRead(studentId);

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
