import { NextRequest, NextResponse } from "next/server";
import { requireStudentAPI } from "@/lib/auth/requireStudentAPI";
import { getAttendanceCalendar } from "@/lib/dal/attendance";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStudentAPI();
    if (!authResult.success) {
      return authResult.response;
    }
    const { student } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || "");
    const month = parseInt(searchParams.get("month") || "");

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid year or month parameter" },
        { status: 400 }
      );
    }

    const calendarEntries = await getAttendanceCalendar(student.studentId, year, month);

    return NextResponse.json({
      year,
      month,
      days: calendarEntries,
    });
  } catch (error) {
    console.error("Error fetching attendance calendar:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance calendar" },
      { status: 500 }
    );
  }
}
