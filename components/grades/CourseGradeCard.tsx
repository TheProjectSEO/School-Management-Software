"use client";

import { useState } from "react";
import type { CourseGrade } from "@/lib/dal/types/grades";

interface CourseGradeCardProps {
  grade: CourseGrade;
  onViewHistory?: (courseId: string, courseName: string) => void;
}

function getLetterGradeColor(letter: string | undefined): string {
  if (!letter) return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

  const upperLetter = letter.toUpperCase();
  if (upperLetter === "A" || upperLetter === "A+") {
    return "bg-msu-green/10 text-msu-green dark:bg-green-900/30 dark:text-green-400";
  }
  if (upperLetter === "A-" || upperLetter === "B+" || upperLetter === "B") {
    return "bg-msu-gold/20 text-yellow-700 dark:bg-yellow-900/30 dark:text-msu-gold";
  }
  if (upperLetter === "B-" || upperLetter === "C+" || upperLetter === "C") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
  if (upperLetter === "C-" || upperLetter === "D+" || upperLetter === "D") {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  }
  if (upperLetter === "F" || upperLetter === "INC") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
  return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
}

function getProgressBarColor(grade: number | undefined): string {
  if (grade === undefined) return "bg-slate-300";
  if (grade >= 90) return "bg-msu-green";
  if (grade >= 80) return "bg-msu-gold";
  if (grade >= 70) return "bg-blue-500";
  if (grade >= 60) return "bg-orange-500";
  return "bg-red-500";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "released":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-msu-green/10 px-2 py-0.5 text-xs font-medium text-msu-green dark:bg-green-900/30 dark:text-green-400">
          <span className="material-symbols-outlined text-[10px]">visibility</span>
          Released
        </span>
      );
    case "finalized":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:text-red-400">
          <span className="material-symbols-outlined text-[10px]">lock</span>
          Finalized
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-msu-gold/20 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-msu-gold">
          <span className="material-symbols-outlined text-[10px]">schedule</span>
          In Progress
        </span>
      );
    default:
      return null;
  }
}

export function CourseGradeCard({ grade, onViewHistory }: CourseGradeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const courseName = grade.course?.name || "Unknown Course";
  const courseCode = grade.course?.subject_code || "N/A";
  const numericGrade = grade.numeric_grade;
  const letterGrade = grade.letter_grade;
  const creditHours = grade.credit_hours;
  const qualityPoints = grade.quality_points;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-shadow hover:shadow-md dark:bg-[#1a2634] dark:border-slate-700">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          {/* Left: Course Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary dark:text-red-400 uppercase tracking-wider">
                {courseCode}
              </span>
              {getStatusBadge(grade.status)}
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white truncate">
              {courseName}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {creditHours} credit{creditHours !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Right: Grade Display */}
          <div className="flex items-center gap-3">
            {numericGrade !== undefined && (
              <div className="text-right">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {numericGrade.toFixed(1)}
                </span>
                <span className="text-sm text-slate-400">%</span>
              </div>
            )}
            {letterGrade && (
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg ${getLetterGradeColor(letterGrade)}`}
              >
                {letterGrade}
              </div>
            )}
            <span
              className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            >
              expand_more
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {numericGrade !== undefined && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(numericGrade)}`}
                style={{ width: `${Math.min(numericGrade, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                GPA Points
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {grade.gpa_points?.toFixed(2) ?? "N/A"}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Quality Points
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {qualityPoints?.toFixed(2) ?? "N/A"}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Credit Hours
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {creditHours}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Released
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {grade.released_at
                  ? new Date(grade.released_at).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
          </div>

          {onViewHistory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory(grade.course_id, courseName);
              }}
              className="inline-flex items-center gap-2 text-sm font-bold text-primary dark:text-msu-gold hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              View Grade History
            </button>
          )}
        </div>
      )}
    </div>
  );
}
