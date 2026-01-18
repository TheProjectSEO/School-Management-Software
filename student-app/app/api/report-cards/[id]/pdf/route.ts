import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReportCard } from "@/lib/dal/report-cards";
import { generateReportCardPDF } from "@/lib/report-cards/pdf-generator";

/**
 * GET /api/report-cards/[id]/pdf
 *
 * Generate and download a report card as PDF.
 * If a cached PDF exists in storage, redirects to that URL.
 * Otherwise, generates a fresh PDF on-the-fly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get profile first (profiles table links auth_user_id to profile_id)
    const { data: profile } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Get student ID from the database using profile_id
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Get the specific report card
    const reportCard = await getReportCard(id, student.id);

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
