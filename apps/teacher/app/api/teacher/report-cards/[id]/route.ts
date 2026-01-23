import { NextRequest, NextResponse } from "next/server";
import { getTeacherProfile } from "@/lib/dal/teacher";
import { getReportCard } from "@/lib/dal/report-cards";

/**
 * GET /api/teacher/report-cards/[id]
 *
 * Fetch a specific report card by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teacherProfile = await getTeacherProfile();

    if (!teacherProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportCard = await getReportCard(id);

    if (!reportCard) {
      return NextResponse.json(
        { error: "Report card not found" },
        { status: 404 }
      );
    }

    // TODO: Add authorization check to ensure teacher has access to this student's section

    return NextResponse.json({ reportCard });
  } catch (error) {
    console.error("Error fetching report card:", error);
    return NextResponse.json(
      { error: "Failed to fetch report card" },
      { status: 500 }
    );
  }
}
