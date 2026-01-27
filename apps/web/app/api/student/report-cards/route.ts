import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import {
  getStudentReportCards,
  getReportCard,
  getLatestReportCard,
  getAvailableReportCardPeriods,
  countStudentReportCards,
} from "@/lib/dal/report-cards";

/**
 * GET /api/student/report-cards
 *
 * Fetch student report cards with full data (grades, GPA, attendance, remarks).
 *
 * Query parameters:
 * - id: Optional report card ID to get a specific report card
 * - latest: Set to "true" to get only the most recent report card
 * - periods: Set to "true" to get available grading periods
 * - count: Set to "true" to get count only
 */
export async function GET(request: NextRequest) {
  try {
    // Use JWT-based authentication
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }

    const { student } = authResult;
    const searchParams = request.nextUrl.searchParams;
    const reportCardId = searchParams.get("id");
    const getLatest = searchParams.get("latest") === "true";
    const getPeriods = searchParams.get("periods") === "true";
    const getCount = searchParams.get("count") === "true";

    // Get count only
    if (getCount) {
      const count = await countStudentReportCards(student.studentId);
      return NextResponse.json({ count });
    }

    // Get available grading periods
    if (getPeriods) {
      const periods = await getAvailableReportCardPeriods(student.studentId);
      return NextResponse.json({ periods });
    }

    // Get latest report card only
    if (getLatest) {
      const reportCard = await getLatestReportCard(student.studentId);
      if (!reportCard) {
        return NextResponse.json(
          { error: "No report cards available" },
          { status: 404 }
        );
      }
      return NextResponse.json({ reportCard });
    }

    // If ID is provided, get specific report card
    if (reportCardId) {
      const reportCard = await getReportCard(reportCardId, student.studentId);
      if (!reportCard) {
        return NextResponse.json(
          { error: "Report card not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ reportCard });
    }

    // Otherwise, return all report cards
    const reportCards = await getStudentReportCards(student.studentId);
    return NextResponse.json({ reportCards });
  } catch (error) {
    console.error("Error fetching report cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch report cards" },
      { status: 500 }
    );
  }
}
