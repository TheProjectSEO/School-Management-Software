"use client";

import { useState, useEffect } from "react";

interface Submission {
  id: string;
  studentName: string;
  assessmentTitle: string;
  courseName: string;
  submittedAt: string;
  status: "pending" | "graded" | "returned";
}

interface GradingInboxWidgetProps {
  onSubmissionClick?: (submissionId: string) => void;
  limit?: number;
}

export default function GradingInboxWidget({
  onSubmissionClick,
  limit = 5,
}: GradingInboxWidgetProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    // Placeholder: fetch pending submissions from API
    setIsLoading(false);
    setSubmissions([]);
    setTotalPending(0);
  }, [limit]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Grading Inbox
          </h2>
          {totalPending > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
              {totalPending}
            </span>
          )}
        </div>
        <button className="text-sm text-primary hover:underline">
          View all
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            No submissions to grade
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => (
            <button
              key={submission.id}
              onClick={() => onSubmissionClick?.(submission.id)}
              className="w-full rounded-lg border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {submission.studentName}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {submission.assessmentTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    {submission.courseName}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(submission.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
