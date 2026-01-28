"use client";

import { useState, useEffect } from "react";

interface AttendanceAlert {
  id: string;
  studentName: string;
  studentId: string;
  sectionName: string;
  alertType: "absent-streak" | "low-attendance" | "late-pattern";
  value: number;
  threshold: number;
}

interface AttendanceAlertsWidgetProps {
  onAlertClick?: (studentId: string) => void;
}

export default function AttendanceAlertsWidget({
  onAlertClick,
}: AttendanceAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Placeholder: fetch attendance alerts from API
    setIsLoading(false);
    setAlerts([]);
  }, []);

  const getAlertConfig = (type: string) => {
    switch (type) {
      case "absent-streak":
        return {
          icon: (
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          label: "Absent Streak",
          color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20",
        };
      case "low-attendance":
        return {
          icon: (
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
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              />
            </svg>
          ),
          label: "Low Attendance",
          color:
            "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20",
        };
      case "late-pattern":
        return {
          icon: (
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          label: "Late Pattern",
          color:
            "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20",
        };
      default:
        return {
          icon: null,
          label: "Alert",
          color:
            "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-700",
        };
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
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Attendance Alerts
          </h2>
          {alerts.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            No attendance alerts
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = getAlertConfig(alert.alertType);
            return (
              <button
                key={alert.id}
                onClick={() => onAlertClick?.(alert.studentId)}
                className={`w-full rounded-lg p-3 text-left transition-opacity hover:opacity-80 ${config.color}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{config.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium">{alert.studentName}</p>
                    <p className="text-sm opacity-80">{alert.sectionName}</p>
                    <p className="mt-1 text-xs">
                      {config.label}: {alert.value}
                      {alert.alertType === "low-attendance" ? "%" : " days"}{" "}
                      (threshold: {alert.threshold}
                      {alert.alertType === "low-attendance" ? "%" : " days"})
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
