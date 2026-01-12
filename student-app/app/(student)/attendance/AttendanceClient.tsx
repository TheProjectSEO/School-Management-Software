"use client";

import { useState, useEffect, useCallback } from "react";
import { AttendanceCalendar, AttendanceStats } from "@/components/attendance";
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
          <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            My Attendance
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base mt-2">
            Track your attendance record and punctuality.
          </p>
        </div>
      </div>

      {/* No Data Message */}
      {hasNoAttendanceData && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[24px]">
                info
              </span>
            </div>
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-1">
                No Attendance Data Available
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Your attendance records will appear here once your instructors begin recording attendance. As a new student, this is normal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors ${
            activeTab === "calendar"
              ? "bg-primary text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          <span>Calendar View</span>
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors ${
            activeTab === "stats"
              ? "bg-primary text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">analytics</span>
          <span>Statistics</span>
        </button>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {activeTab === "calendar" ? (
          <>
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">percent</span>
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {initialSummary.attendanceRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Attendance
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-msu-green/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-msu-green">check_circle</span>
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {initialSummary.presentDays}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Present
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-msu-gold/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-yellow-600 dark:text-msu-gold">
                      schedule
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {initialSummary.lateDays}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Late
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                      cancel
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {initialSummary.absentDays}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Absent
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 z-10 flex items-center justify-center rounded-2xl">
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined animate-spin text-primary">
                      progress_activity
                    </span>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Loading...
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
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-[16px] align-text-bottom mr-1">
                touch_app
              </span>
              Click on any colored day to see course-level attendance details
            </div>
          </>
        ) : (
          <AttendanceStats summary={initialSummary} warningThreshold={80} />
        )}
      </div>
    </>
  );
}
