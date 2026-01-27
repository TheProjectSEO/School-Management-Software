"use client";

import { useState, useEffect, useCallback } from "react";

interface FeeCategory {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  default_amount: number;
  is_required: boolean;
  is_refundable: boolean;
  is_active: boolean;
}

interface FeeStructure {
  id: string;
  name: string;
  grade_level?: string;
  amount: number;
  is_active: boolean;
  fee_category: {
    id: string;
    name: string;
    code: string;
    category: string;
  };
}

interface PaymentPlan {
  id: string;
  name: string;
  code: string;
  description?: string;
  number_of_installments: number;
  discount_percentage: number;
  is_active: boolean;
}

type ActiveTab = "categories" | "structures" | "plans";

const categoryTypes = [
  { value: "tuition", label: "Tuition" },
  { value: "miscellaneous", label: "Miscellaneous" },
  { value: "laboratory", label: "Laboratory" },
  { value: "special", label: "Special" },
  { value: "other_fee", label: "Other Fee" },
];

const gradeLevels = [
  "Kindergarten",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10",
  "Grade 11", "Grade 12",
];

export function FeeSetupDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("categories");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    code: "",
    category: "tuition",
    description: "",
    default_amount: 0,
    is_required: true,
    is_refundable: false,
  });

  const [structureForm, setStructureForm] = useState({
    name: "",
    fee_category_id: "",
    grade_level: "",
    amount: 0,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [categoriesRes, structuresRes, plansRes] = await Promise.all([
        fetch("/api/admin/finance/fee-categories"),
        fetch("/api/admin/finance/fee-structures"),
        fetch("/api/admin/finance/payment-plans"),
      ]);

      const [categoriesData, structuresData, plansData] = await Promise.all([
        categoriesRes.json(),
        structuresRes.json(),
        plansRes.json(),
      ]);

      if (categoriesData.success) setCategories(categoriesData.categories || []);
      if (structuresData.success) setStructures(structuresData.structures || []);
      if (plansData.success) setPlans(plansData.plans || []);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCategory = async () => {
    try {
      const response = await fetch("/api/admin/finance/fee-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...categoryForm,
          school_id: "default", // This should come from context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCategoryModal(false);
        setCategoryForm({
          name: "",
          code: "",
          category: "tuition",
          description: "",
          default_amount: 0,
          is_required: true,
          is_refundable: false,
        });
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to create category");
    }
  };

  const handleCreateStructure = async () => {
    try {
      const response = await fetch("/api/admin/finance/fee-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...structureForm,
          school_id: "default", // This should come from context
          school_year_id: "default", // This should come from context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowStructureModal(false);
        setStructureForm({
          name: "",
          fee_category_id: "",
          grade_level: "",
          amount: 0,
        });
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to create structure");
    }
  };

  const handleGenerateDefaultPlans = async () => {
    try {
      const response = await fetch("/api/admin/finance/payment-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: "default", // This should come from context
          school_year_id: "default", // This should come from context
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to generate default plans");
    }
  };

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString()}`;

  const tabs = [
    { id: "categories" as const, label: "Fee Categories", icon: "category", count: categories.length },
    { id: "structures" as const, label: "Fee Structures", icon: "receipt_long", count: structures.length },
    { id: "plans" as const, label: "Payment Plans", icon: "schedule", count: plans.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Fee Setup
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure fee categories, structures, and payment plans
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800">
              {tab.count}
            </span>
          </button>
        ))}
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
      ) : (
        <>
          {/* Categories Tab */}
          {activeTab === "categories" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Category
                </button>
              </div>

              {categories.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-400 mb-3 block">
                    category
                  </span>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No Fee Categories
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Create your first fee category to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className={`rounded-xl border p-4 ${
                        category.is_active
                          ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {category.name}
                          </h3>
                          <p className="text-xs text-slate-500">{category.code}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          category.category === "tuition" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          category.category === "miscellaneous" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          category.category === "laboratory" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                          "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}>
                          {categoryTypes.find(t => t.value === category.category)?.label || category.category}
                        </span>
                      </div>

                      {category.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {category.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-500">Default:</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatCurrency(category.default_amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {category.is_required && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Required
                          </span>
                        )}
                        {category.is_refundable && (
                          <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Refundable
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Structures Tab */}
          {activeTab === "structures" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowStructureModal(true)}
                  disabled={categories.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Structure
                </button>
              </div>

              {structures.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-400 mb-3 block">
                    receipt_long
                  </span>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No Fee Structures
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    {categories.length === 0
                      ? "Create fee categories first, then add structures"
                      : "Define fee amounts for each grade level"}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fee Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Grade Level</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {structures.map((structure) => (
                        <tr key={structure.id} className="bg-white dark:bg-slate-900">
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {structure.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {structure.fee_category?.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {structure.grade_level || "All Grades"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                            {formatCurrency(structure.amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              structure.is_active
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                            }`}>
                              {structure.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Plans Tab */}
          {activeTab === "plans" && (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                {plans.length === 0 && (
                  <button
                    onClick={handleGenerateDefaultPlans}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    Generate Default Plans
                  </button>
                )}
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Plan
                </button>
              </div>

              {plans.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-400 mb-3 block">
                    schedule
                  </span>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No Payment Plans
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Generate default plans or create custom payment schedules
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`rounded-xl border p-5 ${
                        plan.is_active
                          ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            {plan.name}
                          </h3>
                          <p className="text-sm text-slate-500">{plan.code}</p>
                        </div>
                        {plan.discount_percentage > 0 && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {plan.discount_percentage}% OFF
                          </span>
                        )}
                      </div>

                      {plan.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                          {plan.description}
                        </p>
                      )}

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-[18px]">
                            event_repeat
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {plan.number_of_installments === 1
                              ? "One-time payment"
                              : `${plan.number_of_installments} installments`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Add Fee Category
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="e.g., Tuition Fee"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="e.g., TF (auto-generated if empty)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category Type *
                </label>
                <select
                  value={categoryForm.category}
                  onChange={(e) => setCategoryForm({ ...categoryForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {categoryTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default Amount (₱)
                </label>
                <input
                  type="number"
                  value={categoryForm.default_amount}
                  onChange={(e) => setCategoryForm({ ...categoryForm, default_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_required}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_required: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_refundable}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_refundable: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Refundable</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={!categoryForm.name}
                className="px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structure Modal */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Add Fee Structure
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={structureForm.name}
                  onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="e.g., Grade 7 Tuition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fee Category *
                </label>
                <select
                  value={structureForm.fee_category_id}
                  onChange={(e) => setStructureForm({ ...structureForm, fee_category_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Grade Level
                </label>
                <select
                  value={structureForm.grade_level}
                  onChange={(e) => setStructureForm({ ...structureForm, grade_level: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">All Grade Levels</option>
                  {gradeLevels.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Amount (₱) *
                </label>
                <input
                  type="number"
                  value={structureForm.amount}
                  onChange={(e) => setStructureForm({ ...structureForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  min="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowStructureModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStructure}
                disabled={!structureForm.name || !structureForm.fee_category_id}
                className="px-4 py-2 bg-primary hover:bg-[#5a0c0e] text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                Create Structure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeeSetupDashboard;
