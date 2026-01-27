"use client";

import { useState } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "session" | "assessment" | "deadline" | "meeting";
  courseId?: string;
  courseName?: string;
}

// Session type matching LiveSession from teacher DAL
interface Session {
  id: string;
  course_id: string;
  section_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  provider: 'zoom' | 'meet' | 'teams' | 'livekit' | 'daily' | 'internal' | null;
  room_id: string | null;
  join_url: string | null;
  recording_url: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  created_at: string;
  course: {
    name: string;
    subject_code: string;
  };
  section: {
    name: string;
    grade_level: string;
  };
  module?: {
    title: string;
  };
}

// Assessment type matching AssessmentDueDate from teacher DAL
interface Assessment {
  id: string;
  title: string;
  description: string | null;
  type: 'quiz' | 'exam' | 'assignment' | 'project';
  due_date: string;
  total_points: number;
  course_id: string;
  course: {
    name: string;
    subject_code: string;
  };
}

interface CalendarViewProps {
  events?: CalendarEvent[];
  sessions?: Session[];
  assessments?: Assessment[];
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateSession?: () => void;
  onSelectSession?: (session: Session) => void;
  onSelectAssessment?: (assessment: Assessment) => void;
}

export default function CalendarView({
  events = [],
  sessions = [],
  assessments = [],
  onDateSelect,
  onEventClick,
  onCreateSession,
  onSelectSession,
  onSelectAssessment,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week" | "day">("month");

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  const handleDateClick = (day: number) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  // Convert sessions and assessments to CalendarEvents, merging with direct events
  const getAllEvents = (): (CalendarEvent & { originalSession?: Session; originalAssessment?: Assessment })[] => {
    const sessionEvents = sessions.map((session) => ({
      id: session.id,
      title: session.title,
      start: session.scheduled_start,
      end: session.scheduled_end || session.scheduled_start,
      type: "session" as const,
      courseId: session.course_id,
      courseName: session.course.name,
      originalSession: session,
    }));

    const assessmentEvents = assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      start: assessment.due_date,
      end: assessment.due_date,
      type: "assessment" as const,
      courseId: assessment.course_id,
      courseName: assessment.course.name,
      originalAssessment: assessment,
    }));

    return [...events.map(e => ({ ...e })), ...sessionEvents, ...assessmentEvents];
  };

  const allEvents = getAllEvents();

  const getEventsForDay = (day: number) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    return allEvents.filter((event) => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const handleEventClick = (event: CalendarEvent & { originalSession?: Session; originalAssessment?: Assessment }) => {
    if (event.originalSession && onSelectSession) {
      onSelectSession(event.originalSession);
    } else if (event.originalAssessment && onSelectAssessment) {
      onSelectAssessment(event.originalAssessment);
    } else {
      onEventClick?.(event);
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "session":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "assessment":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "deadline":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "meeting":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => navigateMonth("prev")}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => navigateMonth("next")}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onCreateSession && (
            <button
              onClick={onCreateSession}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Create Session
            </button>
          )}
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  view === v
                    ? "bg-white text-slate-900 shadow dark:bg-slate-600 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week Days Header */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the month starts */}
          {Array.from({ length: startingDay }).map((_, index) => (
            <div key={`empty-${index}`} className="h-24" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayEvents = getEventsForDay(day);
            const isToday =
              new Date().toDateString() ===
              new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              ).toDateString();
            const isSelected =
              selectedDate?.toDateString() ===
              new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              ).toDateString();

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`h-24 rounded-lg border p-2 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : isToday
                      ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    isToday
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {day}
                </span>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                      className={`truncate rounded px-1 py-0.5 text-xs ${getEventColor(event.type)}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
