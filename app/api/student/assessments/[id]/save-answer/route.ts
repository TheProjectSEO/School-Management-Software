import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { saveAnswer } from "@/lib/dal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { submissionId, questionId, selectedOptionId, textAnswer } = body;

    if (!submissionId || !questionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save the answer
    const success = await saveAnswer(submissionId, questionId, selectedOptionId, textAnswer);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save answer" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving answer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
