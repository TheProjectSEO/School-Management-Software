import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { addTeacherRemarks } from "@/lib/dal/report-cards";

/**
 * POST /api/teacher/report-cards/[id]/remarks
 *
 * Add teacher remarks to a report card.
 *
 * Body:
 * - subject: Subject name
 * - subject_code: Subject code (optional)
 * - remarks: The remarks text
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireTeacherAPI();
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { subject, subject_code, remarks } = body;

    if (!subject || !remarks) {
      return NextResponse.json(
        { error: "Missing required fields: subject, remarks" },
        { status: 400 }
      );
    }

    const updatedReportCard = await addTeacherRemarks({
      report_card_id: id,
      teacher_id: auth.teacher.teacherId,
      teacher_name: auth.teacher.fullName || "Unknown Teacher",
      subject,
      subject_code,
      remarks,
    });

    if (!updatedReportCard) {
      return NextResponse.json(
        { error: "Failed to add remarks" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reportCard: updatedReportCard,
    });
  } catch (error) {
    console.error("Error adding remarks:", error);
    return NextResponse.json(
      { error: "Failed to add remarks" },
      { status: 500 }
    );
  }
}
