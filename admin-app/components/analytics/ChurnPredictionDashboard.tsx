"use client";

import { useState, useEffect, useCallback } from "react";

interface RiskFactor {
  factor: string;
  value: number | string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

interface ChurnRiskStudent {
  id: string;
  full_name: string;
  lrn: string;
  grade_level: string;
  section_name: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: RiskFactor[];
  last_activity: string | null;
  recommended_actions: string[];
}

interface ChurnSummary {
  total_students: number;
  at_risk_students: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  avg_risk_score: number;
  top_risk_factors: { factor: string; count: number }[];
}

const riskLevelConfig = {
  critical: {
    label: "Critical",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  high: {
    label: "High Risk",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium Risk",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  low: {
    label: "Low Risk",
    bg: "bg-slate-100 dark:bg-slate-700",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
};

export function ChurnPredictionDashboard() {
  const [students, setStudents] = useState<ChurnRiskStudent[]>([]);
  const [summary, setSummary] = useState<ChurnSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>("medium");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("minRiskLevel", selectedRiskLevel);
      params.set("limit", "50");

      const response = await fetch(`/api/admin/analytics/churn-prediction?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch churn predictions");
      }

      setStudents(data.students);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedRiskLevel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (studentId: string) => {
    setExpandedStudentId(prev => prev === studentId ? null : studentId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Churn Prediction Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Identify students at risk of leaving and take proactive action
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
        >
          <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
            refresh
          </span>
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <SummaryCard
            label="Total Students"
            value={summary.total_students}
            icon="groups"
            color="text-slate-500"
          />
          <SummaryCard
            label="At Risk"
            value={summary.at_risk_students}
            icon="warning"
            color="text-amber-500"
          />
          <SummaryCard
            label="Critical"
            value={summary.critical_count}
            icon="error"
            color="text-red-500"
            onClick={() => setSelectedRiskLevel("critical")}
            active={selectedRiskLevel === "critical"}
          />
          <SummaryCard
            label="High Risk"
            value={summary.high_count}
            icon="priority_high"
            color="text-orange-500"
            onClick={() => setSelectedRiskLevel("high")}
            active={selectedRiskLevel === "high"}
          />
          <SummaryCard
            label="Medium Risk"
            value={summary.medium_count}
            icon="remove"
            color="text-amber-500"
            onClick={() => setSelectedRiskLevel("medium")}
            active={selectedRiskLevel === "medium"}
          />
          <SummaryCard
            label="Avg Risk Score"
            value={`${summary.avg_risk_score}%`}
            icon="trending_up"
            color="text-purple-500"
          />
        </div>
      )}

      {/* Top Risk Factors */}
      {summary && summary.top_risk_factors.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
            Top Risk Factors Across Students
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.top_risk_factors.map((rf, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm"
              >
                {rf.factor}
                <span className="ml-2 text-slate-400">({rf.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risk Level Filter */}
      <div className="flex gap-2">
        {['low', 'medium', 'high', 'critical'].map((level) => {
          const config = riskLevelConfig[level as keyof typeof riskLevelConfig];
          return (
            <button
              key={level}
              onClick={() => setSelectedRiskLevel(level)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedRiskLevel === level
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {config.label}+
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-green-500 mb-3 block">
            verified
          </span>
          <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-1">
            No At-Risk Students
          </h3>
          <p className="text-green-700 dark:text-green-400">
            No students meet the selected risk criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((student) => {
            const config = riskLevelConfig[student.risk_level];
            const isExpanded = expandedStudentId === student.id;

            return (
              <div
                key={student.id}
                className={`rounded-xl border-2 ${config.border} overflow-hidden transition-all`}
              >
                {/* Student Row */}
                <div
                  className={`p-4 ${config.bg} cursor-pointer`}
                  onClick={() => toggleExpand(student.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Risk Score Circle */}
                    <div className={`w-14 h-14 rounded-full ${config.bg} border-2 ${config.border} flex flex-col items-center justify-center`}>
                      <span className={`text-lg font-bold ${config.text}`}>
                        {student.risk_score}
                      </span>
                      <span className="text-[10px] text-slate-500">risk</span>
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          {student.full_name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                        <span>{student.grade_level}</span>
                        <span>•</span>
                        <span>{student.section_name}</span>
                        <span>•</span>
                        <span>LRN: {student.lrn}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {student.risk_factors.slice(0, 3).map((rf, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded text-xs ${
                              rf.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              rf.impact === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {rf.factor}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Last Activity */}
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-slate-400">Last Activity</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {student.last_activity
                          ? new Date(student.last_activity).toLocaleDateString()
                          : "No recent activity"}
                      </p>
                    </div>

                    {/* Expand Icon */}
                    <span className="material-symbols-outlined text-slate-400">
                      {isExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Risk Factors Detail */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                          Risk Factors
                        </h4>
                        <div className="space-y-2">
                          {student.risk_factors.map((rf, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-lg border ${
                                rf.impact === 'high' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10' :
                                rf.impact === 'medium' ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10' :
                                'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-slate-900 dark:text-white text-sm">
                                  {rf.factor}
                                </span>
                                <span className={`text-sm font-bold ${
                                  rf.impact === 'high' ? 'text-red-600 dark:text-red-400' :
                                  rf.impact === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                                  'text-slate-600 dark:text-slate-400'
                                }`}>
                                  {rf.value}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {rf.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Actions */}
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                          Recommended Actions
                        </h4>
                        <div className="space-y-2">
                          {student.recommended_actions.map((action, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                            >
                              <span className="material-symbols-outlined text-[18px] text-blue-600 dark:text-blue-400">
                                lightbulb
                              </span>
                              <span className="text-sm text-blue-800 dark:text-blue-300">
                                {action}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-4">
                          <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg text-sm font-medium transition-colors">
                            <span className="material-symbols-outlined text-[18px]">mail</span>
                            Contact Parent
                          </button>
                          <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                            <span className="material-symbols-outlined text-[18px]">person</span>
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  label,
  value,
  icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 transition-all ${
        onClick ? "cursor-pointer hover:shadow-md" : ""
      } ${
        active
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          active ? "bg-primary/10" : "bg-slate-100 dark:bg-slate-800"
        }`}>
          <span className={`material-symbols-outlined ${color} text-[20px]`}>{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default ChurnPredictionDashboard;
