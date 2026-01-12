import { NextRequest, NextResponse } from "next/server";
import { getTeacherProfile } from "@/lib/dal/teacher";
import { getReportCard } from "@/lib/dal/report-cards";

/**
 * GET /api/teacher/report-cards/[id]/pdf
 *
 * Get or generate PDF for a report card.
 * If PDF exists, redirects to stored URL.
 * Otherwise returns 404 (teachers can't generate on-the-fly,
 * PDFs are generated during report card creation/approval).
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

    // If PDF exists, redirect to it
    if (reportCard.pdf_url) {
      return NextResponse.redirect(reportCard.pdf_url);
    }

    // PDF not yet generated
    return NextResponse.json(
      { error: "PDF not yet generated for this report card" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching PDF:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDF" },
      { status: 500 }
    );
  }
}
