"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type {
  ReportCard,
  ReportCardGrade,
  ReportCardStatus,
  TeacherRemark,
} from "@/lib/types/report-card";

// AI Progress Report types
interface AIProgressReport {
  narrative: string;
  summary: string | null;
  strengths: string[];
  areas_for_growth: string[];
  recommendations: string[];
}

interface AIReportMetadata {
  student_name: string;
  grading_period: string;
  subject: string;
  tone: string;
  generated_at: string;
}

interface ReportCardDetailProps {
  reportCard: ReportCard;
  canEdit?: boolean;
  onAddRemarks?: (remarks: string, subject: string) => Promise<void>;
}

/**
 * Teacher's Report Card Detail View
 *
 * Full view of a student's report card with:
 * - Student info header
 * - Grades table with teacher names
 * - GPA and attendance summary
 * - Teacher remarks (editable for drafts)
 * - Status timeline
 */
export function ReportCardDetail({
  reportCard,
  canEdit = false,
  onAddRemarks,
}: ReportCardDetailProps) {
  const [activeTab, setActiveTab] = useState<"grades" | "attendance" | "remarks">(
    "grades"
  );

  const { student_info, grades, gpa, attendance, teacher_remarks, status } = reportCard;

  // Status badge
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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${c.bg} ${c.text}`}
      >
        <span className="material-symbols-outlined text-[16px]">{c.icon}</span>
        {c.label}
      </span>
    );
  };

  // Academic standing badge
  const AcademicStandingBadge = () => {
    const standing = gpa.academic_standing;
    const config = {
      good_standing: {
        label: "Good Standing",
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
      },
      deans_list: {
        label: "Dean's List",
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
      },
      presidents_list: {
        label: "President's List",
        bg: "bg-purple-100 dark:bg-purple-900/30",
        text: "text-purple-700 dark:text-purple-400",
      },
      probation: {
        label: "Academic Probation",
        bg: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-400",
      },
      suspension: {
        label: "Academic Suspension",
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
      },
    };

    const c = config[standing];

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Student Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary dark:text-red-400 text-[32px]">
                person
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {student_info.full_name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                <span>LRN: {student_info.lrn}</span>
                <span>{student_info.grade_level}</span>
                <span>{student_info.section_name}</span>
              </div>
              {student_info.guardian_name && (
                <p className="text-sm text-slate-400 mt-1">
                  Guardian: {student_info.guardian_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={status} />
            <AcademicStandingBadge />
          </div>
        </div>

        {/* Period Info */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Grading Period: </span>
            <span className="font-medium text-slate-900 dark:text-white">
              {reportCard.grading_period?.name || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Academic Year: </span>
            <span className="font-medium text-slate-900 dark:text-white">
              {reportCard.grading_period?.academic_year || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Generated: </span>
            <span className="font-medium text-slate-900 dark:text-white">
              {new Date(reportCard.generated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="stars"
          iconColor="text-msu-gold"
          label="Term GPA"
          value={gpa.term_gpa.toFixed(2)}
          subtitle={`${gpa.term_credits} credits`}
        />
        <StatCard
          icon="school"
          iconColor="text-blue-500"
          label="Cumulative GPA"
          value={gpa.cumulative_gpa.toFixed(2)}
          subtitle={`${gpa.cumulative_credits} total credits`}
        />
        <StatCard
          icon="event_available"
          iconColor="text-green-500"
          label="Attendance Rate"
          value={`${attendance.attendance_rate}%`}
          subtitle={`${attendance.present_days}/${attendance.total_days} days`}
        />
        <StatCard
          icon="assignment"
          iconColor="text-primary dark:text-red-400"
          label="Courses"
          value={grades.length.toString()}
          subtitle={`${teacher_remarks?.length || 0} remarks`}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-6">
          {(["grades", "attendance", "remarks"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-[#1a2634] dark:border-slate-700 overflow-hidden">
        {activeTab === "grades" && <GradesTab grades={grades} />}
        {activeTab === "attendance" && <AttendanceTab attendance={attendance} />}
        {activeTab === "remarks" && (
          <RemarksTab
            remarks={teacher_remarks || []}
            canEdit={canEdit && status === "draft"}
            onAddRemarks={onAddRemarks}
            reportCardId={reportCard.id}
          />
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  iconColor,
  label,
  value,
  subtitle,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <span className={`material-symbols-outlined ${iconColor} text-[20px]`}>
            {icon}
          </span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
    </div>
  );
}

// Grades Tab
function GradesTab({ grades }: { grades: ReportCardGrade[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Subject
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Teacher
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Credits
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Grade
            </th>
            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Letter
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Remarks
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {grades.map((grade, idx) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900 dark:text-white text-sm">
                  {grade.course_name}
                </p>
                <p className="text-xs text-slate-500">{grade.subject_code}</p>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {grade.teacher_name}
              </td>
              <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-300">
                {grade.credit_hours}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="font-bold text-slate-900 dark:text-white">
                  {grade.numeric_grade.toFixed(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-block w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    grade.letter_grade === "A" || grade.letter_grade === "A+"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : grade.letter_grade === "B" || grade.letter_grade === "B+"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : grade.letter_grade === "C" || grade.letter_grade === "C+"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {grade.letter_grade}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                {grade.remarks || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Attendance Tab
function AttendanceTab({
  attendance,
}: {
  attendance: ReportCard["attendance"];
}) {
  const stats = [
    { label: "Total Days", value: attendance.total_days, icon: "calendar_month" },
    { label: "Present", value: attendance.present_days, icon: "check_circle", color: "text-green-500" },
    { label: "Absent", value: attendance.absent_days, icon: "cancel", color: "text-red-500" },
    { label: "Late", value: attendance.late_days, icon: "schedule", color: "text-amber-500" },
    { label: "Excused", value: attendance.excused_days, icon: "event_busy", color: "text-blue-500" },
  ];

  return (
    <div className="p-6">
      {/* Attendance Rate */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Attendance Rate
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {attendance.attendance_rate}%
          </span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              attendance.attendance_rate >= 90
                ? "bg-green-500"
                : attendance.attendance_rate >= 75
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
            style={{ width: `${attendance.attendance_rate}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50"
          >
            <span
              className={`material-symbols-outlined text-[24px] ${stat.color || "text-slate-400"}`}
            >
              {stat.icon}
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stat.value}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Remarks Tab
function RemarksTab({
  remarks,
  canEdit,
  onAddRemarks,
  reportCardId,
}: {
  remarks: TeacherRemark[];
  canEdit: boolean;
  onAddRemarks?: (remarks: string, subject: string) => Promise<void>;
  reportCardId: string;
}) {
  const [newRemarks, setNewRemarks] = useState("");
  const [subject, setSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Progress Report state
  const [aiReport, setAiReport] = useState<AIProgressReport | null>(null);
  const [aiMetadata, setAiMetadata] = useState<AIReportMetadata | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAIReport, setShowAIReport] = useState(false);
  const [selectedTone, setSelectedTone] = useState<string>("professional");

  const handleSubmit = async () => {
    if (!newRemarks.trim() || !subject.trim() || !onAddRemarks) return;

    setIsSubmitting(true);
    try {
      await onAddRemarks(newRemarks, subject);
      setNewRemarks("");
      setSubject("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate AI Progress Report
  const handleGenerateAIReport = useCallback(async () => {
    setIsLoadingAI(true);
    setAiError(null);

    try {
      const response = await fetch("/api/teacher/ai/generate-progress-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportCardId,
          subject: subject || undefined,
          tone: selectedTone,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate progress report");
      }

      setAiReport(data.report);
      setAiMetadata(data.metadata);
      setShowAIReport(true);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setIsLoadingAI(false);
    }
  }, [reportCardId, subject, selectedTone]);

  // Apply AI narrative to remarks
  const handleApplyAINarrative = () => {
    if (aiReport?.narrative) {
      setNewRemarks(aiReport.narrative);
      if (aiMetadata?.subject && aiMetadata.subject !== "All Subjects") {
        setSubject(aiMetadata.subject);
      }
    }
  };

  return (
    <div className="p-6">
      {/* Existing Remarks */}
      {remarks.length > 0 ? (
        <div className="space-y-4 mb-6">
          {remarks.map((remark, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border-l-4 border-primary"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-slate-900 dark:text-white text-sm">
                    {remark.teacher_name}
                  </span>
                  <span className="text-slate-400 mx-2">-</span>
                  <span className="text-sm text-slate-500">{remark.subject}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(remark.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {remark.remarks}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 mb-6">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">
            comment
          </span>
          <p className="text-slate-500 dark:text-slate-400">No remarks added yet</p>
        </div>
      )}

      {/* Add Remarks Form */}
      {canEdit && onAddRemarks && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-slate-900 dark:text-white">
              Add Your Remarks
            </h4>
            {/* AI Generate Button */}
            <button
              onClick={handleGenerateAIReport}
              disabled={isLoadingAI}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isLoadingAI ? "sync" : "auto_awesome"}
              </span>
              {isLoadingAI ? "Generating..." : "Generate with AI"}
            </button>
          </div>

          {/* AI Error */}
          {aiError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{aiError}</p>
            </div>
          )}

          {/* AI Report Panel */}
          {showAIReport && aiReport && (
            <div className="mb-6 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[20px]">
                    auto_awesome
                  </span>
                  <span className="font-medium text-purple-900 dark:text-purple-200 text-sm">
                    AI-Generated Progress Report
                  </span>
                </div>
                <button
                  onClick={() => setShowAIReport(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Summary */}
              {aiReport.summary && (
                <div className="mb-4 p-3 rounded-lg bg-white dark:bg-slate-800">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Summary
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {aiReport.summary}
                  </p>
                </div>
              )}

              {/* Narrative */}
              <div className="mb-4 p-3 rounded-lg bg-white dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Narrative
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {aiReport.narrative}
                </p>
              </div>

              {/* Strengths & Areas for Growth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {aiReport.strengths.length > 0 && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">
                      Strengths
                    </p>
                    <ul className="space-y-1">
                      {aiReport.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                          <span className="material-symbols-outlined text-[14px] mt-0.5">check_circle</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiReport.areas_for_growth.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                      Areas for Growth
                    </p>
                    <ul className="space-y-1">
                      {aiReport.areas_for_growth.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                          <span className="material-symbols-outlined text-[14px] mt-0.5">trending_up</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {aiReport.recommendations.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-2">
                    Recommendations
                  </p>
                  <ul className="space-y-1">
                    {aiReport.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                        <span className="material-symbols-outlined text-[14px] mt-0.5">lightbulb</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Apply Button */}
              <div className="flex items-center justify-between pt-3 border-t border-purple-200 dark:border-purple-800/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Generated: {aiMetadata?.generated_at ? new Date(aiMetadata.generated_at).toLocaleString() : "Just now"}
                </p>
                <button
                  onClick={handleApplyAINarrative}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">content_paste</span>
                  Use as Remarks
                </button>
              </div>
            </div>
          )}

          {/* Tone selector (appears when AI panel is closed) */}
          {!showAIReport && (
            <div className="mb-4 flex items-center gap-3">
              <label className="text-xs text-slate-500 dark:text-slate-400">AI Tone:</label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
                className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value="professional">Professional</option>
                <option value="encouraging">Encouraging</option>
                <option value="constructive">Constructive</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Mathematics (optional for AI, required for manual)"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1520] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                Remarks
              </label>
              <textarea
                value={newRemarks}
                onChange={(e) => setNewRemarks(e.target.value)}
                placeholder="Write your remarks about the student's performance..."
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0d1520] text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!newRemarks.trim() || !subject.trim() || isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-[#5a0c0e] transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {isSubmitting ? "Adding..." : "Add Remarks"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportCardDetail;
