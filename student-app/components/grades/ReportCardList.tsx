"use client";

import Link from "next/link";
import type { ReportCard } from "@/lib/dal/types/grades";

interface ReportCardListProps {
  reportCards: ReportCard[];
}

export function ReportCardList({ reportCards }: ReportCardListProps) {
  if (reportCards.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:bg-[#1a2634] dark:border-slate-700 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
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
        <div
          key={card.id}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700 transition-shadow hover:shadow-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
              <h3 className="font-bold text-slate-900 dark:text-white">
                {card.grading_period?.name || "Report Card"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {card.grading_period?.academic_year || "Academic Year"}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                {card.released_at && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    Released: {new Date(card.released_at).toLocaleDateString()}
                  </span>
                )}
                <span
                  className={`flex items-center gap-1 ${
                    card.status === "released"
                      ? "text-msu-green"
                      : "text-slate-400"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {card.status === "released" ? "check_circle" : "pending"}
                  </span>
                  {card.status === "released" ? "Available" : card.status}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {card.pdf_url && (
                <a
                  href={card.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-[#5a0c0e] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Download PDF
                </a>
              )}
              <Link
                href={`/grades/report-cards/${card.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                View
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
