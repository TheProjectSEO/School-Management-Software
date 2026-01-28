"use client";

import { useState, useEffect, useCallback } from "react";

interface StudentAlert {
  id: string;
  student_id: string;
  student_name: string;
  student_lrn: string;
  student_avatar?: string;
  section_id: string;
  section_name: string;
  grade_level: string;
  alert_type: 'declining_grades' | 'attendance_drop' | 'missing_submissions' | 'low_engagement' | 'failing_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: {
    current_value: number;
    previous_value?: number;
    threshold?: number;
    trend?: 'up' | 'down' | 'stable';
  };
  course_id?: string;
  course_name?: string;
  detected_at: string;
  recommended_actions: string[];
}

interface AlertsSummary {
  total_alerts: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  by_type: {
    declining_grades: number;
    attendance_drop: number;
    missing_submissions: number;
    low_engagement: number;
    failing_risk: number;
  };
  students_at_risk: number;
}

interface StudentAlertsPanelProps {
  sectionId?: string;
  courseId?: string;
  compact?: boolean;
}

const alertTypeConfig = {
  declining_grades: {
    icon: "trending_down",
    label: "Declining Grades",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800",
  },
  attendance_drop: {
    icon: "event_busy",
    label: "Low Attendance",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
  },
  missing_submissions: {
    icon: "assignment_late",
    label: "Missing Assignments",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
  },
  low_engagement: {
    icon: "visibility_off",
    label: "Low Engagement",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
  },
  failing_risk: {
    icon: "warning",
    label: "At Risk of Failing",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
  },
};

const severityConfig = {
  critical: {
    label: "Critical",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  low: {
    label: "Low",
    bg: "bg-slate-100 dark:bg-slate-700",
    text: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

export function StudentAlertsPanel({ sectionId, courseId, compact = false }: StudentAlertsPanelProps) {
  const [alerts, setAlerts] = useState<StudentAlert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("medium");
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (sectionId) params.set("sectionId", sectionId);
      if (courseId) params.set("courseId", courseId);
      if (selectedType) params.set("alertType", selectedType);
      params.set("minSeverity", selectedSeverity);

      const response = await fetch(`/api/teacher/ai/student-alerts?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch alerts");
      }

      // Filter out dismissed alerts
      const activeAlerts = data.alerts.filter((a: StudentAlert) => !dismissedAlerts.has(a.id));
      setAlerts(activeAlerts);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  }, [sectionId, courseId, selectedType, selectedSeverity, dismissedAlerts]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const toggleExpand = (alertId: string) => {
    setExpandedAlertId(prev => prev === alertId ? null : alertId);
  };

  // Compact view for dashboard widget
  if (compact) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary dark:text-red-400 text-[20px]">
              notification_important
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white">Student Alerts</h3>
          </div>
          {summary && summary.total_alerts > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              summary.critical > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
              summary.high > 0 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
              "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}>
              {summary.total_alerts} alert{summary.total_alerts !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="material-symbols-outlined animate-spin text-slate-400">sync</span>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-3xl text-green-500 mb-2 block">
              check_circle
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">No alerts at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 3).map((alert) => {
              const typeConfig = alertTypeConfig[alert.alert_type];
              const sevConfig = severityConfig[alert.severity];

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${typeConfig.border} ${typeConfig.bg}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`material-symbols-outlined text-[18px] ${typeConfig.color}`}>
                      {typeConfig.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 dark:text-white text-sm truncate">
                          {alert.student_name}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${sevConfig.dot}`} />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {alerts.length > 3 && (
              <button className="w-full text-center text-sm text-primary hover:underline py-2">
                View all {alerts.length} alerts
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Smart Student Alerts</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-powered detection of students who may need attention
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
        >
          <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
            refresh
          </span>
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard
            label="Students at Risk"
            value={summary.students_at_risk}
            icon="person_alert"
            color="text-red-500"
          />
          <SummaryCard
            label="Critical"
            value={summary.critical}
            icon="error"
            color="text-red-500"
            onClick={() => setSelectedSeverity("critical")}
            active={selectedSeverity === "critical"}
          />
          <SummaryCard
            label="High Priority"
            value={summary.high}
            icon="priority_high"
            color="text-orange-500"
            onClick={() => setSelectedSeverity("high")}
            active={selectedSeverity === "high"}
          />
          <SummaryCard
            label="Medium"
            value={summary.medium}
            icon="remove"
            color="text-amber-500"
            onClick={() => setSelectedSeverity("medium")}
            active={selectedSeverity === "medium"}
          />
          <SummaryCard
            label="Low"
            value={summary.low}
            icon="expand_more"
            color="text-slate-400"
            onClick={() => setSelectedSeverity("low")}
            active={selectedSeverity === "low"}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedType(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedType === null
              ? "bg-primary text-white"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          All Types
        </button>
        {Object.entries(alertTypeConfig).map(([type, config]) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedType === type
                ? "bg-primary text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{config.icon}</span>
            {config.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-red-500 mb-2 block">error</span>
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchAlerts}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-green-500 mb-3 block">
            verified
          </span>
          <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-1">
            All Clear!
          </h3>
          <p className="text-green-700 dark:text-green-400">
            No student alerts detected at the current filter level.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const typeConfig = alertTypeConfig[alert.alert_type];
            const sevConfig = severityConfig[alert.severity];
            const isExpanded = expandedAlertId === alert.id;

            return (
              <div
                key={alert.id}
                className={`rounded-xl border-2 ${typeConfig.border} ${typeConfig.bg} overflow-hidden transition-all`}
              >
                {/* Alert Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(alert.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {alert.student_avatar ? (
                        <img
                          src={alert.student_avatar}
                          alt={alert.student_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-slate-400">person</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate">
                          {alert.student_name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sevConfig.bg} ${sevConfig.text}`}>
                          {sevConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                        <span>{alert.section_name}</span>
                        <span>•</span>
                        <span>{alert.grade_level}</span>
                        <span>•</span>
                        <span>LRN: {alert.student_lrn}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[18px] ${typeConfig.color}`}>
                          {typeConfig.icon}
                        </span>
                        <span className={`text-sm font-medium ${typeConfig.color}`}>
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {alert.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissAlert(alert.id);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Dismiss"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                      <span className="material-symbols-outlined text-slate-400">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Metrics */}
                      <div className="p-4 rounded-lg bg-white dark:bg-slate-800">
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                          Metrics
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Current Value</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {alert.metrics.current_value.toFixed(1)}
                              {alert.alert_type === 'missing_submissions' ? ' missing' : '%'}
                            </span>
                          </div>
                          {alert.metrics.previous_value !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600 dark:text-slate-300">Previous Value</span>
                              <span className="text-slate-700 dark:text-slate-200">
                                {alert.metrics.previous_value.toFixed(1)}%
                              </span>
                            </div>
                          )}
                          {alert.metrics.threshold !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600 dark:text-slate-300">Threshold</span>
                              <span className="text-slate-700 dark:text-slate-200">
                                {alert.metrics.threshold}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recommended Actions */}
                      <div className="p-4 rounded-lg bg-white dark:bg-slate-800">
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                          Recommended Actions
                        </h4>
                        <ul className="space-y-2">
                          {alert.recommended_actions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <span className="material-symbols-outlined text-[14px] text-primary dark:text-red-400 mt-0.5">
                                arrow_right
                              </span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg text-sm font-medium transition-colors">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        View Student Profile
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        Send Message
                      </button>
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                        <span className="material-symbols-outlined text-[18px]">event</span>
                        Schedule Meeting
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  label,
  value,
  icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 transition-all ${
        onClick ? "cursor-pointer hover:shadow-md" : ""
      } ${
        active
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          active ? "bg-primary/10" : "bg-slate-100 dark:bg-slate-800"
        }`}>
          <span className={`material-symbols-outlined ${color} text-[20px]`}>{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default StudentAlertsPanel;
