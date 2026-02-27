"use client";

import { useState } from "react";
import Link from "next/link";
import { useStudentTheme } from "@/components/student/providers/StudentThemeProvider";
import { HONORS_LABELS } from "@/lib/grading/deped-engine";
import type { DepEdStudentReport, DepEdFinalGrade } from "@/lib/dal/deped-grades";

type TabType = "quarters" | "final" | "report-cards";

interface GradesClientProps {
  depedReport: DepEdStudentReport | null;
  academicYears: string[];
  studentId: string;
}

// ============================================================================
// Helpers
// ============================================================================

function gradeColor(grade: number | null): string {
  if (grade === null) return "text-slate-400 dark:text-slate-500";
  if (grade >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (grade >= 85) return "text-blue-600 dark:text-blue-400";
  if (grade >= 80) return "text-sky-600 dark:text-sky-400";
  if (grade >= 75) return "text-slate-700 dark:text-slate-200";
  return "text-red-600 dark:text-red-400";
}

function GradeCell({ grade }: { grade: number | null }) {
  if (grade === null) return <span className="text-slate-400">—</span>;
  return (
    <span className={`font-bold ${gradeColor(grade)}`}>
      {grade}
      <span className={`ml-1 text-[10px] font-semibold px-1 rounded ${
        grade >= 75
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}>
        {grade >= 75 ? "P" : "F"}
      </span>
    </span>
  );
}

function HonorsBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    with_highest_honors: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    with_high_honors:    "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    with_honors:         "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${colors[status] ?? ""}`}>
      <span className="material-symbols-outlined text-base">workspace_premium</span>
      {HONORS_LABELS[status] ?? status}
    </span>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function GradesClient({
  depedReport,
  academicYears,
  studentId,
}: GradesClientProps) {
  const { isPlayful } = useStudentTheme();
  const [activeTab, setActiveTab] = useState<TabType>("quarters");

  const tabBtn = (tab: TabType, icon: string, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm transition-colors whitespace-nowrap ${
        isPlayful ? "rounded-xl" : "rounded-lg"
      } ${
        activeTab === tab
          ? isPlayful
            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
            : "bg-primary text-white"
          : isPlayful
            ? "bg-white border-2 border-pink-200 text-purple-700 hover:bg-pink-50"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
      }`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span>{label}</span>
    </button>
  );

  const noDataMsg = (
    <div className={`p-10 text-center ${
      isPlayful
        ? "rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50"
        : "rounded-xl border border-slate-200 bg-white dark:bg-[#1a2634] dark:border-slate-700"
    }`}>
      <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-3 block">school</span>
      <p className="text-slate-500 dark:text-slate-400 font-medium">
        No grades available yet
      </p>
      <p className="text-sm text-slate-400 mt-1">
        Grades will appear here once your teacher computes and releases them.
      </p>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold leading-tight tracking-tight ${
            isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"
          }`}>
            {isPlayful ? "My Grades" : "My Grades"}
          </h1>
          <p className={`text-base mt-2 ${
            isPlayful ? "text-purple-600" : "text-slate-500 dark:text-slate-400"
          }`}>
            {depedReport?.academic_year
              ? `Academic Year ${depedReport.academic_year}`
              : "View your academic performance per quarter."}
          </p>
        </div>

        {/* Honors badge */}
        {depedReport?.honors_status && (
          <HonorsBadge status={depedReport.honors_status} />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {tabBtn("quarters", "grade", "Quarterly Grades")}
        {tabBtn("final", "emoji_events", "Final Grades")}
        <Link
          href="/student/grades/report-cards"
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm transition-colors whitespace-nowrap ${
            isPlayful ? "rounded-xl" : "rounded-lg"
          } ${
            isPlayful
              ? "bg-white border-2 border-pink-200 text-purple-700 hover:bg-pink-50"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">description</span>
          <span>Report Cards</span>
        </Link>
      </div>

      {/* ── TAB: Quarterly Grades ───────────────────────────────────────── */}
      {activeTab === "quarters" && (
        <div className="space-y-6">
          {!depedReport || depedReport.final_grades.length === 0 ? (
            noDataMsg
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(["Q1","Q2","Q3","Q4"] as const).map((q, i) => {
                  const avg = depedReport.final_grades.reduce((sum, g) => {
                    const val = [g.q1_grade, g.q2_grade, g.q3_grade, g.q4_grade][i]
                    return sum + (val ?? 0)
                  }, 0) / (depedReport.final_grades.filter((g) => {
                    return [g.q1_grade, g.q2_grade, g.q3_grade, g.q4_grade][i] !== null
                  }).length || 1)

                  const hasData = depedReport.final_grades.some((g) =>
                    [g.q1_grade, g.q2_grade, g.q3_grade, g.q4_grade][i] !== null
                  )

                  return (
                    <div key={q} className={`p-4 rounded-xl border ${
                      isPlayful
                        ? "border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50"
                        : "border-slate-200 bg-white dark:bg-[#1a2634] dark:border-slate-700"
                    }`}>
                      <div className={`text-xs font-bold uppercase mb-1 ${
                        isPlayful ? "text-purple-500" : "text-slate-400"
                      }`}>{q} Average</div>
                      <div className={`text-2xl font-bold ${
                        hasData ? gradeColor(Math.round(avg)) : "text-slate-300"
                      }`}>
                        {hasData ? Math.round(avg) : "—"}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Per-subject quarterly table */}
              <div className={`rounded-xl border overflow-hidden ${
                isPlayful
                  ? "border-pink-200"
                  : "border-slate-200 dark:border-slate-700"
              }`}>
                <table className="w-full text-sm">
                  <thead className={`${
                    isPlayful
                      ? "bg-gradient-to-r from-pink-100 to-purple-100"
                      : "bg-slate-50 dark:bg-slate-800"
                  }`}>
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Subject</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Q1</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Q2</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Q3</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Q4</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isPlayful ? "divide-pink-100" : "divide-slate-100 dark:divide-slate-800"
                  }`}>
                    {depedReport.final_grades.map((grade) => (
                      <tr key={grade.id} className={`${
                        isPlayful ? "hover:bg-pink-50" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      } transition-colors`}>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {grade.course_name}
                        </td>
                        <td className="px-3 py-3 text-center"><GradeCell grade={grade.q1_grade} /></td>
                        <td className="px-3 py-3 text-center"><GradeCell grade={grade.q2_grade} /></td>
                        <td className="px-3 py-3 text-center"><GradeCell grade={grade.q3_grade} /></td>
                        <td className="px-3 py-3 text-center"><GradeCell grade={grade.q4_grade} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Final Grades ──────────────────────────────────────────── */}
      {activeTab === "final" && (
        <div className="space-y-6">
          {!depedReport || depedReport.final_grades.length === 0 ? (
            noDataMsg
          ) : (
            <>
              {/* General Average hero card */}
              <div className={`p-6 rounded-2xl border-2 ${
                isPlayful
                  ? "border-pink-300 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50"
                  : "border-primary/30 bg-gradient-to-br from-primary/5 to-msu-gold/5 dark:from-primary/10 dark:to-msu-gold/10"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                      General Average — {depedReport.academic_year}
                    </div>
                    <div className={`text-6xl font-extrabold ${
                      depedReport.general_average_rounded
                        ? gradeColor(depedReport.general_average_rounded)
                        : "text-slate-300"
                    }`}>
                      {depedReport.general_average_rounded ?? "—"}
                    </div>
                    {depedReport.general_average && (
                      <div className="text-sm text-slate-400 mt-1">
                        Raw average: {Number(depedReport.general_average).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    {depedReport.honors_status ? (
                      <HonorsBadge status={depedReport.honors_status} />
                    ) : (
                      <span className="text-sm text-slate-400">Not qualified for honors</span>
                    )}
                    {depedReport.lowest_subject_grade !== null && (
                      <div className="text-xs text-slate-400">
                        Lowest subject grade: <span className={`font-semibold ${gradeColor(depedReport.lowest_subject_grade)}`}>
                          {depedReport.lowest_subject_grade}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Final grades table */}
              <div className={`rounded-xl border overflow-hidden ${
                isPlayful ? "border-pink-200" : "border-slate-200 dark:border-slate-700"
              }`}>
                <table className="w-full text-sm">
                  <thead className={`${
                    isPlayful
                      ? "bg-gradient-to-r from-pink-100 to-purple-100"
                      : "bg-slate-50 dark:bg-slate-800"
                  }`}>
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Subject</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Q1</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Q2</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Q3</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Q4</th>
                      <th className="px-3 py-3 text-center font-bold text-primary dark:text-primary">Final Grade</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isPlayful ? "divide-pink-100" : "divide-slate-100 dark:divide-slate-800"
                  }`}>
                    {depedReport.final_grades.map((grade) => (
                      <tr key={grade.id} className={`${
                        isPlayful ? "hover:bg-pink-50" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      } transition-colors`}>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {grade.course_name}
                        </td>
                        <td className="px-3 py-3 text-center"><GradeCell grade={grade.q1_grade} /></td>
                        <td className="px-3 py-3 text-center"><GradeCell grade={grade.q2_grade} /></td>
                        <td className="px-3 py-3 text-center"><GradeCell grade={grade.q3_grade} /></td>
                        <td className="px-3 py-3 text-center"><GradeCell grade={grade.q4_grade} /></td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-lg font-extrabold ${gradeColor(grade.final_grade)}`}>
                            {grade.final_grade ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {grade.final_grade !== null ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              grade.final_grade >= 75
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                              {grade.final_grade >= 75 ? "PASSED" : "FAILED"}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* General average row */}
                  {depedReport.general_average_rounded && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-primary/5 dark:bg-primary/10">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100" colSpan={5}>
                          General Average
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xl font-extrabold ${gradeColor(depedReport.general_average_rounded)}`}>
                            {depedReport.general_average_rounded}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {depedReport.honors_status && (
                            <HonorsBadge status={depedReport.honors_status} />
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* DepEd passing note */}
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                Passing grade: <strong>75</strong> · Minimum displayed grade: <strong>60</strong> ·
                Computed per DepEd Order No. 8, s. 2015
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
