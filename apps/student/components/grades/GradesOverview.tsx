"use client";

import type { SemesterGPA, CourseGrade } from "@/lib/dal/types/grades";
import { AcademicStandingBadge } from "./AcademicStandingBadge";

interface GradesOverviewProps {
  gpaData: SemesterGPA | null;
  grades: CourseGrade[];
  periodName?: string;
}

export function GradesOverview({ gpaData, grades, periodName }: GradesOverviewProps) {
  const totalCourses = grades.length;
  const totalCredits = grades.reduce((sum, g) => sum + (g.credit_hours || 0), 0);
  const totalQualityPoints = grades.reduce((sum, g) => sum + (g.quality_points || 0), 0);
  const releasedCount = grades.filter((g) => g.status === "released" || g.status === "finalized").length;

  const cumulativeGPA = gpaData?.cumulative_gpa ?? 0;
  const termGPA = gpaData?.term_gpa ?? 0;

  // Determine color for GPA
  const getGPAColorClass = (gpa: number) => {
    if (gpa >= 3.5) return "text-msu-green dark:text-green-400";
    if (gpa >= 3.0) return "text-msu-gold dark:text-yellow-400";
    if (gpa >= 2.0) return "text-slate-700 dark:text-slate-300";
    return "text-red-500 dark:text-red-400";
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* GPA Card - Featured */}
      <div className="col-span-1 md:col-span-2 lg:col-span-2 rounded-xl bg-gradient-to-br from-primary via-primary to-[#5a0c0e] p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-msu-gold">school</span>
              <h3 className="font-bold">Cumulative GPA</h3>
            </div>
            <AcademicStandingBadge standing={gpaData?.academic_standing} size="sm" />
          </div>

          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-black">
              {cumulativeGPA > 0 ? cumulativeGPA.toFixed(2) : "--"}
            </span>
            <span className="text-xl text-white/70">/ 4.00</span>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Term GPA</p>
              <p className="text-2xl font-bold">{termGPA > 0 ? termGPA.toFixed(2) : "--"}</p>
            </div>
            <div className="w-px h-10 bg-white/20"></div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wider mb-1">
                {periodName || "Current Term"}
              </p>
              <p className="text-sm text-white/80 font-medium">
                {gpaData?.grading_period?.academic_year || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Total Courses */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="size-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary dark:text-red-400 text-[24px]">
              menu_book
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 dark:text-white">{totalCourses}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">courses</span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {releasedCount} of {totalCourses} graded
        </p>
      </div>

      {/* Total Credits */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="size-12 rounded-xl bg-msu-green/10 dark:bg-green-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-msu-green dark:text-green-400 text-[24px]">
              verified
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 dark:text-white">{totalCredits}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">credits</span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {totalQualityPoints.toFixed(1)} quality points
        </p>
      </div>
    </div>
  );
}
