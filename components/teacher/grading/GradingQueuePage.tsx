"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface GradingQueueItem {
  id: string;
  submission_id: string;
  question_id: string;
  question_type: string;
  question_text: string | null;
  student_response: string | null;
  max_points: number;
  points_awarded: number | null;
  feedback: string | null;
  status: "pending" | "graded" | "flagged";
  priority: number;
  graded_at: string | null;
  created_at: string;
  student_name?: string;
  student_id?: string;
  student_lrn?: string;
  assessment_id?: string;
  assessment_title?: string;
  course_name?: string;
  section_name?: string;
  submitted_at?: string;
}

interface QueueStats {
  pending: number;
  graded: number;
  flagged: number;
  total: number;
}

interface Assessment {
  id: string;
  title: string;
  pending_count: number;
}

interface GradingQueuePageProps {
  teacherId: string;
}

export default function GradingQueuePage({ teacherId }: GradingQueuePageProps) {
  const [items, setItems] = useState<GradingQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "flagged">("pending");
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");

  // Fetch queue items
  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("status", filter);
      }
      if (selectedAssessment) {
        params.set("assessmentId", selectedAssessment);
      }

      const response = await authFetch(`/api/teacher/grading/queue?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch grading queue");
      }

      const data = await response.json();
      if (data.success) {
        setItems(data.items || []);
      } else {
        throw new Error(data.error || "Failed to fetch queue");
      }
    } catch (err) {
      console.error("Error fetching grading queue:", err);
      setError("Unable to load grading queue");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter, selectedAssessment]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await authFetch("/api/teacher/grading/queue/stats");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats({
            pending: data.stats.pending,
            graded: data.stats.graded,
            flagged: data.stats.flagged,
            total: data.stats.total,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  // Fetch assessments with pending grading
  const fetchAssessments = useCallback(async () => {
    try {
      const response = await authFetch("/api/teacher/grading/queue/assessments");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAssessments(data.assessments || []);
        }
      }
    } catch (err) {
      console.error("Error fetching assessments:", err);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchStats();
    fetchAssessments();
  }, [fetchQueue, fetchStats, fetchAssessments]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Pending
          </span>
        );
      case "flagged":
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Flagged
          </span>
        );
      case "graded":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Graded
          </span>
        );
      default:
        return null;
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      essay: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      short_answer: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      file_upload: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] || "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"}`}>
        {type.replace(/_/g, " ")}
      </span>
    );
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Grading Queue
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review and grade student submissions
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3">
          {/* Assessment Filter */}
          <select
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="">All Assessments</option>
            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.title} ({assessment.pending_count})
              </option>
            ))}
          </select>

          {/* Status Filter Tabs */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => setFilter("pending")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === "pending"
                  ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Pending {stats && `(${stats.pending})`}
            </button>
            <button
              onClick={() => setFilter("flagged")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === "flagged"
                  ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Flagged {stats && `(${stats.flagged})`}
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pending}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.flagged}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Flagged</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.graded}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Graded</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.total}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchQueue}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Queue List */}
      {!error && items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {filter === "pending" ? "No pending submissions" : "No submissions found"}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {filter === "pending"
              ? "All caught up! Check back later for new submissions."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Assessment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {item.student_name || "Unknown"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.student_lrn || "No LRN"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {item.assessment_title || "Unknown Assessment"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.course_name} {item.section_name && `• ${item.section_name}`}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {getQuestionTypeBadge(item.question_type)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {item.submitted_at
                      ? new Date(item.submitted_at).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {getStatusBadge(item.status)}
                    {item.priority > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        High
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      href={`/teacher/grading/${item.id}`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                      Grade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
