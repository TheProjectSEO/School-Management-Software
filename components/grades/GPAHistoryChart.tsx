"use client";

import { useMemo } from "react";
import type { GPATrendPoint } from "@/lib/dal/types/grades";

interface GPAHistoryChartProps {
  trendData: GPATrendPoint[];
}

export function GPAHistoryChart({ trendData }: GPAHistoryChartProps) {
  // Process data for display
  const chartData = useMemo(() => {
    if (!trendData || trendData.length === 0) return null;

    // Find min and max for scaling
    const gpas = trendData
      .map((d) => d.cumulative_gpa)
      .filter((g): g is number => g !== undefined);

    if (gpas.length === 0) return null;

    const minGPA = Math.max(0, Math.min(...gpas) - 0.5);
    const maxGPA = Math.min(4.0, Math.max(...gpas) + 0.5);
    const range = maxGPA - minGPA || 1;

    return {
      points: trendData.map((d, index) => ({
        ...d,
        x: (index / (trendData.length - 1 || 1)) * 100,
        y: ((d.cumulative_gpa ?? 0) - minGPA) / range * 100,
        termY: ((d.term_gpa ?? 0) - minGPA) / range * 100,
      })),
      minGPA,
      maxGPA,
    };
  }, [trendData]);

  if (!chartData || trendData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">
            show_chart
          </span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            No GPA history available yet
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Complete multiple semesters to see your GPA trend
          </p>
        </div>
      </div>
    );
  }

  // Generate SVG path for cumulative GPA line
  const cumulativePath = chartData.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${100 - p.y}`)
    .join(" ");

  // Generate SVG path for term GPA line
  const termPath = chartData.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${100 - p.termY}`)
    .join(" ");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">GPA Trend</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-slate-600 dark:text-slate-400">Cumulative</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-msu-gold"></div>
            <span className="text-slate-600 dark:text-slate-400">Term</span>
          </div>
        </div>
      </div>

      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-slate-400">
          <span>{chartData.maxGPA.toFixed(1)}</span>
          <span>{((chartData.maxGPA + chartData.minGPA) / 2).toFixed(1)}</span>
          <span>{chartData.minGPA.toFixed(1)}</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div className="border-b border-slate-100 dark:border-slate-700"></div>
            <div className="border-b border-slate-100 dark:border-slate-700"></div>
            <div className="border-b border-slate-100 dark:border-slate-700"></div>
          </div>

          {/* SVG Chart */}
          <svg
            className="absolute inset-0 w-full h-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Term GPA line (background) */}
            <path
              d={termPath}
              fill="none"
              stroke="#FDB913"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Cumulative GPA line (foreground) */}
            <path
              d={cumulativePath}
              fill="none"
              stroke="#7B1113"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Data points */}
            {chartData.points.map((point, index) => (
              <g key={index}>
                {/* Cumulative point */}
                <circle
                  cx={point.x}
                  cy={100 - point.y}
                  r="4"
                  fill="#7B1113"
                  stroke="white"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  className="cursor-pointer hover:r-6"
                />
              </g>
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-slate-400">
            {chartData.points.map((point, index) => (
              <span
                key={index}
                className="text-center truncate max-w-[80px]"
                style={{
                  left: `${point.x}%`,
                  transform: "translateX(-50%)",
                  position: "absolute",
                }}
              >
                {point.period_name.replace(/\s+/g, " ").substring(0, 10)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Semester Details */}
      <div className="mt-10 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {chartData.points.slice(-4).map((point, index) => (
            <div
              key={index}
              className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 truncate">
                {point.period_name}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {point.cumulative_gpa?.toFixed(2) ?? "--"}
              </p>
              <p className="text-xs text-slate-400">
                Term: {point.term_gpa?.toFixed(2) ?? "--"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
