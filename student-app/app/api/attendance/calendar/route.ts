import { NextRequest, NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/dal";
import { getAttendanceCalendar } from "@/lib/dal/attendance";

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || "");
    const month = parseInt(searchParams.get("month") || "");

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid year or month parameter" },
        { status: 400 }
      );
    }

    const calendarEntries = await getAttendanceCalendar(student.id, year, month);

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
