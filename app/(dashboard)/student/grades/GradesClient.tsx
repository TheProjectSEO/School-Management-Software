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
import { useStudentTheme } from "@/components/student/providers/StudentThemeProvider";
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
  const { isPlayful } = useStudentTheme();
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
          <h1 className={`text-3xl md:text-4xl font-bold leading-tight tracking-tight ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
            {isPlayful ? "\u2B50 My Stars" : "My Grades"}
          </h1>
          <p className={`text-base mt-2 ${isPlayful ? "text-purple-600" : "text-slate-500 dark:text-slate-400"}`}>
            {isPlayful
              ? "\u{1F31F} See how awesome you're doing in your classes!"
              : "View your academic performance and GPA history."}
          </p>
        </div>

        {/* Period Selector */}
        {gradingPeriods.length > 0 && (
          <div className="flex items-center gap-3">
            <label className={`text-sm font-medium ${isPlayful ? "text-purple-700" : "text-slate-600 dark:text-slate-400"}`}>
              {isPlayful ? "\u{1F4C5} Period:" : "Period:"}
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className={`px-4 py-2 font-medium text-sm focus:outline-none focus:ring-2 ${
                isPlayful
                  ? "rounded-xl border-2 border-pink-200 bg-white text-purple-900 focus:ring-pink-300/40"
                  : "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-primary/20"
              }`}
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
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm transition-colors whitespace-nowrap ${
            isPlayful ? "rounded-xl" : "rounded-lg"
          } ${
            activeTab === "current"
              ? isPlayful
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                : "bg-primary text-white"
              : isPlayful
                ? "bg-white border-2 border-pink-200 text-purple-700 hover:bg-pink-50"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          {isPlayful ? (
            <span className="text-[20px]">{"\u2B50"}</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">grade</span>
          )}
          <span>{isPlayful ? "My Stars" : "Current Grades"}</span>
        </button>
        <button
          onClick={() => setActiveTab("gpa")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm transition-colors whitespace-nowrap ${
            isPlayful ? "rounded-xl" : "rounded-lg"
          } ${
            activeTab === "gpa"
              ? isPlayful
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                : "bg-primary text-white"
              : isPlayful
                ? "bg-white border-2 border-pink-200 text-purple-700 hover:bg-pink-50"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          {isPlayful ? (
            <span className="text-[20px]">{"\u{1F4CA}"}</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">analytics</span>
          )}
          <span>{isPlayful ? "Score History" : "GPA History"}</span>
        </button>
        <Link
          href="/student/grades/report-cards"
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm transition-colors whitespace-nowrap ${
            isPlayful ? "rounded-xl" : "rounded-lg"
          } ${
            activeTab === "report-cards"
              ? isPlayful
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                : "bg-primary text-white"
              : isPlayful
                ? "bg-white border-2 border-pink-200 text-purple-700 hover:bg-pink-50"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          {isPlayful ? (
            <span className="text-[20px]">{"\u{1F4DD}"}</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">description</span>
          )}
          <span>{isPlayful ? "Report Cards" : "Report Cards"}</span>
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
                <h2 className={`text-xl font-bold ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
                  {isPlayful ? "\u{1F4DA} My Subjects" : "Course Grades"}
                </h2>
                <span className={`text-sm ${isPlayful ? "text-purple-500 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
                  {grades.length} {isPlayful ? "subject" : "course"}{grades.length !== 1 ? "s" : ""}
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
                <div className={`p-8 shadow-sm text-center ${
                  isPlayful
                    ? "rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50"
                    : "rounded-xl border border-slate-200 bg-white dark:bg-[#1a2634] dark:border-slate-700"
                }`}>
                  {isPlayful ? (
                    <span className="text-6xl block mb-4">{"\u{1F31F}"}</span>
                  ) : (
                    <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
                      school
                    </span>
                  )}
                  <p className={`font-medium ${isPlayful ? "text-purple-700" : "text-slate-500 dark:text-slate-400"}`}>
                    {isPlayful
                      ? "No stars yet for this period!"
                      : "No grades available for this period"}
                  </p>
                  <p className={`text-sm mt-2 ${isPlayful ? "text-purple-500" : "text-slate-400 dark:text-slate-500"}`}>
                    {isPlayful
                      ? "\u{1F680} Your stars will show up once your teacher adds them!"
                      : "Grades will appear here once they are released"}
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
              <div className={`p-6 shadow-sm ${
                isPlayful
                  ? "rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50"
                  : "rounded-xl border border-slate-200 bg-white dark:bg-[#1a2634] dark:border-slate-700"
              }`}>
                <h3 className={`text-lg font-bold mb-6 ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
                  {isPlayful ? "\u{1F3C6} Score Summary" : "GPA Summary"}
                </h3>
                <div className="space-y-4">
                  <div className={`flex items-center justify-between py-3 border-b ${isPlayful ? "border-pink-200" : "border-slate-100 dark:border-slate-700"}`}>
                    <span className={isPlayful ? "text-purple-700" : "text-slate-600 dark:text-slate-400"}>
                      {isPlayful ? "\u2B50 Best Score" : "Highest Term GPA"}
                    </span>
                    <span className="font-bold text-msu-green dark:text-green-400">
                      {initialTrend.length > 0
                        ? Math.max(
                            ...initialTrend.map((t) => t.term_gpa || 0)
                          ).toFixed(2)
                        : "N/A"}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between py-3 border-b ${isPlayful ? "border-pink-200" : "border-slate-100 dark:border-slate-700"}`}>
                    <span className={isPlayful ? "text-purple-700" : "text-slate-600 dark:text-slate-400"}>
                      {isPlayful ? "\u{1F4AA} Keep Going Score" : "Lowest Term GPA"}
                    </span>
                    <span className={`font-bold ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
                      {initialTrend.length > 0
                        ? Math.min(
                            ...initialTrend
                              .filter((t) => t.term_gpa !== undefined)
                              .map((t) => t.term_gpa!)
                          ).toFixed(2)
                        : "N/A"}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between py-3 border-b ${isPlayful ? "border-pink-200" : "border-slate-100 dark:border-slate-700"}`}>
                    <span className={isPlayful ? "text-purple-700" : "text-slate-600 dark:text-slate-400"}>
                      {isPlayful ? "\u{1F4C5} Terms Done" : "Terms Completed"}
                    </span>
                    <span className={`font-bold ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
                      {initialTrend.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className={isPlayful ? "text-purple-700" : "text-slate-600 dark:text-slate-400"}>
                      {isPlayful ? "\u{1F3AF} Credits Earned" : "Total Credits Earned"}
                    </span>
                    <span className={`font-bold ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
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
