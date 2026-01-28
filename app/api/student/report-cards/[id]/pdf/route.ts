import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { getReportCard } from "@/lib/dal/report-cards";
import { generateReportCardPDF } from "@/lib/report-cards/pdf-generator";

/**
 * GET /api/student/report-cards/[id]/pdf
 *
 * Generate and download a report card as PDF.
 * If a cached PDF exists in storage, redirects to that URL.
 * Otherwise, generates a fresh PDF on-the-fly.
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

    // If PDF is already generated and stored, redirect to it
    if (reportCard.pdf_url) {
      return NextResponse.redirect(reportCard.pdf_url);
    }

    // Get school info for PDF header
    const schoolInfo = reportCard.school || {
      id: reportCard.school_id,
      name: "Mindanao State University",
      address: "Marawi City, Lanao del Sur, Philippines",
      logo_url: undefined
    };

    // Generate PDF on-the-fly
    const pdfBuffer = await generateReportCardPDF(reportCard, schoolInfo);

    // Return the PDF
    const fileName = `report-card-${reportCard.grading_period?.name || "unknown"}-${reportCard.student_info.full_name}.pdf`
      .replace(/\s+/g, "-")
      .toLowerCase();

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(pdfBuffer);

    return new Response(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
