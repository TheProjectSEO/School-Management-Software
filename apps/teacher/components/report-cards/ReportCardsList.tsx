"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ReportCardListItem, ReportCardStatus } from "@/lib/types/report-card";

interface ReportCardsListProps {
  reportCards: ReportCardListItem[];
  onSubmitForReview?: (ids: string[]) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Teacher's Report Cards List Component
 *
 * Displays a table of student report cards with:
 * - Selection for bulk actions
 * - Status filters
 * - Quick stats (GPA, attendance)
 * - Actions (view, add remarks, submit for review)
 */
export function ReportCardsList({
  reportCards,
  onSubmitForReview,
  isSubmitting = false,
}: ReportCardsListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<ReportCardStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter report cards
  const filteredCards = useMemo(() => {
    return reportCards.filter((card) => {
      // Status filter
      if (statusFilter !== "all" && card.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          card.student_name.toLowerCase().includes(query) ||
          card.student_lrn.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [reportCards, statusFilter, searchQuery]);

  // Select all drafts
  const draftCards = filteredCards.filter((c) => c.status === "draft");
  const allDraftsSelected =
    draftCards.length > 0 && draftCards.every((c) => selectedIds.has(c.id));

  const handleSelectAll = () => {
    if (allDraftsSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(draftCards.map((c) => c.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSubmitForReview = async () => {
    if (onSubmitForReview && selectedIds.size > 0) {
      await onSubmitForReview(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: ReportCardStatus }) => {
    const config = {
      draft: {
        label: "Draft",
        bg: "bg-slate-100 dark:bg-slate-700",
        text: "text-slate-600 dark:text-slate-300",
        icon: "edit_note",
      },
      pending_review: {
        label: "Pending Review",
        bg: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-400",
        icon: "hourglass_empty",
      },
      approved: {
        label: "Approved",
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
        icon: "check_circle",
      },
      released: {
        label: "Released",
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
        icon: "visibility",
      },
    };

    const c = config[status];

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
      >
        <span className="material-symbols-outlined text-[14px]">{c.icon}</span>
        {c.label}
      </span>
    );
  };

  if (reportCards.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:bg-[#1a2634] dark:border-slate-700 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 block">
          assignment
        </span>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          No report cards found
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
          Report cards will appear here once generated for the selected period
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name or LRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {(["all", "draft", "pending_review", "approved", "released"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {status === "all"
                  ? "All"
                  : status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            )
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleSubmitForReview}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-[#5a0c0e] transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-[#1a2634] dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allDraftsSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                    title="Select all drafts"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  GPA
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Attendance
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredCards.map((card) => (
                <tr
                  key={card.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    {card.status === "draft" && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(card.id)}
                        onChange={() => handleSelect(card.id)}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {card.student_avatar ? (
                        <img
                          src={card.student_avatar}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary dark:text-red-400 text-[18px]">
                            person
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {card.student_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          LRN: {card.student_lrn}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {card.section_name}
                    </p>
                    <p className="text-xs text-slate-400">{card.grade_level}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-bold text-sm ${
                        card.term_gpa >= 3.5
                          ? "text-green-600 dark:text-green-400"
                          : card.term_gpa >= 2.0
                          ? "text-slate-900 dark:text-white"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {card.term_gpa.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-medium text-sm ${
                        card.attendance_rate >= 90
                          ? "text-green-600 dark:text-green-400"
                          : card.attendance_rate >= 75
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {card.attendance_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={card.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {card.has_remarks ? (
                      <span className="material-symbols-outlined text-green-500 text-[20px]">
                        check_circle
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px]">
                        remove
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/teacher/report-cards/${card.id}`}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="View details"
                      >
                        <span className="material-symbols-outlined text-slate-500 text-[20px]">
                          visibility
                        </span>
                      </Link>
                      {card.status === "draft" && (
                        <Link
                          href={`/teacher/report-cards/${card.id}/remarks`}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Add remarks"
                        >
                          <span className="material-symbols-outlined text-slate-500 text-[20px]">
                            edit_note
                          </span>
                        </Link>
                      )}
                      {card.has_pdf && (
                        <a
                          href={`/api/teacher/report-cards/${card.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Download PDF"
                        >
                          <span className="material-symbols-outlined text-slate-500 text-[20px]">
                            download
                          </span>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          Showing {filteredCards.length} of {reportCards.length} report cards
        </span>
        <div className="flex items-center gap-4">
          <span>
            Draft: {reportCards.filter((c) => c.status === "draft").length}
          </span>
          <span>
            Pending: {reportCards.filter((c) => c.status === "pending_review").length}
          </span>
          <span>
            Released: {reportCards.filter((c) => c.status === "released").length}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ReportCardsList;
