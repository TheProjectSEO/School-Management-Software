"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface StudentAccount {
  id: string;
  student_id: string;
  total_assessed: number;
  total_paid: number;
  current_balance: number;
  status: string;
  student: {
    id: string;
    lrn: string;
    grade_level: string;
    profile?: { id: string; full_name: string; phone?: string };
  };
}

interface PaymentSchedule {
  id: string;
  installment_label: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: string;
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "bank_deposit", label: "Bank Deposit" },
];

export function RecordPaymentPage() {
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get("account");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentAccount[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected account
  const [selectedAccount, setSelectedAccount] = useState<StudentAccount | null>(null);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);

  // Form
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Check-specific fields
  const [checkNumber, setCheckNumber] = useState("");
  const [checkBank, setCheckBank] = useState("");
  const [checkDate, setCheckDate] = useState("");

  // Bank-specific fields
  const [bankName, setBankName] = useState("");
  const [depositorName, setDepositorName] = useState("");

  // Load preselected account
  useEffect(() => {
    if (preselectedAccountId) {
      loadAccount(preselectedAccountId);
    }
  }, [preselectedAccountId]);

  const searchAccounts = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/finance/student-accounts?search=${encodeURIComponent(searchQuery)}&status=active`
      );
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.accounts || []);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to search accounts");
    } finally {
      setSearching(false);
    }
  };

  const loadAccount = async (accountId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/finance/student-accounts/${accountId}`);
      const data = await response.json();

      if (data.success) {
        setSelectedAccount(data.account);
        setSchedules(data.payment_schedules || []);
        setSearchResults([]);
        setSearchQuery("");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to load account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccount) {
      setError("Please select a student account");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        student_fee_account_id: selectedAccount.id,
        amount: Number(amount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
      };

      if (selectedScheduleId) {
        payload.payment_schedule_id = selectedScheduleId;
      }

      if (paymentMethod === "check") {
        payload.check_number = checkNumber;
        payload.check_bank = checkBank;
        payload.check_date = checkDate || undefined;
      }

      if (paymentMethod === "bank_transfer" || paymentMethod === "bank_deposit") {
        payload.bank_name = bankName || undefined;
        payload.depositor_name = depositorName || undefined;
      }

      const response = await fetch("/api/admin/payments/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data);
        // Reset form
        setAmount("");
        setSelectedScheduleId("");
        setReferenceNumber("");
        setNotes("");
        setCheckNumber("");
        setCheckBank("");
        setCheckDate("");
        setBankName("");
        setDepositorName("");
        // Reload account to show updated balance
        loadAccount(selectedAccount.id);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to record payment");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Record Payment
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Record a manual payment for a student fee account
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">
                Payment Recorded Successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                Amount: {formatCurrency(success.payment?.amount || 0)}
                {success.payment?.or_number && (
                  <> • OR Number: {success.payment.or_number}</>
                )}
              </p>
              {success.warnings?.length > 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                  {success.warnings[0]}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Account Search/Selection */}
      {!selectedAccount ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            1. Select Student Account
          </h3>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchAccounts()}
              placeholder="Search by student name or LRN..."
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <button
              onClick={searchAccounts}
              disabled={searching}
              className="px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {searching ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              ) : (
                "Search"
              )}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((account) => (
                <button
                  key={account.id}
                  onClick={() => loadAccount(account.id)}
                  className="w-full text-left p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {account.student?.profile?.full_name || "Unknown"}
                      </span>
                      <p className="text-xs text-slate-500">
                        {account.student?.lrn} • {account.student?.grade_level}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(account.current_balance)}
                      </span>
                      <p className="text-xs text-slate-500">Balance</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Selected Account Info */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedAccount.student?.profile?.full_name || "Unknown"}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedAccount.student?.lrn} • {selectedAccount.student?.grade_level}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAccount(null);
                  setSchedules([]);
                }}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Change
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-center">
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(selectedAccount.total_assessed)}
                </p>
                <p className="text-xs text-slate-500">Assessed</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(selectedAccount.total_paid)}
                </p>
                <p className="text-xs text-slate-500">Paid</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(selectedAccount.current_balance)}
                </p>
                <p className="text-xs text-slate-500">Balance</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              2. Payment Details
            </h3>

            <div className="space-y-4">
              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₱) *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    min="1"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Check-specific fields */}
              {paymentMethod === "check" && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Check Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Check Number *</label>
                      <input
                        type="text"
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Bank *</label>
                      <input
                        type="text"
                        value={checkBank}
                        onChange={(e) => setCheckBank(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Check Date</label>
                    <input
                      type="date"
                      value={checkDate}
                      onChange={(e) => setCheckDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Note: Check payments will be marked as pending until cleared.
                  </p>
                </div>
              )}

              {/* Bank-specific fields */}
              {(paymentMethod === "bank_transfer" || paymentMethod === "bank_deposit") && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Bank Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Depositor Name</label>
                      <input
                        type="text"
                        value={depositorName}
                        onChange={(e) => setDepositorName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Apply to Schedule */}
              {schedules.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Apply to Installment (Optional)
                  </label>
                  <select
                    value={selectedScheduleId}
                    onChange={(e) => setSelectedScheduleId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">General Payment</option>
                    {schedules
                      .filter((s) => s.status !== "paid")
                      .map((schedule) => (
                        <option key={schedule.id} value={schedule.id}>
                          {schedule.installment_label} - Due: {new Date(schedule.due_date).toLocaleDateString()} ({formatCurrency(schedule.amount_due - schedule.amount_paid)} remaining)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setSelectedAccount(null);
                  setSchedules([]);
                  setAmount("");
                  setSuccess(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !amount}
                className="px-6 py-2 bg-primary hover:bg-[#5a0c0e] text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                )}
                Record Payment
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default RecordPaymentPage;
