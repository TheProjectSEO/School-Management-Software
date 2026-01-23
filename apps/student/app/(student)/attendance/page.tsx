import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/dal";
import { getAttendanceSummary, getAttendanceCalendar } from "@/lib/dal/attendance";
import AttendanceClient from "./AttendanceClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attendance | MSU Student Portal",
  description: "View your attendance record, calendar, and statistics at Mindanao State University.",
};

export const revalidate = 300; // 5 minutes - attendance data

export default async function AttendancePage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Get current month and year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Fetch attendance data in parallel
  const [summary, calendarEntries] = await Promise.all([
    getAttendanceSummary(student.id),
    getAttendanceCalendar(student.id, currentYear, currentMonth),
  ]);

  return (
    <AttendanceClient
      initialSummary={summary}
      initialCalendar={calendarEntries}
      initialYear={currentYear}
      initialMonth={currentMonth}
      studentId={student.id}
    />
  );
}
