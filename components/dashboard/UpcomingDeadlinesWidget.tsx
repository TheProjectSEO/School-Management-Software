"use client";

import { useState, useEffect } from "react";

interface Deadline {
  id: string;
  title: string;
  type: "assessment" | "grade-release" | "report" | "meeting";
  courseName: string;
  dueDate: string;
  daysRemaining: number;
}

interface UpcomingDeadlinesWidgetProps {
  onDeadlineClick?: (deadlineId: string, type: string) => void;
  daysAhead?: number;
}

export default function UpcomingDeadlinesWidget({
  onDeadlineClick,
  daysAhead = 7,
}: UpcomingDeadlinesWidgetProps) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Placeholder: fetch upcoming deadlines from API
    setIsLoading(false);
    setDeadlines([]);
  }, [daysAhead]);

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining <= 1) {
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20";
    } else if (daysRemaining <= 3) {
      return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20";
    } else {
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "assessment":
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "grade-release":
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        );
      case "report":
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "meeting":
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      default:
        return null;
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
          Upcoming Deadlines
        </h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Next {daysAhead} days
        </span>
      </div>

      {deadlines.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            No upcoming deadlines
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deadlines.map((deadline) => (
            <button
              key={deadline.id}
              onClick={() => onDeadlineClick?.(deadline.id, deadline.type)}
              className="w-full rounded-lg border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                  {getTypeIcon(deadline.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {deadline.title}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {deadline.courseName}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getUrgencyColor(deadline.daysRemaining)}`}
                  >
                    {deadline.daysRemaining === 0
                      ? "Today"
                      : deadline.daysRemaining === 1
                        ? "Tomorrow"
                        : `${deadline.daysRemaining} days`}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(deadline.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
