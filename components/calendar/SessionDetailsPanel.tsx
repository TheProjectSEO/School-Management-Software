"use client";

import { useState } from "react";

// Session type matching LiveSession from teacher DAL
interface Session {
  id: string;
  course_id: string;
  section_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  provider: 'zoom' | 'meet' | 'teams' | 'livekit' | 'daily' | 'internal' | null;
  room_id: string | null;
  join_url: string | null;
  recording_url: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  created_at: string;
  course: {
    name: string;
    subject_code: string;
  };
  section: {
    name: string;
    grade_level: string;
  };
  module?: {
    title: string;
  };
}

// Assessment type matching AssessmentDueDate from teacher DAL
interface Assessment {
  id: string;
  title: string;
  description: string | null;
  type: 'quiz' | 'exam' | 'assignment' | 'project';
  due_date: string;
  total_points: number;
  course_id: string;
  course: {
    name: string;
    subject_code: string;
  };
}

interface SessionDetailsPanelProps {
  session: Session | null;
  assessment?: Assessment | null;
  onClose: () => void;
  onEdit?: (session: Session) => void;
  onDelete?: (sessionId: string) => void;
  onStartSession?: (sessionId: string) => void;
}

export default function SessionDetailsPanel({
  session,
  assessment,
  onClose,
  onEdit,
  onDelete,
  onStartSession,
}: SessionDetailsPanelProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!session && !assessment) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      scheduled: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
        label: "Scheduled",
      },
      "in-progress": {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-700 dark:text-green-400",
        label: "In Progress",
      },
      completed: {
        bg: "bg-slate-100 dark:bg-slate-700",
        text: "text-slate-700 dark:text-slate-300",
        label: "Completed",
      },
      cancelled: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
        label: "Cancelled",
      },
    };

    const config = statusConfig[status] || statusConfig.scheduled;

    return (
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const handleDelete = async () => {
    if (!session) return;
    if (!confirm("Are you sure you want to delete this session?")) return;

    setIsDeleting(true);
    try {
      onDelete?.(session.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to format time from ISO string
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to format date from ISO string
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Render assessment details
  if (assessment) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl dark:bg-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Assessment Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Title and Type */}
            <div>
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {assessment.title}
                </h3>
                <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
                </span>
              </div>
              {assessment.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {assessment.description}
                </p>
              )}
            </div>

            {/* Due Date */}
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">
                  Due: {formatDate(assessment.due_date)}
                </span>
              </div>
            </div>

            {/* Course */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Course
              </h4>
              <p className="font-medium text-slate-900 dark:text-white">
                {assessment.course.name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {assessment.course.subject_code}
              </p>
            </div>

            {/* Points */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Total Points
              </h4>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {assessment.total_points}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render session details (session is guaranteed to exist here)
  if (!session) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Session Details
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Title and Status */}
          <div>
            <div className="mb-2 flex items-start justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {session.title}
              </h3>
              {getStatusBadge(session.status)}
            </div>
            {session.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {session.description}
              </p>
            )}
          </div>

          {/* Date and Time */}
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
            <div className="mb-2 flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm">
                {formatDate(session.scheduled_start)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">
                {formatTime(session.scheduled_start)}
                {session.scheduled_end && ` - ${formatTime(session.scheduled_end)}`}
              </span>
            </div>
          </div>

          {/* Course and Section */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              Course & Section
            </h4>
            <p className="font-medium text-slate-900 dark:text-white">
              {session.course.name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {session.section.name} ({session.section.grade_level})
            </p>
          </div>

          {/* Module info if available */}
          {session.module && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Module
              </h4>
              <p className="text-sm text-slate-900 dark:text-white">
                {session.module.title}
              </p>
            </div>
          )}

          {/* Meeting Link */}
          {session.join_url && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Meeting Link
              </h4>
              <a
                href={session.join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Join Meeting
              </a>
            </div>
          )}

          {/* Recording */}
          {session.recording_url && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Recording
              </h4>
              <a
                href={session.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Watch Recording
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex gap-2">
          {session.status === "scheduled" && onStartSession && (
            <button
              onClick={() => onStartSession(session.id)}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Start Session
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(session)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
