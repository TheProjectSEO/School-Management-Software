"use client";

import { useState, useEffect } from "react";

interface Session {
  id: string;
  title: string;
  courseName: string;
  sectionName: string;
  startTime: string;
  endTime: string;
  status: "upcoming" | "in-progress" | "completed";
  studentCount: number;
}

interface TodaysSessionsWidgetProps {
  onSessionClick?: (sessionId: string) => void;
}

export default function TodaysSessionsWidget({
  onSessionClick,
}: TodaysSessionsWidgetProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Placeholder: fetch today's sessions from API
    setIsLoading(false);
    setSessions([]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-progress":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "upcoming":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed":
        return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400";
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Today's Sessions
        </h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            No sessions scheduled for today
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSessionClick?.(session.id)}
              className="w-full rounded-lg border border-slate-100 p-4 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {session.title}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {session.courseName} - {session.sectionName}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      {session.startTime} - {session.endTime}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {session.studentCount} students
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(session.status)}`}
                >
                  {session.status === "in-progress"
                    ? "Live"
                    : session.status.charAt(0).toUpperCase() +
                      session.status.slice(1)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
