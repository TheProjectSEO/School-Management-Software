"use client";

import type { AttendanceSummary } from "@/lib/dal/types/attendance";

interface AttendanceStatsProps {
  summary: AttendanceSummary;
  warningThreshold?: number;
}

const AT_RISK_THRESHOLD = 80;

export function AttendanceStats({
  summary,
  warningThreshold = AT_RISK_THRESHOLD,
}: AttendanceStatsProps) {
  const isAtRisk = summary.attendanceRate < warningThreshold;

  // Get color based on rate
  const getProgressColor = (rate: number) => {
    if (rate >= 90) return "bg-msu-green";
    if (rate >= 80) return "bg-msu-gold";
    if (rate >= 70) return "bg-orange-500";
    return "bg-red-500";
  };

  // Get status badge based on rate
  const getStatusBadge = (rate: number) => {
    if (rate >= 95) return { text: "Excellent", color: "bg-msu-green/10 text-msu-green" };
    if (rate >= 90) return { text: "Very Good", color: "bg-msu-green/10 text-msu-green" };
    if (rate >= 80) return { text: "Good", color: "bg-msu-gold/20 text-yellow-700 dark:text-msu-gold" };
    if (rate >= 70) return { text: "Needs Improvement", color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" };
    return { text: "At Risk", color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" };
  };

  const statusBadge = getStatusBadge(summary.attendanceRate);
  const punctualityBadge = getStatusBadge(summary.punctualityRate);

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {isAtRisk && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                warning
              </span>
            </div>
            <div>
              <h3 className="font-bold text-red-800 dark:text-red-200">
                Attendance Warning
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Your attendance rate is below {warningThreshold}%. Please consult with your
                advisor to avoid academic consequences.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Rate Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">
              Attendance Rate
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge.color}`}>
              {statusBadge.text}
            </span>
          </div>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-5xl font-black text-slate-900 dark:text-white">
              {summary.attendanceRate.toFixed(1)}
            </span>
            <span className="text-2xl font-bold text-slate-400 mb-1">%</span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                summary.attendanceRate
              )}`}
              style={{ width: `${Math.min(summary.attendanceRate, 100)}%` }}
            />
            {/* Threshold marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500"
              style={{ left: `${warningThreshold}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>0%</span>
            <span>{warningThreshold}% threshold</span>
            <span>100%</span>
          </div>
        </div>

        {/* Punctuality Rate Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white">
              Punctuality Rate
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${punctualityBadge.color}`}>
              {punctualityBadge.text}
            </span>
          </div>
          <div className="flex items-end gap-2 mb-4">
            <span className="text-5xl font-black text-slate-900 dark:text-white">
              {summary.punctualityRate.toFixed(1)}
            </span>
            <span className="text-2xl font-bold text-slate-400 mb-1">%</span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                summary.punctualityRate
              )}`}
              style={{ width: `${Math.min(summary.punctualityRate, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Percentage of on-time arrivals out of days attended
          </p>
        </div>
      </div>

      {/* Day Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Present */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-msu-green/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-msu-green">check_circle</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {summary.presentDays}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Present
              </p>
            </div>
          </div>
        </div>

        {/* Late */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-msu-gold/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-600 dark:text-msu-gold">
                schedule
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {summary.lateDays}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Late</p>
            </div>
          </div>
        </div>

        {/* Absent */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                cancel
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {summary.absentDays}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Absent</p>
            </div>
          </div>
        </div>

        {/* Excused */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                event_busy
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {summary.excusedDays}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Excused</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Info */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-primary dark:text-msu-gold">
            info
          </span>
          <h4 className="font-bold text-slate-900 dark:text-white">Summary</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Total School Days</p>
            <p className="font-bold text-slate-900 dark:text-white">{summary.totalDays} days</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Days Attended</p>
            <p className="font-bold text-slate-900 dark:text-white">
              {summary.presentDays + summary.lateDays} days
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Days Missed</p>
            <p className="font-bold text-slate-900 dark:text-white">
              {summary.absentDays} days ({summary.excusedDays} excused)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
