"use client";

import Link from "next/link";
import type { ReportCard } from "@/lib/types/report-card";

interface ReportCardListProps {
  reportCards: ReportCard[];
}

/**
 * List of student's released report cards
 * Displays each report card with period info, status, and action buttons
 */
export function ReportCardList({ reportCards }: ReportCardListProps) {
  if (reportCards.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:bg-[#1a2634] dark:border-slate-700 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 block">
          description
        </span>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          No report cards available yet
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
          Report cards will appear here once they are released by your institution
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reportCards.map((card) => (
        <ReportCardItem key={card.id} reportCard={card} />
      ))}
    </div>
  );
}

interface ReportCardItemProps {
  reportCard: ReportCard;
}

function ReportCardItem({ reportCard }: ReportCardItemProps) {
  const { grading_period, gpa, attendance, released_at, pdf_url } = reportCard;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700 transition-shadow hover:shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Icon */}
        <div className="shrink-0">
          <div className="w-14 h-14 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary dark:text-red-400 text-[28px]">
              assignment
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">
            {grading_period?.name || "Report Card"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Academic Year: {grading_period?.academic_year || "N/A"}
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {/* GPA */}
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-msu-gold">
                stars
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                GPA: {gpa.term_gpa.toFixed(2)}
              </span>
            </div>

            {/* Attendance */}
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-green-500">
                event_available
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {attendance.attendance_rate}% Attendance
              </span>
            </div>

            {/* Release Date */}
            {released_at && (
              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <span className="material-symbols-outlined text-[14px]">
                  calendar_today
                </span>
                <span className="text-xs">
                  Released: {new Date(released_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {pdf_url && (
            <a
              href={pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-[#5a0c0e] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                download
              </span>
              Download PDF
            </a>
          )}
          <Link
            href={`/report-cards/${reportCard.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              visibility
            </span>
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ReportCardList;
