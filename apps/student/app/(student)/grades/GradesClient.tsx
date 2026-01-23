"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  GradesOverview,
  CourseGradeCard,
  GPADisplay,
  GPAHistoryChart,
  GradeHistoryModal,
} from "@/components/grades";
import type { CourseGrade, SemesterGPA, GPATrendPoint } from "@/lib/dal/types/grades";

type TabType = "current" | "gpa" | "report-cards";

interface GradingPeriod {
  id: string;
  name: string;
  academic_year: string;
}

interface GradesClientProps {
  initialGrades: CourseGrade[];
  initialGPA: SemesterGPA | null;
  initialTrend: GPATrendPoint[];
  gradingPeriods: GradingPeriod[];
  studentId: string;
}

export default function GradesClient({
  initialGrades,
  initialGPA,
  initialTrend,
  gradingPeriods,
  studentId,
}: GradesClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("current");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [grades, setGrades] = useState<CourseGrade[]>(initialGrades);
  const [isLoading, setIsLoading] = useState(false);

  // Modal state for grade history
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedCourseName, setSelectedCourseName] = useState("");

  // Handle period change
  const handlePeriodChange = useCallback(
    async (periodId: string) => {
      setSelectedPeriod(periodId);

      if (!periodId) {
        setGrades(initialGrades);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/grades?periodId=${periodId}`);
        if (response.ok) {
          const data = await response.json();
          setGrades(data.grades || []);
        }
      } catch (error) {
        console.error("Error fetching grades:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [initialGrades]
  );

  // Handle view history click
  const handleViewHistory = useCallback((courseId: string, courseName: string) => {
    setSelectedCourseId(courseId);
    setSelectedCourseName(courseName);
    setHistoryModalOpen(true);
  }, []);

  const currentPeriodName = selectedPeriod
    ? gradingPeriods.find((p) => p.id === selectedPeriod)?.name
    : gradingPeriods[0]?.name || "Current Term";

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            My Grades
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base mt-2">
            View your academic performance and GPA history.
          </p>
        </div>

        {/* Period Selector */}
        {gradingPeriods.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Period:
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Periods</option>
              {gradingPeriods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name} ({period.academic_year})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("current")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${
            activeTab === "current"
              ? "bg-primary text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">grade</span>
          <span>Current Grades</span>
        </button>
        <button
          onClick={() => setActiveTab("gpa")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${
            activeTab === "gpa"
              ? "bg-primary text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">analytics</span>
          <span>GPA History</span>
        </button>
        <Link
          href="/grades/report-cards"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors whitespace-nowrap ${
            activeTab === "report-cards"
              ? "bg-primary text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">description</span>
          <span>Report Cards</span>
        </Link>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {activeTab === "current" && (
          <>
            {/* Overview Section */}
            <GradesOverview
              gpaData={initialGPA}
              grades={grades}
              periodName={currentPeriodName}
            />

            {/* Course Grades List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Course Grades
                </h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {grades.length} course{grades.length !== 1 ? "s" : ""}
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-primary text-4xl">
                    progress_activity
                  </span>
                </div>
              ) : grades.length > 0 ? (
                <div className="space-y-4">
                  {grades.map((grade) => (
                    <CourseGradeCard
                      key={grade.id}
                      grade={grade}
                      onViewHistory={handleViewHistory}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:bg-[#1a2634] dark:border-slate-700 text-center">
                  <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
                    school
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    No grades available for this period
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                    Grades will appear here once they are released
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "gpa" && (
          <>
            {/* GPA Display */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GPADisplay gpaData={initialGPA} showDetails={true} />

              {/* GPA Quick Stats */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                  GPA Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">Highest Term GPA</span>
                    <span className="font-bold text-msu-green dark:text-green-400">
                      {initialTrend.length > 0
                        ? Math.max(
                            ...initialTrend.map((t) => t.term_gpa || 0)
                          ).toFixed(2)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">Lowest Term GPA</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {initialTrend.length > 0
                        ? Math.min(
                            ...initialTrend
                              .filter((t) => t.term_gpa !== undefined)
                              .map((t) => t.term_gpa!)
                          ).toFixed(2)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">Terms Completed</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {initialTrend.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-600 dark:text-slate-400">Total Credits Earned</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {initialGPA?.cumulative_credits_earned ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* GPA Trend Chart */}
            <GPAHistoryChart trendData={initialTrend} />
          </>
        )}
      </div>

      {/* Grade History Modal */}
      <GradeHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        courseId={selectedCourseId}
        courseName={selectedCourseName}
        studentId={studentId}
      />
    </>
  );
}
