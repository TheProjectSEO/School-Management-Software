"use client";

import { useState, useEffect, useCallback } from "react";

interface StudentAlert {
  id: string;
  student_id: string;
  student_name: string;
  student_lrn: string;
  student_avatar: string | null;
  section_id: string;
  section_name: string;
  grade_level: string;
  alert_type: "declining_grades" | "failing_risk" | "attendance_drop" | "missing_submissions" | "low_engagement";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  metrics: Record<string, any>;
  course_id: string | null;
  course_name: string | null;
  detected_at: string;
  recommended_actions: string[];
}

interface AlertsResponse {
  alerts: StudentAlert[];
  summary: {
    total: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
    students_at_risk: number;
  };
}

interface StudentAlertsPanelProps {
  sectionId?: string;
  courseId?: string;
  compact?: boolean;
}

export default function StudentAlertsPanel({
  sectionId,
  courseId,
  compact = false,
}: StudentAlertsPanelProps) {
  const [alerts, setAlerts] = useState<StudentAlert[]>([]);
  const [summary, setSummary] = useState<AlertsResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (sectionId) params.set('section_id', sectionId);
      if (courseId) params.set('course_id', courseId);

      const response = await fetch(`/api/teacher/ai/student-alerts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data: AlertsResponse = await response.json();
      setAlerts(data.alerts || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching student alerts:', err);
      setError('Unable to load alerts');
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [sectionId, courseId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-700 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800";
      case "high":
        return "text-red-600 bg-red-50 border-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800";
      case "medium":
        return "text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800";
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800";
      default:
        return "text-slate-600 bg-slate-50 border-slate-100 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700";
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "declining_grades":
        return "📉";
      case "failing_risk":
        return "⚠️";
      case "attendance_drop":
        return "🚪";
      case "missing_submissions":
        return "📝";
      case "low_engagement":
        return "😴";
      default:
        return "⚡";
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "declining_grades":
        return "Declining Grades";
      case "failing_risk":
        return "At Risk of Failing";
      case "attendance_drop":
        return "Attendance Drop";
      case "missing_submissions":
        return "Missing Work";
      case "low_engagement":
        return "Low Engagement";
      default:
        return type.replace(/_/g, ' ');
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

  if (error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="py-8 text-center">
          <p className="text-red-500 dark:text-red-400">{error}</p>
          <button
            onClick={fetchAlerts}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Student Alerts
          </h3>
          {summary && summary.total > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              summary.by_severity?.critical ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
              summary.by_severity?.high ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
              'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              {summary.total}
            </span>
          )}
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No active alerts
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <li
                key={alert.id}
                className={`rounded-lg border p-2 text-sm ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-2">
                  <span>{getAlertTypeIcon(alert.alert_type)}</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{alert.student_name}:</span>{" "}
                    <span className="opacity-90">{alert.title}</span>
                  </div>
                </div>
              </li>
            ))}
            {alerts.length > 3 && (
              <li className="text-center text-xs text-slate-500 dark:text-slate-400">
                +{alerts.length - 3} more alerts
              </li>
            )}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Student Alerts
        </h2>
        <div className="flex items-center gap-2">
          {summary && (
            <>
              {summary.by_severity?.critical && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {summary.by_severity.critical} critical
                </span>
              )}
              {summary.by_severity?.high && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  {summary.by_severity.high} high
                </span>
              )}
            </>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {alerts.length} alerts
          </span>
        </div>
      </div>

      {summary && summary.students_at_risk > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {summary.students_at_risk} student{summary.students_at_risk > 1 ? 's' : ''} at risk
          </p>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            No student alerts at this time
          </p>
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
            Alerts are generated based on attendance, grades, and engagement patterns
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`rounded-lg border p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{getAlertTypeIcon(alert.alert_type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{alert.student_name}</p>
                      <p className="text-xs opacity-75">
                        {alert.section_name} • Grade {alert.grade_level}
                        {alert.course_name && ` • ${alert.course_name}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded bg-white/50 px-2 py-0.5 text-xs font-medium dark:bg-black/20">
                        {getAlertTypeLabel(alert.alert_type)}
                      </span>
                      <span className="text-xs opacity-75">
                        {new Date(alert.detected_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 font-medium">{alert.title}</p>
                  <p className="mt-1 text-sm opacity-90">{alert.description}</p>

                  {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                    <div className="mt-3 rounded bg-white/30 p-2 dark:bg-black/10">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-75">
                        Recommended Actions
                      </p>
                      <ul className="space-y-1">
                        {alert.recommended_actions.slice(0, 2).map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="mt-0.5">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
