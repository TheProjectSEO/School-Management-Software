/**
 * API Route: Student Conversation with Teacher
 * GET - Get messages in conversation
 * POST - Send a message to teacher (with quota enforcement)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentStudent,
  getConversationMessages,
  sendMessageToTeacher,
  markMessagesAsRead,
  getMessageQuota,
  getTeacherIdByProfileId,
} from "@/lib/dal";

interface RouteContext {
  params: Promise<{ teacherProfileId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teacherProfileId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get messages
    const messages = await getConversationMessages(
      student.id,
      teacherProfileId,
      { limit, offset }
    );

    // Get teacher ID for quota check
    const teacherId = await getTeacherIdByProfileId(teacherProfileId);
    let quota = null;
    if (teacherId) {
      quota = await getMessageQuota(student.id, teacherId);
    }

    // Mark messages as read
    await markMessagesAsRead(student.id, teacherProfileId);

    return NextResponse.json({
      messages,
      quota,
    });
  } catch (error) {
    console.error("Error in GET /api/messages/[teacherProfileId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teacherProfileId } = await context.params;
    const body = await request.json();
    const { message, attachments } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message body is required" },
        { status: 400 }
      );
    }

    // Get teacher ID from profile ID
    const teacherId = await getTeacherIdByProfileId(teacherProfileId);
    if (!teacherId) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    // Send message (quota enforcement happens in database function)
    const result = await sendMessageToTeacher(
      student.id,
      teacherId,
      student.school_id,
      message.trim(),
      attachments
    );

    if (!result.success) {
      const statusCode = result.error === "MESSAGE_LIMIT_REACHED" ? 429 : 400;
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
          quota: result.quota,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message_id: result.message_id,
      quota: result.quota,
    });
  } catch (error) {
    console.error("Error in POST /api/messages/[teacherProfileId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
