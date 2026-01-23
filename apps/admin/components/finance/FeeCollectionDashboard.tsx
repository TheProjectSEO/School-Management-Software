"use client";

import { useState, useEffect, useCallback } from "react";

interface PaymentHistoryItem {
  date: string;
  amount: number;
  status: 'paid' | 'partial' | 'missed';
}

interface PaymentRiskStudent {
  id: string;
  student_id: string;
  student_name: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  grade_level: string;
  section_name: string;
  total_balance: number;
  days_overdue: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  payment_history: PaymentHistoryItem[];
  suggested_action: string;
  recommended_plan?: string;
  last_payment_date: string | null;
  next_due_date: string | null;
}

interface CollectionSummary {
  total_students_with_balance: number;
  total_outstanding: number;
  critical_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  avg_days_overdue: number;
  collection_rate: number;
}

const riskLevelConfig = {
  critical: {
    label: "Critical",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  high: {
    label: "High",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
  },
  medium: {
    label: "Medium",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  low: {
    label: "Low",
    bg: "bg-slate-100 dark:bg-slate-700",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
  },
};

export function FeeCollectionDashboard() {
  const [students, setStudents] = useState<PaymentRiskStudent[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>("medium");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [generatingReminder, setGeneratingReminder] = useState<string | null>(null);
  const [generatedReminder, setGeneratedReminder] = useState<{
    studentId: string;
    subject: string;
    message: string;
    sms_version: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("minRiskLevel", selectedRiskLevel);
      params.set("limit", "50");

      const response = await fetch(`/api/admin/finance/fee-collection-ai?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch fee collection data");
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

  const generateReminder = async (student: PaymentRiskStudent, tone: string = "friendly") => {
    setGeneratingReminder(student.id);
    setGeneratedReminder(null);

    try {
      const response = await fetch("/api/admin/finance/fee-collection-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: student.student_name,
          guardian_name: student.guardian_name,
          balance: student.total_balance,
          days_overdue: student.days_overdue,
          tone,
          include_payment_link: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate reminder");
      }

      setGeneratedReminder({
        studentId: student.id,
        ...data.reminder,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate reminder");
    } finally {
      setGeneratingReminder(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            AI-Powered Fee Collection
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Smart insights and automated reminders for fee collection
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <SummaryCard
            label="Outstanding Total"
            value={formatCurrency(summary.total_outstanding)}
            icon="account_balance"
            color="text-primary"
          />
          <SummaryCard
            label="Students with Balance"
            value={summary.total_students_with_balance.toString()}
            icon="people"
            color="text-amber-500"
          />
          <SummaryCard
            label="Critical"
            value={summary.critical_count.toString()}
            icon="error"
            color="text-red-500"
            onClick={() => setSelectedRiskLevel("critical")}
            active={selectedRiskLevel === "critical"}
          />
          <SummaryCard
            label="High Risk"
            value={summary.high_risk_count.toString()}
            icon="priority_high"
            color="text-orange-500"
            onClick={() => setSelectedRiskLevel("high")}
            active={selectedRiskLevel === "high"}
          />
          <SummaryCard
            label="Avg Days Overdue"
            value={`${summary.avg_days_overdue} days`}
            icon="schedule"
            color="text-slate-500"
          />
          <SummaryCard
            label="Collection Rate"
            value={`${summary.collection_rate}%`}
            icon="trending_up"
            color="text-green-500"
          />
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
            payments
          </span>
          <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-1">
            All Clear!
          </h3>
          <p className="text-green-700 dark:text-green-400">
            No students match the selected risk criteria.
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
                  onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Balance Display */}
                    <div className="text-center min-w-[100px]">
                      <p className={`text-xl font-bold ${config.text}`}>
                        {formatCurrency(student.total_balance)}
                      </p>
                      <p className="text-xs text-slate-500">Outstanding</p>
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          {student.student_name}
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
                        <span>{student.days_overdue > 0 ? `${student.days_overdue} days overdue` : "Current"}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {student.suggested_action}
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateReminder(student);
                        }}
                        disabled={generatingReminder === student.id}
                        className="px-3 py-1.5 bg-primary hover:bg-[#5a0c0e] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {generatingReminder === student.id ? (
                          <span className="material-symbols-outlined animate-spin text-[14px]">sync</span>
                        ) : (
                          "Generate Reminder"
                        )}
                      </button>
                      <span className="material-symbols-outlined text-slate-400">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Contact Info */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                          Guardian Contact
                        </h4>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">{student.guardian_name}</span>
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">mail</span>
                            {student.guardian_email}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">phone</span>
                            {student.guardian_phone}
                          </p>
                        </div>
                      </div>

                      {/* Payment History */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                          Payment History
                        </h4>
                        <div className="space-y-2">
                          {student.payment_history.map((payment, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">
                                {new Date(payment.date).toLocaleDateString()}
                              </span>
                              <span className={`font-medium ${
                                payment.status === 'paid' ? 'text-green-600 dark:text-green-400' :
                                payment.status === 'partial' ? 'text-amber-600 dark:text-amber-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {payment.status === 'paid' ? formatCurrency(payment.amount) :
                                 payment.status === 'partial' ? `Partial ${formatCurrency(payment.amount)}` :
                                 'Missed'}
                              </span>
                            </div>
                          ))}
                        </div>
                        {student.last_payment_date && (
                          <p className="text-xs text-slate-400 mt-3">
                            Last payment: {new Date(student.last_payment_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Recommended Plan */}
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                          Recommended
                        </h4>
                        {student.recommended_plan ? (
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            {student.recommended_plan}
                          </p>
                        ) : (
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            Standard payment schedule
                          </p>
                        )}
                        {student.next_due_date && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 mt-3">
                            Next due: {new Date(student.next_due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Generated Reminder */}
                    {generatedReminder && generatedReminder.studentId === student.id && (
                      <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                        <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                          AI-Generated Reminder
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Subject:</p>
                            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                              {generatedReminder.subject}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Email Message:</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {generatedReminder.message}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">SMS Version:</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded">
                              {generatedReminder.sms_version}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors">
                            Send Email
                          </button>
                          <button className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors">
                            Send SMS
                          </button>
                          <button className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors">
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
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
  value: string;
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
          <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default FeeCollectionDashboard;
