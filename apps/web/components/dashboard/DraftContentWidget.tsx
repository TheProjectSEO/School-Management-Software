"use client";

import { useState, useEffect } from "react";

interface DraftContent {
  id: string;
  type: "lesson" | "assessment" | "announcement" | "module";
  title: string;
  courseName: string;
  lastModified: string;
  progress: number;
}

interface DraftContentWidgetProps {
  onDraftClick?: (draftId: string, type: string) => void;
}

export default function DraftContentWidget({
  onDraftClick,
}: DraftContentWidgetProps) {
  const [drafts, setDrafts] = useState<DraftContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Placeholder: fetch drafts from API
    setIsLoading(false);
    setDrafts([]);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "lesson":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "assessment":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "announcement":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "module":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
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
          Draft Content
        </h2>
        {drafts.length > 0 && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {drafts.length} drafts
          </span>
        )}
      </div>

      {drafts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            No drafts in progress
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <button
              key={draft.id}
              onClick={() => onDraftClick?.(draft.id, draft.type)}
              className="w-full rounded-lg border border-slate-100 p-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${getTypeColor(draft.type)}`}
                    >
                      {draft.type.charAt(0).toUpperCase() + draft.type.slice(1)}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {draft.title}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {draft.courseName}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(draft.lastModified).toLocaleDateString()}
                </span>
              </div>
              {draft.progress > 0 && (
                <div className="mt-2">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Progress
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {draft.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${draft.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
