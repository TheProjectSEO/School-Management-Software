"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/dal/types";

interface LessonNavigationProps {
  currentLesson: Lesson;
  nextLesson: Lesson | null;
  prevLesson: Lesson | null;
  subjectId: string;
  moduleId: string;
  studentId: string;
  courseId: string;
  isCompleted: boolean;
}

export default function LessonNavigation({
  currentLesson,
  nextLesson,
  prevLesson,
  subjectId,
  moduleId,
  studentId,
  courseId,
  isCompleted,
}: LessonNavigationProps) {
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);

  const handleMarkComplete = async () => {
    if (completing || completed) return;

    setCompleting(true);
    try {
      const response = await fetch("/api/progress/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          courseId,
          lessonId: currentLesson.id,
        }),
      });

      if (response.ok) {
        setCompleted(true);
      }
    } catch (error) {
      console.error("Error marking lesson complete:", error);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {prevLesson ? (
            <Link
              href={`/subjects/${subjectId}/modules/${moduleId}?lesson=${prevLesson.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Previous Lesson</span>
              <span className="sm:hidden">Previous</span>
            </Link>
          ) : (
            <div className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 text-sm font-medium cursor-not-allowed">
              <span className="material-symbols-outlined text-[18px] inline-block mr-2">arrow_back</span>
              <span className="hidden sm:inline">First Lesson</span>
            </div>
          )}

          {!completed && (
            <button
              onClick={handleMarkComplete}
              disabled={completing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-msu-green hover:bg-green-700 text-white text-sm font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">
                {completing ? "sync" : "check_circle"}
              </span>
              <span>{completing ? "Marking..." : "Mark as Complete"}</span>
            </button>
          )}

          {completed && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-msu-green/20 border border-msu-green/30 text-msu-green text-sm font-semibold">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Completed</span>
            </div>
          )}
        </div>

        {nextLesson ? (
          <Link
            href={`/subjects/${subjectId}/modules/${moduleId}?lesson=${nextLesson.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-[#5a0c0e] text-white text-sm font-semibold transition-all shadow-md"
          >
            <span className="hidden sm:inline">Next Lesson</span>
            <span className="sm:hidden">Next</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        ) : (
          <Link
            href={`/subjects/${subjectId}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-[#5a0c0e] text-white text-sm font-semibold transition-all shadow-md"
          >
            <span>Complete Module</span>
            <span className="material-symbols-outlined text-[18px]">emoji_events</span>
          </Link>
        )}
      </div>
    </div>
  );
}
