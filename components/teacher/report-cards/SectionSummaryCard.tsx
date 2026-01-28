"use client";

import Link from "next/link";
import type { SectionReportCardSummary } from "@/lib/types/report-card";

interface SectionSummaryCardProps {
  summary: SectionReportCardSummary;
}

/**
 * Section Report Card Summary Card
 *
 * Displays overview of report card status for a section:
 * - Status distribution (draft, pending, approved, released)
 * - Average GPA and attendance
 * - Quick action to view all
 */
export function SectionSummaryCard({ summary }: SectionSummaryCardProps) {
  const {
    section_name,
    total_students,
    draft_count,
    pending_review_count,
    approved_count,
    released_count,
    average_gpa,
    average_attendance_rate,
  } = summary;

  const generated_count = draft_count + pending_review_count + approved_count + released_count;
  const not_generated = total_students - generated_count;

  // Calculate percentages for progress bar
  const total = total_students || 1;
  const draftPct = (draft_count / total) * 100;
  const pendingPct = (pending_review_count / total) * 100;
  const approvedPct = (approved_count / total) * 100;
  const releasedPct = (released_count / total) * 100;
  const notGenPct = (not_generated / total) * 100;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary dark:text-red-400 text-[20px]">
              groups
            </span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{section_name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {total_students} students
            </p>
          </div>
        </div>
        <Link
          href={`/teacher/report-cards?section=${summary.section_id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary dark:text-msu-gold hover:underline"
        >
          View All
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>

      {/* Status Progress Bar */}
      <div className="mb-4">
        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
          {releasedPct > 0 && (
            <div
              className="bg-green-500 h-full"
              style={{ width: `${releasedPct}%` }}
              title={`Released: ${released_count}`}
            />
          )}
          {approvedPct > 0 && (
            <div
              className="bg-blue-500 h-full"
              style={{ width: `${approvedPct}%` }}
              title={`Approved: ${approved_count}`}
            />
          )}
          {pendingPct > 0 && (
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${pendingPct}%` }}
              title={`Pending Review: ${pending_review_count}`}
            />
          )}
          {draftPct > 0 && (
            <div
              className="bg-slate-400 h-full"
              style={{ width: `${draftPct}%` }}
              title={`Draft: ${draft_count}`}
            />
          )}
          {notGenPct > 0 && (
            <div
              className="bg-slate-200 dark:bg-slate-600 h-full"
              style={{ width: `${notGenPct}%` }}
              title={`Not Generated: ${not_generated}`}
            />
          )}
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-slate-600 dark:text-slate-300">
            Released ({released_count})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-slate-600 dark:text-slate-300">
            Approved ({approved_count})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-600 dark:text-slate-300">
            Pending ({pending_review_count})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span className="text-slate-600 dark:text-slate-300">Draft ({draft_count})</span>
        </div>
        {not_generated > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-600" />
            <span className="text-slate-600 dark:text-slate-300">
              Not Generated ({not_generated})
            </span>
          </div>
        )}
      </div>

      {/* Averages */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Average GPA</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {average_gpa !== undefined ? average_gpa.toFixed(2) : "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Avg. Attendance
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {average_attendance_rate !== undefined
              ? `${average_attendance_rate.toFixed(1)}%`
              : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default SectionSummaryCard;
