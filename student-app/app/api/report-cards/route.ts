import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentReportCards,
  getReportCard,
  getLatestReportCard,
  getAvailableReportCardPeriods,
  countStudentReportCards,
} from "@/lib/dal/report-cards";

/**
 * GET /api/report-cards
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
      .from("profiles")
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

    const searchParams = request.nextUrl.searchParams;
    const reportCardId = searchParams.get("id");
    const getLatest = searchParams.get("latest") === "true";
    const getPeriods = searchParams.get("periods") === "true";
    const getCount = searchParams.get("count") === "true";

    // Get count only
    if (getCount) {
      const count = await countStudentReportCards(student.id);
      return NextResponse.json({ count });
    }

    // Get available grading periods
    if (getPeriods) {
      const periods = await getAvailableReportCardPeriods(student.id);
      return NextResponse.json({ periods });
    }

    // Get latest report card only
    if (getLatest) {
      const reportCard = await getLatestReportCard(student.id);
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
      const reportCard = await getReportCard(reportCardId, student.id);
      if (!reportCard) {
        return NextResponse.json(
          { error: "Report card not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ reportCard });
    }

    // Otherwise, return all report cards
    const reportCards = await getStudentReportCards(student.id);
    return NextResponse.json({ reportCards });
  } catch (error) {
    console.error("Error fetching report cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch report cards" },
      { status: 500 }
    );
  }
}
