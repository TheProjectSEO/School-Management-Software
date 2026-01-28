"use client";

import { useState } from "react";
import type { AttendanceCalendarEntry, AttendanceStatus } from "@/lib/dal/types/attendance";

interface AttendanceCalendarProps {
  year: number;
  month: number;
  days: AttendanceCalendarEntry[];
  onMonthChange: (year: number, month: number) => void;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function AttendanceCalendar({
  year,
  month,
  days,
  onMonthChange,
}: AttendanceCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<AttendanceCalendarEntry | null>(null);

  // Get the first day of the month and total days
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Create a map for quick lookup
  const dayMap = new Map(days.map((d) => [d.date, d]));

  // Generate calendar grid
  const calendarDays: (number | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Navigate to previous month
  const prevMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
    setSelectedDay(null);
  };

  // Navigate to next month
  const nextMonth = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
    setSelectedDay(null);
  };

  // Get status color classes
  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-msu-green text-white";
      case "late":
        return "bg-msu-gold text-black";
      case "absent":
        return "bg-red-500 text-white";
      case "excused":
        return "bg-blue-500 text-white";
      case "mixed":
        return "bg-gradient-to-br from-msu-green via-msu-gold to-red-500 text-white";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-400";
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "present":
        return "Present";
      case "late":
        return "Late";
      case "absent":
        return "Absent";
      case "excused":
        return "Excused";
      case "mixed":
        return "Mixed";
      default:
        return "No Data";
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Check if a day is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() + 1 === month &&
      today.getFullYear() === year
    );
  };

  // Check if a day is in the future
  const isFuture = (day: number) => {
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Previous month"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {MONTHS[month - 1]} {year}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Next month"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return (
              <div
                key={`empty-${index}`}
                className="bg-slate-50 dark:bg-slate-800/50 h-16 md:h-20"
              />
            );
          }

          const dateString = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          const attendance = dayMap.get(dateString);
          const future = isFuture(day);
          const today = isToday(day);

          return (
            <button
              key={day}
              onClick={() => attendance && setSelectedDay(attendance)}
              disabled={!attendance || future}
              className={`relative h-16 md:h-20 flex flex-col items-center justify-center transition-all ${
                future
                  ? "bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed"
                  : attendance
                  ? `${getStatusColor(attendance.status)} cursor-pointer hover:opacity-90`
                  : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              } ${today ? "ring-2 ring-primary ring-inset" : ""}`}
            >
              <span
                className={`text-sm font-bold ${
                  future
                    ? "text-slate-300 dark:text-slate-600"
                    : attendance
                    ? ""
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {day}
              </span>
              {attendance && (
                <span className="hidden md:block text-[10px] font-medium mt-1 opacity-90">
                  {getStatusLabel(attendance.status)}
                </span>
              )}
              {today && !attendance && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-msu-green" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Present
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-msu-gold" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Late
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Absent
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Excused
            </span>
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedDay(null)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div
              className={`p-6 ${getStatusColor(selectedDay.status)} text-center`}
            >
              <span className="material-symbols-outlined text-4xl mb-2">
                {selectedDay.status === "present"
                  ? "check_circle"
                  : selectedDay.status === "late"
                  ? "schedule"
                  : selectedDay.status === "absent"
                  ? "cancel"
                  : selectedDay.status === "excused"
                  ? "event_busy"
                  : "help"}
              </span>
              <h3 className="text-xl font-bold">
                {getStatusLabel(selectedDay.status)}
              </h3>
              <p className="text-sm opacity-90 mt-1">
                {formatDate(selectedDay.date)}
              </p>
            </div>

            {/* Course Breakdown */}
            <div className="p-6">
              <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-4">
                Course Breakdown
              </h4>
              <div className="space-y-3">
                {selectedDay.courseAttendance && selectedDay.courseAttendance.length > 0 ? (
                  selectedDay.courseAttendance.map((course, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {course.course_name}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          course.status === "present"
                            ? "bg-msu-green/10 text-msu-green"
                            : course.status === "late"
                            ? "bg-msu-gold/20 text-yellow-700 dark:text-msu-gold"
                            : course.status === "absent"
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {getStatusLabel(course.status)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-500 dark:text-slate-400">
                    <p>No detailed course breakdown available.</p>
                    <p className="text-sm mt-1">Overall status: {getStatusLabel(selectedDay.status)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setSelectedDay(null)}
                className="w-full py-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
