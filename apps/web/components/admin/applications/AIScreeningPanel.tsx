"use client";

import { useState, useCallback } from "react";

interface AIScreeningResult {
  completeness_score: number;
  recommendation: 'approve' | 'review' | 'flag';
  priority: 'high' | 'medium' | 'low';
  risk_flags: string[];
  strengths: string[];
  verification_needed: string[];
  summary: string;
  detailed_analysis: string;
  confidence: number;
}

interface AIScreeningPanelProps {
  applicationId: string;
  applicationName?: string;
  onClose?: () => void;
}

const recommendationConfig = {
  approve: {
    label: "Approve",
    icon: "check_circle",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-400",
  },
  review: {
    label: "Needs Review",
    icon: "visibility",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
  },
  flag: {
    label: "Flagged",
    icon: "flag",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-400",
  },
};

const priorityConfig = {
  high: { label: "High Priority", color: "text-red-600 dark:text-red-400" },
  medium: { label: "Medium Priority", color: "text-amber-600 dark:text-amber-400" },
  low: { label: "Low Priority", color: "text-slate-600 dark:text-slate-400" },
};

export function AIScreeningPanel({ applicationId, applicationName, onClose }: AIScreeningPanelProps) {
  const [screening, setScreening] = useState<AIScreeningResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScreening = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/ai-screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to screen application");
      }

      setScreening(data.screening);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Screening failed");
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  // Initial screen on mount
  useState(() => {
    runScreening();
  });

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-purple-500 mb-3 block">
              sync
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              AI is analyzing application...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <div>
            <h4 className="font-medium text-red-800 dark:text-red-300">Screening Error</h4>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            <button
              onClick={runScreening}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!screening) {
    return null;
  }

  const recConfig = recommendationConfig[screening.recommendation];
  const priConfig = priorityConfig[screening.priority];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
              auto_awesome
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white">
              AI Screening Results
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
        {applicationName && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Applicant: {applicationName}
          </p>
        )}
      </div>

      {/* Main Stats */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-200 dark:border-slate-700">
        {/* Recommendation */}
        <div className={`p-3 rounded-lg ${recConfig.bg} border ${recConfig.border}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`material-symbols-outlined text-[20px] ${recConfig.text}`}>
              {recConfig.icon}
            </span>
            <span className={`text-sm font-bold ${recConfig.text}`}>
              {recConfig.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Recommendation</p>
        </div>

        {/* Completeness */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {screening.completeness_score}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Completeness</p>
        </div>

        {/* Priority */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-bold ${priConfig.color}`}>
              {priConfig.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Priority Level</p>
        </div>

        {/* Confidence */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {screening.confidence}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">AI Confidence</p>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Summary</h4>
        <p className="text-slate-700 dark:text-slate-300">{screening.summary}</p>
      </div>

      {/* Risk Flags & Strengths */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-700">
        {/* Risk Flags */}
        {screening.risk_flags.length > 0 && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Risk Flags ({screening.risk_flags.length})
            </h4>
            <ul className="space-y-1">
              {screening.risk_flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                  <span className="material-symbols-outlined text-[14px] mt-0.5">arrow_right</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Strengths */}
        {screening.strengths.length > 0 && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">thumb_up</span>
              Strengths ({screening.strengths.length})
            </h4>
            <ul className="space-y-1">
              {screening.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                  <span className="material-symbols-outlined text-[14px] mt-0.5">check</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Verification Needed */}
      {screening.verification_needed.length > 0 && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">fact_check</span>
            Items to Verify
          </h4>
          <div className="flex flex-wrap gap-2">
            {screening.verification_needed.map((item, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Analysis */}
      {screening.detailed_analysis && (
        <div className="p-4">
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
            Detailed Analysis
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
            {screening.detailed_analysis}
          </p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          This is an AI-generated assessment. Human review is required for final decisions.
        </p>
        <button
          onClick={runScreening}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Re-analyze
        </button>
      </div>
    </div>
  );
}

export default AIScreeningPanel;
