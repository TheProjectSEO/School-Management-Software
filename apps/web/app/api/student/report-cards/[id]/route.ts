import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { getReportCard } from "@/lib/dal/report-cards";

/**
 * GET /api/student/report-cards/[id]
 *
 * Fetch a specific report card by ID with full data.
 * Uses JWT-based authentication.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use JWT-based authentication
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const { id } = await params;

    // Get the specific report card
    const reportCard = await getReportCard(id, student.studentId);

    if (!reportCard) {
      return NextResponse.json(
        { error: "Report card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ reportCard });
  } catch (error) {
    console.error("Error fetching report card:", error);
    return NextResponse.json(
      { error: "Failed to fetch report card" },
      { status: 500 }
    );
  }
}
