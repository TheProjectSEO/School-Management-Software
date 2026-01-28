import { NextRequest, NextResponse } from "next/server";
import { markNotificationAsRead } from "@/lib/dal";

export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const success = await markNotificationAsRead(notificationId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to mark notification as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in mark-read API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
