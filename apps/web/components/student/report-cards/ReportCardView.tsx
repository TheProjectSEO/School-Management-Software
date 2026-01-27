"use client";

import { useState } from "react";
import type {
  ReportCard,
  ReportCardGrade,
  AcademicStanding,
} from "@/lib/types/report-card";

interface ReportCardViewProps {
  reportCard: ReportCard;
}

/**
 * Detailed view of a single report card
 * Shows grades table, GPA summary, attendance, and teacher remarks
 */
export function ReportCardView({ reportCard }: ReportCardViewProps) {
  const [activeTab, setActiveTab] = useState<"grades" | "attendance" | "remarks">("grades");
  const { student_info, grades, gpa, attendance, teacher_remarks, grading_period } = reportCard;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {grading_period?.name || "Report Card"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Academic Year: {grading_period?.academic_year || "N/A"}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <GPABadge gpa={gpa.term_gpa} label="Term GPA" />
            <GPABadge gpa={gpa.cumulative_gpa} label="Cumulative" />
          </div>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">person</span>
          Student Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoItem label="Full Name" value={student_info.full_name} />
          <InfoItem label="LRN" value={student_info.lrn || "N/A"} />
          <InfoItem label="Grade Level" value={student_info.grade_level} />
          <InfoItem label="Section" value={student_info.section_name} />
          {student_info.student_number && (
            <InfoItem label="Student Number" value={student_info.student_number} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          <TabButton
            active={activeTab === "grades"}
            onClick={() => setActiveTab("grades")}
            icon="school"
            label="Grades"
          />
          <TabButton
            active={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
            icon="event_available"
            label="Attendance"
          />
          <TabButton
            active={activeTab === "remarks"}
            onClick={() => setActiveTab("remarks")}
            icon="comment"
            label="Teacher Remarks"
            count={teacher_remarks?.length || 0}
          />
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "grades" && <GradesTab grades={grades} gpa={gpa} />}
      {activeTab === "attendance" && <AttendanceTab attendance={attendance} />}
      {activeTab === "remarks" && <RemarksTab remarks={teacher_remarks || []} />}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function GPABadge({ gpa, label }: { gpa: number; label: string }) {
  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (gpa >= 2.5) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (gpa >= 2.0) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  return (
    <div className="text-center">
      <div
        className={`text-3xl font-bold px-4 py-2 rounded-xl ${getGPAColor(gpa)}`}
      >
        {gpa.toFixed(2)}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
        {value}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
      {count !== undefined && count > 0 && (
        <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// GRADES TAB
// ============================================================================

function GradesTab({
  grades,
  gpa,
}: {
  grades: ReportCardGrade[];
  gpa: ReportCard["gpa"];
}) {
  return (
    <div className="space-y-6">
      {/* Grades Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-[#1a2634] dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary text-white">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Course</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Code</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Credits</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Grade</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">Letter</th>
                <th className="text-center py-3 px-4 font-semibold text-sm">GPA</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade, index) => (
                <tr
                  key={grade.course_id}
                  className={`border-b border-slate-100 dark:border-slate-700 ${
                    index % 2 === 1 ? "bg-slate-50 dark:bg-slate-800/30" : ""
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    {grade.course_name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {grade.subject_code}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                    {grade.credit_hours}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-900 dark:text-white">
                    {grade.numeric_grade.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <LetterGradeBadge grade={grade.letter_grade} />
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                    {grade.gpa_points.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {grade.teacher_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GPA Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
          <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-msu-gold">stars</span>
            GPA Summary
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Term GPA</span>
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                {gpa.term_gpa.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Cumulative GPA</span>
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                {gpa.cumulative_gpa.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Term Credits</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {gpa.term_credits}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Total Credits</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {gpa.cumulative_credits}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
          <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">military_tech</span>
            Academic Standing
          </h4>
          <AcademicStandingDisplay standing={gpa.academic_standing} />
        </div>
      </div>
    </div>
  );
}

function LetterGradeBadge({ grade }: { grade: string }) {
  const getColor = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (grade.startsWith("B")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (grade.startsWith("C")) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (grade.startsWith("D")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  return (
    <span className={`px-2 py-1 rounded font-bold text-sm ${getColor(grade)}`}>
      {grade}
    </span>
  );
}

function AcademicStandingDisplay({ standing }: { standing: AcademicStanding }) {
  const config = {
    presidents_list: {
      label: "President's List",
      icon: "emoji_events",
      color: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900",
      description: "Outstanding academic achievement",
    },
    deans_list: {
      label: "Dean's List",
      icon: "workspace_premium",
      color: "bg-gradient-to-r from-blue-400 to-blue-500 text-white",
      description: "Excellent academic performance",
    },
    good_standing: {
      label: "Good Standing",
      icon: "check_circle",
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      description: "Meeting academic requirements",
    },
    probation: {
      label: "Academic Probation",
      icon: "warning",
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      description: "Needs improvement",
    },
    suspension: {
      label: "Academic Suspension",
      icon: "block",
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      description: "Academic performance below standards",
    },
  };

  const { label, icon, color, description } = config[standing] || config.good_standing;

  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
        <div>
          <div className="font-bold text-lg">{label}</div>
          <div className="text-sm opacity-80">{description}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ATTENDANCE TAB
// ============================================================================

function AttendanceTab({ attendance }: { attendance: ReportCard["attendance"] }) {
  const rate = attendance.attendance_rate;
  const rateColor =
    rate >= 90
      ? "text-green-600 dark:text-green-400"
      : rate >= 75
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
      <div className="text-center mb-8">
        <div className={`text-5xl font-bold ${rateColor}`}>
          {rate.toFixed(1)}%
        </div>
        <div className="text-slate-500 dark:text-slate-400 mt-2">
          Overall Attendance Rate
        </div>
        <div className="w-full max-w-md mx-auto mt-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              rate >= 90
                ? "bg-green-500"
                : rate >= 75
                ? "bg-yellow-500"
                : "bg-red-500"
            } transition-all duration-500`}
            style={{ width: `${Math.min(rate, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <AttendanceStatCard
          label="Total Days"
          value={attendance.total_days}
          icon="calendar_month"
          color="text-slate-600 dark:text-slate-400"
        />
        <AttendanceStatCard
          label="Present"
          value={attendance.present_days}
          icon="check_circle"
          color="text-green-600 dark:text-green-400"
        />
        <AttendanceStatCard
          label="Late"
          value={attendance.late_days}
          icon="schedule"
          color="text-yellow-600 dark:text-yellow-400"
        />
        <AttendanceStatCard
          label="Absent"
          value={attendance.absent_days}
          icon="cancel"
          color="text-red-600 dark:text-red-400"
        />
        <AttendanceStatCard
          label="Excused"
          value={attendance.excused_days}
          icon="verified"
          color="text-blue-600 dark:text-blue-400"
        />
      </div>
    </div>
  );
}

function AttendanceStatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
      <span className={`material-symbols-outlined text-3xl ${color}`}>{icon}</span>
      <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
        {value}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

// ============================================================================
// REMARKS TAB
// ============================================================================

function RemarksTab({ remarks }: { remarks: ReportCard["teacher_remarks"] }) {
  if (!remarks || remarks.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:bg-[#1a2634] dark:border-slate-700 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3 block">
          comment
        </span>
        <p className="text-slate-500 dark:text-slate-400">
          No teacher remarks for this period
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {remarks.map((remark, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#1a2634] dark:border-slate-700 border-l-4 border-l-msu-gold"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                {remark.teacher_name}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {remark.subject}
                {remark.subject_code && ` (${remark.subject_code})`}
              </div>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {new Date(remark.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 italic">
            &ldquo;{remark.remarks}&rdquo;
          </p>
        </div>
      ))}
    </div>
  );
}

export default ReportCardView;
