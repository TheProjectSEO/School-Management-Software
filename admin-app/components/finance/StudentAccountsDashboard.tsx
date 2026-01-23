"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface StudentAccount {
  id: string;
  student_id: string;
  total_assessed: number;
  total_discounts: number;
  total_paid: number;
  current_balance: number;
  days_overdue: number;
  status: "active" | "on_hold" | "settled" | "cancelled";
  student: {
    id: string;
    lrn: string;
    grade_level: string;
    enrollment_status: string;
    section?: { id: string; name: string };
    profile?: { id: string; full_name: string; phone?: string };
  };
  payment_plan?: { id: string; name: string; code: string };
  school_year?: { id: string; year_name: string };
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

const statusConfig = {
  active: {
    label: "Active",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
  },
  on_hold: {
    label: "On Hold",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  settled: {
    label: "Settled",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-slate-100 dark:bg-slate-700",
    text: "text-slate-600 dark:text-slate-400",
  },
};

export function StudentAccountsDashboard() {
  const [accounts, setAccounts] = useState<StudentAccount[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  // Account detail modal
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      if (gradeFilter) {
        params.set("gradeLevel", gradeFilter);
      }

      const response = await fetch(`/api/admin/finance/student-accounts?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAccounts(data.accounts || []);
        setPagination(data.pagination);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch accounts");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, gradeFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const fetchAccountDetail = async (accountId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/admin/finance/student-accounts/${accountId}`);
      const data = await response.json();

      if (data.success) {
        setSelectedAccount(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch account details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (accountId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/finance/student-accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        fetchAccounts();
        if (selectedAccount?.account?.id === accountId) {
          fetchAccountDetail(accountId);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to update status");
    }
  };

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString()}`;

  const totalOutstanding = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);
  const totalPaid = accounts.reduce((sum, acc) => sum + Number(acc.total_paid), 0);
  const onHoldCount = accounts.filter((acc) => acc.status === "on_hold").length;
  const overdueCount = accounts.filter((acc) => acc.days_overdue > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Student Fee Accounts
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View and manage student payment accounts
          </p>
        </div>
        <button
          onClick={fetchAccounts}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon="account_balance"
          color="text-red-500"
        />
        <SummaryCard
          label="Total Collected"
          value={formatCurrency(totalPaid)}
          icon="payments"
          color="text-green-500"
        />
        <SummaryCard
          label="On Hold"
          value={onHoldCount.toString()}
          icon="pause_circle"
          color="text-amber-500"
        />
        <SummaryCard
          label="Overdue"
          value={overdueCount.toString()}
          icon="warning"
          color="text-red-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name or LRN..."
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="settled">Settled</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          <option value="">All Grades</option>
          <option value="Grade 7">Grade 7</option>
          <option value="Grade 8">Grade 8</option>
          <option value="Grade 9">Grade 9</option>
          <option value="Grade 10">Grade 10</option>
          <option value="Grade 11">Grade 11</option>
          <option value="Grade 12">Grade 12</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-400 mb-3 block">
            account_balance_wallet
          </span>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
            No Accounts Found
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery || statusFilter !== "all" || gradeFilter
              ? "No accounts match your filters"
              : "No student fee accounts have been created yet"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Grade</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Assessed</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Paid</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Balance</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {accounts.map((account) => {
                const config = statusConfig[account.status];
                return (
                  <tr key={account.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {account.student?.profile?.full_name || "Unknown"}
                        </span>
                        <p className="text-xs text-slate-500">
                          {account.student?.lrn}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      <div>
                        {account.student?.grade_level}
                        {account.student?.section && (
                          <p className="text-xs text-slate-400">
                            {account.student.section.name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                      {formatCurrency(account.total_assessed)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(account.total_paid)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${
                        account.current_balance > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-600 dark:text-slate-400"
                      }`}>
                        {formatCurrency(account.current_balance)}
                      </span>
                      {account.days_overdue > 0 && (
                        <p className="text-xs text-red-500">
                          {account.days_overdue} days overdue
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => fetchAccountDetail(account.id)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-[18px] text-slate-500">visibility</span>
                        </button>
                        <Link
                          href={`/finance/payments?account=${account.id}`}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                          title="Record Payment"
                        >
                          <span className="material-symbols-outlined text-[18px] text-green-500">add_card</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pagination && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
              Showing {accounts.length} of {pagination.total} accounts
              {pagination.has_more && " (load more to see all)"}
            </div>
          )}
        </div>
      )}

      {/* Account Detail Modal */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {selectedAccount.account?.student?.profile?.full_name || "Student Account"}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {selectedAccount.account?.student?.lrn} • {selectedAccount.account?.student?.grade_level}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedAccount(null)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Balance Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(selectedAccount.account?.total_assessed || 0)}
                      </p>
                      <p className="text-xs text-slate-500">Total Assessed</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedAccount.account?.total_paid || 0)}
                      </p>
                      <p className="text-xs text-slate-500">Total Paid</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(selectedAccount.account?.current_balance || 0)}
                      </p>
                      <p className="text-xs text-slate-500">Balance Due</p>
                    </div>
                  </div>

                  {/* Payment Schedule */}
                  {selectedAccount.payment_schedules?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        Payment Schedule
                      </h4>
                      <div className="space-y-2">
                        {selectedAccount.payment_schedules.map((schedule: any) => (
                          <div
                            key={schedule.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              schedule.status === "paid"
                                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                                : schedule.status === "overdue"
                                ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                                : "border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {schedule.installment_label}
                              </span>
                              <p className="text-xs text-slate-500">
                                Due: {new Date(schedule.due_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-medium text-slate-900 dark:text-white">
                                {formatCurrency(schedule.amount_due)}
                              </span>
                              <p className={`text-xs ${
                                schedule.status === "paid"
                                  ? "text-green-600 dark:text-green-400"
                                  : schedule.status === "overdue"
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-slate-500"
                              }`}>
                                {schedule.status === "paid" ? "Paid" :
                                 schedule.status === "overdue" ? "Overdue" :
                                 schedule.status === "partially_paid" ? `Paid: ${formatCurrency(schedule.amount_paid)}` :
                                 "Pending"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Payments */}
                  {selectedAccount.payments?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        Recent Payments
                      </h4>
                      <div className="space-y-2">
                        {selectedAccount.payments.slice(0, 5).map((payment: any) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800"
                          >
                            <div>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {formatCurrency(payment.amount)}
                              </span>
                              <p className="text-xs text-slate-500">
                                {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}
                              </p>
                            </div>
                            {payment.or_number && (
                              <span className="text-xs text-slate-500">
                                OR: {payment.or_number}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-500">Change Status:</span>
                    {selectedAccount.account?.status !== "on_hold" && (
                      <button
                        onClick={() => handleStatusChange(selectedAccount.account.id, "on_hold")}
                        className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50"
                      >
                        Put On Hold
                      </button>
                    )}
                    {selectedAccount.account?.status === "on_hold" && (
                      <button
                        onClick={() => handleStatusChange(selectedAccount.account.id, "active")}
                        className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50"
                      >
                        Reactivate
                      </button>
                    )}
                    <Link
                      href={`/finance/payments?account=${selectedAccount.account?.id}`}
                      className="px-3 py-1 text-xs font-medium bg-primary text-white rounded-lg hover:bg-[#5a0c0e]"
                    >
                      Record Payment
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
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

export default StudentAccountsDashboard;
