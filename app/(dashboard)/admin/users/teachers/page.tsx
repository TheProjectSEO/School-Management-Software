"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, FilterBar, UserStatusBadge, ConfirmModal, ExportButton } from "@/components/admin/ui";
import type { FilterOption } from "@/components/admin/ui/FilterBar";

interface Teacher {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  employee_id: string;
  department?: string;
  is_active: boolean;
  created_at: string;
}

interface PaginatedResult {
  data: Teacher[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function TeachersPage() {
  const searchParams = useSearchParams();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    department: searchParams.get("department") || "",
  });

  const [selectedTeachers, setSelectedTeachers] = useState<Teacher[]>([]);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.department) params.set("department", filters.department);

      const response = await authFetch(`/api/admin/users/teachers?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData.error || response.statusText);
        setTeachers([]);
        return;
      }

      const result: PaginatedResult = await response.json();
      setTeachers(result.data || []);
      setPagination((prev) => ({
        ...prev,
        total: result.total || 0,
        totalPages: result.totalPages || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleReset = () => {
    setFilters({ search: "", status: "", department: "" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleBulkDeactivate = async () => {
    setActionLoading(true);
    try {
      const response = await authFetch("/api/admin/users/teachers/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherIds: selectedTeachers.map((t) => t.id),
          isActive: false,
        }),
      });

      if (response.ok) {
        setShowDeactivateModal(false);
        fetchTeachers();
      }
    } catch (error) {
      console.error("Failed to deactivate teachers:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    setActionLoading(true);
    try {
      const response = await authFetch("/api/admin/users/teachers/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherIds: selectedTeachers.map((t) => t.id),
          isActive: true,
        }),
      });

      if (response.ok) {
        setShowActivateModal(false);
        fetchTeachers();
      }
    } catch (error) {
      console.error("Failed to activate teachers:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.department) params.set("department", filters.department);
    params.set("format", format);

    const response = await authFetch(`/api/admin/users/teachers/export?${params}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teachers-export.${format === "excel" ? "xlsx" : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filterOptions: FilterOption[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All Statuses",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    {
      key: "department",
      label: "Department",
      type: "select",
      placeholder: "All Departments",
      options: [
        { value: "mathematics", label: "Mathematics" },
        { value: "science", label: "Science" },
        { value: "english", label: "English" },
        { value: "filipino", label: "Filipino" },
        { value: "social_studies", label: "Social Studies" },
        { value: "mapeh", label: "MAPEH" },
        { value: "tle", label: "TLE" },
        { value: "values", label: "Values Education" },
      ],
    },
  ];

  const columns: ColumnDef<Teacher>[] = [
    {
      accessorKey: "full_name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/users/teachers/${row.original.id}`}
            className="font-medium text-gray-900 hover:text-primary"
          >
            {row.original.full_name}
          </Link>
          <p className="text-xs text-gray-500">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "employee_id",
      header: "Employee ID",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.employee_id || "-"}</span>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.department?.replace("_", " ") || "-"}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <UserStatusBadge status={row.original.is_active ? "active" : "inactive"} />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/users/teachers/${row.original.id}`}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="View Details"
          >
            <span className="material-symbols-outlined text-lg">visibility</span>
          </Link>
          <Link
            href={`/admin/users/teachers/${row.original.id}/edit`}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </Link>
          {row.original.is_active ? (
            <button
              onClick={() => {
                setSelectedTeachers([row.original]);
                setShowDeactivateModal(true);
              }}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Deactivate"
            >
              <span className="material-symbols-outlined text-lg">block</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedTeachers([row.original]);
                setShowActivateModal(true);
              }}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Activate"
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage teacher accounts and assignments</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ExportButton onExport={handleExport} />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span className="hidden sm:inline">Add Teacher</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filterOptions}
        values={filters}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Bulk Actions */}
      {selectedTeachers.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center sm:justify-between">
          <span className="text-sm text-primary font-medium">
            {selectedTeachers.length} teacher(s) selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedTeachers.some((t) => t.is_active) && (
              <button
                onClick={() => setShowDeactivateModal(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <span className="material-symbols-outlined text-base">block</span>
                <span className="hidden sm:inline">Deactivate</span>
              </button>
            )}
            {selectedTeachers.some((t) => !t.is_active) && (
              <button
                onClick={() => setShowActivateModal(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span className="hidden sm:inline">Activate</span>
              </button>
            )}
            <button
              onClick={() => setSelectedTeachers([])}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={teachers}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        selectable
        onSelectionChange={setSelectedTeachers}
        selectedItems={selectedTeachers}
        loading={loading}
        emptyMessage="No teachers found"
        emptyIcon="person"
        rowKey="id"
      />

      {/* Deactivate Modal */}
      <ConfirmModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleBulkDeactivate}
        title="Deactivate Teachers"
        message={
          <div>
            <p>Are you sure you want to deactivate {selectedTeachers.length} teacher(s)?</p>
            <p className="text-sm text-gray-500 mt-2">
              Deactivated teachers will not be able to log in or access the system.
            </p>
          </div>
        }
        confirmText="Deactivate"
        variant="danger"
        loading={actionLoading}
      />

      {/* Activate Modal */}
      <ConfirmModal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        onConfirm={handleBulkActivate}
        title="Activate Teachers"
        message={
          <div>
            <p>Are you sure you want to activate {selectedTeachers.length} teacher(s)?</p>
            <p className="text-sm text-gray-500 mt-2">
              Activated teachers will be able to log in and access the system again.
            </p>
          </div>
        }
        confirmText="Activate"
        variant="info"
        loading={actionLoading}
      />

      {/* Add Teacher Modal - would be a separate component in production */}
      {showAddModal && (
        <AddTeacherModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchTeachers();
          }}
        />
      )}
    </div>
  );
}

function AddTeacherModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [employeeIdError, setEmployeeIdError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    department: "",
    phone: "",
    temporaryPassword: "",
  });

  // Validate employee ID format
  const validateEmployeeId = (id: string): boolean => {
    if (!id) {
      setEmployeeIdError("");
      return true; // Empty is OK (will be auto-generated)
    }

    const employeeIdPattern = /^T-\d{4}-\d{4,}$/;
    if (!employeeIdPattern.test(id)) {
      setEmployeeIdError("Invalid format. Must be T-YYYY-#### (e.g., T-2026-0001, T-2026-10000)");
      return false;
    }

    setEmployeeIdError("");
    return true;
  };

  // Auto-generate next employee ID on modal open
  useEffect(() => {
    const generateNextEmployeeId = async () => {
      try {
        const response = await authFetch("/api/admin/users/teachers?pageSize=1000");
        if (!response.ok) return;

        const result = await response.json();
        const teachers = result.data || [];

        // Get current year
        const currentYear = new Date().getFullYear();

        // Parse existing employee IDs matching format: T-YYYY-####
        const employeeIdPattern = /^T-(\d{4})-(\d{4,})$/;
        const currentYearIds = teachers
          .map((t: Teacher) => t.employee_id)
          .filter((id: string) => {
            const match = id?.match(employeeIdPattern);
            return match && match[1] === currentYear.toString();
          })
          .map((id: string) => {
            const match = id.match(employeeIdPattern);
            return match ? parseInt(match[2], 10) : 0;
          });

        // Find max number for current year, default to 0 if none exist
        const maxNumber = currentYearIds.length > 0 ? Math.max(...currentYearIds) : 0;
        const nextNumber = maxNumber + 1;

        // Format: T-YYYY-0001, T-YYYY-0002, etc.
        const nextEmployeeId = `T-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

        setFormData((prev) => ({ ...prev, employeeId: nextEmployeeId }));
      } catch (error) {
        console.error("Failed to generate employee ID:", error);
      }
    };

    generateNextEmployeeId();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate employee ID format before submission
    if (formData.employeeId && !validateEmployeeId(formData.employeeId)) {
      alert("Please correct the Employee ID format before submitting");
      return;
    }

    setLoading(true);

    try {
      const response = await authFetch("/api/admin/users/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        // Show the credentials before closing
        if (result.temporaryPassword) {
          setCreatedCredentials({
            email: formData.email,
            password: result.temporaryPassword,
          });
        } else {
          onSuccess();
        }
      } else {
        alert(result.error || "Failed to create teacher");
      }
    } catch (error) {
      console.error("Failed to create teacher:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (createdCredentials) {
      const text = `Email: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}`;
      navigator.clipboard.writeText(text);
      alert("Credentials copied to clipboard!");
    }
  };

  const handleDone = () => {
    setCreatedCredentials(null);
    onSuccess();
  };

  // Show credentials after creation
  if (createdCredentials) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Teacher Created Successfully</h2>
              <p className="text-gray-500 mt-2">Share these credentials with the teacher</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
                <p className="font-mono text-sm bg-white px-3 py-2 rounded border">{createdCredentials.email}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Temporary Password</label>
                <p className="font-mono text-sm bg-white px-3 py-2 rounded border">{createdCredentials.password}</p>
              </div>
            </div>

            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mb-6">
              <span className="material-symbols-outlined text-sm align-middle mr-1">warning</span>
              The teacher will be prompted to change this password on first login.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
                Copy Credentials
              </button>
              <button
                onClick={handleDone}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Add New Teacher</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.employeeId}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, employeeId: value });
                  validateEmployeeId(value);
                }}
                placeholder="T-2026-0001"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  employeeIdError ? "border-red-500 focus:border-red-500" : "border-gray-200 focus:border-primary"
                }`}
              />
              {employeeIdError ? (
                <p className="text-xs text-red-500 mt-1">{employeeIdError}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Auto-generated. Format: T-YYYY-#### (editable)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temporary Password
              </label>
              <input
                type="text"
                value={formData.temporaryPassword}
                onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                placeholder="Leave empty to auto-generate"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">If left empty, a secure password will be generated automatically</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Select Department</option>
                <option value="mathematics">Mathematics</option>
                <option value="science">Science</option>
                <option value="english">English</option>
                <option value="filipino">Filipino</option>
                <option value="social_studies">Social Studies</option>
                <option value="mapeh">MAPEH</option>
                <option value="tle">TLE</option>
                <option value="values">Values Education</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Add Teacher
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
