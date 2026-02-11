"use client";

import { useState, useEffect, useCallback } from "react";
import { AttendanceCalendar, AttendanceStats } from "@/components/attendance";
import { useStudentTheme } from "@/components/student/providers/StudentThemeProvider";
import type { AttendanceSummary, AttendanceCalendarEntry } from "@/lib/dal/types/attendance";

interface AttendanceClientProps {
  initialSummary: AttendanceSummary;
  initialCalendar: AttendanceCalendarEntry[];
  initialYear: number;
  initialMonth: number;
  studentId: string;
}

export default function AttendanceClient({
  initialSummary,
  initialCalendar,
  initialYear,
  initialMonth,
  studentId,
}: AttendanceClientProps) {
  const { isPlayful } = useStudentTheme();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [calendarData, setCalendarData] = useState(initialCalendar);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "stats">("calendar");

  // Fetch calendar data when month changes
  const fetchCalendarData = useCallback(async (newYear: number, newMonth: number) => {
    if (newYear === initialYear && newMonth === initialMonth) {
      setCalendarData(initialCalendar);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/attendance/calendar?year=${newYear}&month=${newMonth}`
      );
      if (response.ok) {
        const data = await response.json();
        setCalendarData(data.days || []);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [initialYear, initialMonth, initialCalendar]);

  // Handle month navigation
  const handleMonthChange = useCallback((newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    fetchCalendarData(newYear, newMonth);
  }, [fetchCalendarData]);

  // Format month/year for display
  const formatMonthYear = () => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Check if there's no attendance data
  const hasNoAttendanceData = initialSummary.totalDays === 0 && calendarData.length === 0;

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold leading-tight tracking-tight ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
            {isPlayful ? "\u2705 My Attendance" : "My Attendance"}
          </h1>
          <p className={`text-base mt-2 ${isPlayful ? "text-purple-600" : "text-slate-500 dark:text-slate-400"}`}>
            {isPlayful
              ? "\u{1F31F} Let's see how many days you came to school!"
              : "Track your attendance record and punctuality."}
          </p>
        </div>
      </div>

      {/* No Data Message */}
      {hasNoAttendanceData && (
        <div className={`p-6 mb-6 ${
          isPlayful
            ? "bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl"
            : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
        }`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              {isPlayful ? (
                <span className="text-[24px]">{"\u{1F44B}"}</span>
              ) : (
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[24px]">
                  info
                </span>
              )}
            </div>
            <div>
              <h3 className={`font-bold mb-1 ${isPlayful ? "text-purple-900" : "text-blue-900 dark:text-blue-200"}`}>
                {isPlayful ? "No Attendance Yet!" : "No Attendance Data Available"}
              </h3>
              <p className={`text-sm ${isPlayful ? "text-purple-700" : "text-blue-800 dark:text-blue-300"}`}>
                {isPlayful
                  ? "\u{1F31F} Your attendance will show up here once your teacher starts taking it. Don't worry, you're all set!"
                  : "Your attendance records will appear here once your instructors begin recording attendance. As a new student, this is normal."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm transition-colors ${
            isPlayful ? "rounded-xl" : "rounded-lg"
          } ${
            activeTab === "calendar"
              ? isPlayful
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                : "bg-primary text-white"
              : isPlayful
                ? "bg-white border-2 border-pink-200 text-purple-700 hover:bg-pink-50"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          {isPlayful ? (
            <span className="text-[20px]">{"\u{1F4C5}"}</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          )}
          <span>{isPlayful ? "Calendar" : "Calendar View"}</span>
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm transition-colors ${
            isPlayful ? "rounded-xl" : "rounded-lg"
          } ${
            activeTab === "stats"
              ? isPlayful
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                : "bg-primary text-white"
              : isPlayful
                ? "bg-white border-2 border-pink-200 text-purple-700 hover:bg-pink-50"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          {isPlayful ? (
            <span className="text-[20px]">{"\u{1F4CA}"}</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">analytics</span>
          )}
          <span>{isPlayful ? "My Stats" : "Statistics"}</span>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {activeTab === "calendar" ? (
          <>
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Attendance Rate Card */}
              <div className={`p-4 ${
                isPlayful
                  ? "bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200"
                  : "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              }`}>
                <div className="flex items-center gap-3">
                  {isPlayful ? (
                    <div className="size-10 rounded-xl bg-pink-200/60 flex items-center justify-center">
                      <span className="text-lg">{"\u{1F31F}"}</span>
                    </div>
                  ) : (
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">percent</span>
                    </div>
                  )}
                  <div>
                    <p className={`text-xl font-black ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
                      {initialSummary.attendanceRate.toFixed(1)}%
                    </p>
                    <p className={`text-xs font-medium ${isPlayful ? "text-purple-600" : "text-slate-500 dark:text-slate-400"}`}>
                      {isPlayful ? "Score!" : "Attendance"}
                    </p>
                  </div>
                </div>
              </div>
              {/* Present Days Card */}
              <div className={`p-4 ${
                isPlayful
                  ? "bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200"
                  : "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              }`}>
                <div className="flex items-center gap-3">
                  {isPlayful ? (
                    <div className="size-10 rounded-xl bg-green-200/60 flex items-center justify-center">
                      <span className="text-lg">{"\u2705"}</span>
                    </div>
                  ) : (
                    <div className="size-10 rounded-lg bg-msu-green/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-msu-green">check_circle</span>
                    </div>
                  )}
                  <div>
                    <p className={`text-xl font-black ${isPlayful ? "text-green-800" : "text-slate-900 dark:text-white"}`}>
                      {initialSummary.presentDays}
                    </p>
                    <p className={`text-xs font-medium ${isPlayful ? "text-green-600" : "text-slate-500 dark:text-slate-400"}`}>
                      {isPlayful ? "Present!" : "Present"}
                    </p>
                  </div>
                </div>
              </div>
              {/* Late Days Card */}
              <div className={`p-4 ${
                isPlayful
                  ? "bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-200"
                  : "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              }`}>
                <div className="flex items-center gap-3">
                  {isPlayful ? (
                    <div className="size-10 rounded-xl bg-yellow-200/60 flex items-center justify-center">
                      <span className="text-lg">{"\u23F0"}</span>
                    </div>
                  ) : (
                    <div className="size-10 rounded-lg bg-msu-gold/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-yellow-600 dark:text-msu-gold">
                        schedule
                      </span>
                    </div>
                  )}
                  <div>
                    <p className={`text-xl font-black ${isPlayful ? "text-yellow-800" : "text-slate-900 dark:text-white"}`}>
                      {initialSummary.lateDays}
                    </p>
                    <p className={`text-xs font-medium ${isPlayful ? "text-yellow-600" : "text-slate-500 dark:text-slate-400"}`}>
                      {isPlayful ? "Late" : "Late"}
                    </p>
                  </div>
                </div>
              </div>
              {/* Absent Days Card */}
              <div className={`p-4 ${
                isPlayful
                  ? "bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl border-2 border-red-200"
                  : "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              }`}>
                <div className="flex items-center gap-3">
                  {isPlayful ? (
                    <div className="size-10 rounded-xl bg-red-200/60 flex items-center justify-center">
                      <span className="text-lg">{"\u274C"}</span>
                    </div>
                  ) : (
                    <div className="size-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                        cancel
                      </span>
                    </div>
                  )}
                  <div>
                    <p className={`text-xl font-black ${isPlayful ? "text-red-800" : "text-slate-900 dark:text-white"}`}>
                      {initialSummary.absentDays}
                    </p>
                    <p className={`text-xs font-medium ${isPlayful ? "text-red-600" : "text-slate-500 dark:text-slate-400"}`}>
                      {isPlayful ? "Absent" : "Absent"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="relative">
              {isLoading && (
                <div className={`absolute inset-0 z-10 flex items-center justify-center rounded-2xl ${
                  isPlayful ? "bg-pink-50/70" : "bg-white/60 dark:bg-slate-800/60"
                }`}>
                  <div className={`flex items-center gap-3 px-4 py-2 shadow-lg ${
                    isPlayful
                      ? "bg-white rounded-xl border-2 border-pink-200"
                      : "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                  }`}>
                    {isPlayful ? (
                      <span className="text-lg animate-bounce">{"\u{1F31F}"}</span>
                    ) : (
                      <span className="material-symbols-outlined animate-spin text-primary">
                        progress_activity
                      </span>
                    )}
                    <span className={`text-sm font-medium ${isPlayful ? "text-purple-700" : "text-slate-600 dark:text-slate-300"}`}>
                      {isPlayful ? "Loading..." : "Loading..."}
                    </span>
                  </div>
                </div>
              )}
              <AttendanceCalendar
                year={year}
                month={month}
                days={calendarData}
                onMonthChange={handleMonthChange}
              />
            </div>

            {/* Month Navigation Hint */}
            <div className={`text-center text-sm ${isPlayful ? "text-purple-500" : "text-slate-500 dark:text-slate-400"}`}>
              {isPlayful ? (
                <>
                  <span className="mr-1">{"\u{1F449}"}</span>
                  Tap on a colored day to see more details!
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px] align-text-bottom mr-1">
                    touch_app
                  </span>
                  Click on any colored day to see course-level attendance details
                </>
              )}
            </div>
          </>
        ) : (
          <AttendanceStats summary={initialSummary} warningThreshold={80} />
        )}
      </div>
    </>
  );
}
