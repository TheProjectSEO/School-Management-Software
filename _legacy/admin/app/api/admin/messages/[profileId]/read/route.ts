import { NextRequest, NextResponse } from "next/server";
import { markAsRead } from "@/lib/dal/messages";

interface RouteParams {
  params: Promise<{
    profileId: string;
  }>;
}

/**
 * POST /api/admin/messages/[profileId]/read
 * Mark all messages from a specific user as read
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { profileId } = await params;

    if (!profileId) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 }
      );
    }

    const result = await markAsRead(profileId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to mark messages as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} message(s) marked as read`,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/messages/[profileId]/read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
