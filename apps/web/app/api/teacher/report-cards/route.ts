import { NextRequest, NextResponse } from "next/server";
import { getTeacherProfile } from "@/lib/dal/teacher";
import {
  getTeacherReportCards,
  getSectionReportCardsList,
  countReportCardsByStatus,
  submitForReview,
} from "@/lib/dal/report-cards";
import type { ReportCardFilters } from "@/lib/types/report-card";

/**
 * GET /api/teacher/report-cards
 *
 * Fetch report cards for teacher's sections.
 *
 * Query parameters:
 * - section_id: Filter by section
 * - grading_period_id: Filter by grading period
 * - status: Filter by status (draft, pending_review, approved, released)
 * - list: Set to "true" to get compact list format
 * - stats: Set to "true" to get status counts only
 */
export async function GET(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile();

    if (!teacherProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sectionId = searchParams.get("section_id");
    const gradingPeriodId = searchParams.get("grading_period_id");
    const status = searchParams.get("status") as ReportCardFilters["status"];
    const getList = searchParams.get("list") === "true";
    const getStats = searchParams.get("stats") === "true";

    // Get status counts
    if (getStats) {
      const stats = await countReportCardsByStatus(
        teacherProfile.id,
        gradingPeriodId || undefined
      );
      return NextResponse.json({ stats });
    }

    // Get compact list for a section
    if (getList && sectionId) {
      const list = await getSectionReportCardsList(
        sectionId,
        gradingPeriodId || undefined
      );
      return NextResponse.json({ reportCards: list });
    }

    // Get full report cards with filters
    const filters: ReportCardFilters = {};
    if (sectionId) filters.section_id = sectionId;
    if (gradingPeriodId) filters.grading_period_id = gradingPeriodId;
    if (status) filters.status = status;

    const reportCards = await getTeacherReportCards(teacherProfile.id, filters);
    return NextResponse.json({ reportCards });
  } catch (error) {
    console.error("Error fetching teacher report cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch report cards" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/teacher/report-cards
 *
 * Bulk actions on report cards.
 *
 * Body:
 * - action: "submit_for_review"
 * - report_card_ids: Array of report card IDs
 */
export async function POST(request: NextRequest) {
  try {
    const teacherProfile = await getTeacherProfile();

    if (!teacherProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, report_card_ids } = body;

    if (!action || !report_card_ids || !Array.isArray(report_card_ids)) {
      return NextResponse.json(
        { error: "Missing required fields: action, report_card_ids" },
        { status: 400 }
      );
    }

    if (action === "submit_for_review") {
      const result = await submitForReview(report_card_ids);
      return NextResponse.json({
        success: true,
        updated: result.updated,
        errors: result.errors,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing report card action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
