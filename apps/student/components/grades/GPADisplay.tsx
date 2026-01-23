"use client";

import type { SemesterGPA } from "@/lib/dal/types/grades";
import { AcademicStandingBadge } from "./AcademicStandingBadge";

interface GPADisplayProps {
  gpaData: SemesterGPA | null;
  showDetails?: boolean;
}

export function GPADisplay({ gpaData, showDetails = true }: GPADisplayProps) {
  if (!gpaData) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">
            school
          </span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            No GPA data available yet
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Complete your first semester to see GPA
          </p>
        </div>
      </div>
    );
  }

  const termGPA = gpaData.term_gpa ?? 0;
  const cumulativeGPA = gpaData.cumulative_gpa ?? 0;
  const maxGPA = 4.0; // Standard 4.0 scale

  // Calculate gauge percentage (GPA as percentage of max)
  const gaugePercent = Math.min((cumulativeGPA / maxGPA) * 100, 100);

  // Get color based on GPA
  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-msu-green";
    if (gpa >= 3.0) return "text-msu-gold";
    if (gpa >= 2.0) return "text-slate-600 dark:text-slate-300";
    return "text-red-500";
  };

  const getProgressColor = (gpa: number) => {
    if (gpa >= 3.5) return "bg-msu-green";
    if (gpa >= 3.0) return "bg-msu-gold";
    if (gpa >= 2.0) return "bg-slate-400";
    return "bg-red-500";
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Grade Point Average
          </h3>
          {gpaData.grading_period && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {gpaData.grading_period.name} {gpaData.grading_period.academic_year}
            </p>
          )}
        </div>
        <AcademicStandingBadge standing={gpaData.academic_standing} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Term GPA */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="48"
                cy="48"
              />
              <circle
                className={getProgressColor(termGPA)}
                strokeWidth="8"
                strokeDasharray={`${(termGPA / maxGPA) * 251.2} 251.2`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="48"
                cy="48"
              />
            </svg>
            <span
              className={`absolute text-2xl font-black ${getGPAColor(termGPA)}`}
            >
              {termGPA.toFixed(2)}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Term GPA
          </p>
        </div>

        {/* Cumulative GPA */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="48"
                cy="48"
              />
              <circle
                className={getProgressColor(cumulativeGPA)}
                strokeWidth="8"
                strokeDasharray={`${gaugePercent * 2.512} 251.2`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="48"
                cy="48"
              />
            </svg>
            <span
              className={`absolute text-2xl font-black ${getGPAColor(cumulativeGPA)}`}
            >
              {cumulativeGPA.toFixed(2)}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Cumulative GPA
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[16px] text-primary">
                school
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Credits Attempted
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {gpaData.term_credits_attempted ?? 0}
              </span>
              <span className="text-xs text-slate-400">
                term / {gpaData.cumulative_credits_attempted ?? 0} total
              </span>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[16px] text-msu-green">
                verified
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Credits Earned
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {gpaData.term_credits_earned ?? 0}
              </span>
              <span className="text-xs text-slate-400">
                term / {gpaData.cumulative_credits_earned ?? 0} total
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
