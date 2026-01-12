"use client";

import { useEffect, useState } from "react";
import type { CourseGrade } from "@/lib/dal/types/grades";

interface GradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  studentId: string;
}

export function GradeHistoryModal({
  isOpen,
  onClose,
  courseId,
  courseName,
  studentId,
}: GradeHistoryModalProps) {
  const [history, setHistory] = useState<CourseGrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchHistory();
    }
  }, [isOpen, courseId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/grades?courseId=${courseId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch grade history");
      }
      const data = await response.json();
      setHistory(data.grades || []);
    } catch (err) {
      console.error("Error fetching grade history:", err);
      setError("Failed to load grade history");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white dark:bg-[#1a2634] rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Grade History
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {courseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">
                progress_activity
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-5xl text-red-400 mb-3">
                error
              </span>
              <p className="text-slate-500 dark:text-slate-400">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-[#5a0c0e] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">
                history
              </span>
              <p className="text-slate-500 dark:text-slate-400">
                No grade history available for this course
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((grade, index) => (
                <div
                  key={grade.id}
                  className={`relative pl-6 pb-6 ${
                    index !== history.length - 1
                      ? "border-l-2 border-slate-200 dark:border-slate-700"
                      : ""
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full ${
                      index === 0 ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />

                  {/* Grade card */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 ml-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {grade.grading_period?.name || "Unknown Period"}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {grade.grading_period?.academic_year || "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        {grade.numeric_grade !== undefined && (
                          <p className="text-2xl font-black text-slate-900 dark:text-white">
                            {grade.numeric_grade.toFixed(1)}%
                          </p>
                        )}
                        {grade.letter_grade && (
                          <p className="text-sm font-bold text-primary dark:text-red-400">
                            Grade: {grade.letter_grade}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Credits</span>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {grade.credit_hours}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">GPA Points</span>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {grade.gpa_points?.toFixed(2) ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Status</span>
                        <p className="font-medium text-slate-900 dark:text-white capitalize">
                          {grade.status.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
