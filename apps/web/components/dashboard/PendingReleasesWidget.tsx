"use client";

import { useState, useEffect } from "react";

interface PendingRelease {
  id: string;
  type: "grade" | "assessment" | "material";
  title: string;
  courseName: string;
  sectionName: string;
  studentCount: number;
  createdAt: string;
}

interface PendingReleasesWidgetProps {
  onReleaseClick?: (releaseId: string) => void;
  onReleaseAll?: () => void;
}

export default function PendingReleasesWidget({
  onReleaseClick,
  onReleaseAll,
}: PendingReleasesWidgetProps) {
  const [releases, setReleases] = useState<PendingRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Placeholder: fetch pending releases from API
    setIsLoading(false);
    setReleases([]);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "grade":
        return (
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        );
      case "assessment":
        return (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "material":
        return (
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
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "grade":
        return "Grades";
      case "assessment":
        return "Assessment";
      case "material":
        return "Material";
      default:
        return type;
    }
  };

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
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Pending Releases
        </h2>
        {releases.length > 0 && onReleaseAll && (
          <button
            onClick={onReleaseAll}
            className="text-sm text-primary hover:underline"
          >
            Release all
          </button>
        )}
      </div>

      {releases.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            No pending releases
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {releases.map((release) => (
            <div
              key={release.id}
              className="rounded-lg border border-slate-100 p-3 dark:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {getTypeIcon(release.type)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {release.title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {release.courseName} - {release.sectionName}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {getTypeLabel(release.type)} for {release.studentCount}{" "}
                      students
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onReleaseClick?.(release.id)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                >
                  Release
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
