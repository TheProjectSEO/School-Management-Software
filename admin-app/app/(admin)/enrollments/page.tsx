"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, FilterBar, UserStatusBadge, ConfirmModal, ExportButton } from "@/components/ui";
import type { FilterOption } from "@/components/ui/FilterBar";
import { formatDistanceToNow } from "date-fns";

interface Enrollment {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  course_id: string;
  course_name: string;
  course_code: string;
  section_id: string;
  section_name: string;
  status: "active" | "completed" | "dropped" | "pending";
  enrolled_at: string;
}

interface PaginatedResult {
  data: Enrollment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function EnrollmentsPage() {
  const searchParams = useSearchParams();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
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
    courseId: searchParams.get("courseId") || "",
    sectionId: searchParams.get("sectionId") || "",
  });

  const [selectedEnrollments, setSelectedEnrollments] = useState<Enrollment[]>([]);
  const [showActionModal, setShowActionModal] = useState<{
    type: "approve" | "drop" | "transfer";
    enrollment?: Enrollment;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [transferSectionId, setTransferSectionId] = useState("");
  const [dropReason, setDropReason] = useState("");

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.courseId) params.set("courseId", filters.courseId);
      if (filters.sectionId) params.set("sectionId", filters.sectionId);

      const response = await fetch(`/api/admin/enrollments?${params}`);
      const result: PaginatedResult = await response.json();

      setEnrollments(result.data);
      setPagination((prev) => ({
        ...prev,
        total: result.total,
        totalPages: result.totalPages,
      }));
    } catch (error) {
      console.error("Failed to fetch enrollments:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleReset = () => {
    setFilters({ search: "", status: "", courseId: "", sectionId: "" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleAction = async () => {
    if (!showActionModal) return;

    setActionLoading(true);
    try {
      let response;

      if (showActionModal.type === "drop" && showActionModal.enrollment) {
        response = await fetch(`/api/admin/enrollments/${showActionModal.enrollment.id}/drop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: dropReason }),
        });
      } else if (showActionModal.type === "transfer" && showActionModal.enrollment) {
        response = await fetch(`/api/admin/enrollments/${showActionModal.enrollment.id}/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newSectionId: transferSectionId }),
        });
      } else if (showActionModal.type === "approve" && showActionModal.enrollment) {
        response = await fetch(`/api/admin/enrollments/${showActionModal.enrollment.id}/approve`, {
          method: "POST",
        });
      }

      if (response?.ok) {
        setShowActionModal(null);
        setDropReason("");
        setTransferSectionId("");
        fetchEnrollments();
      }
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async (exportFormat: "csv" | "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.courseId) params.set("courseId", filters.courseId);
    params.set("format", exportFormat);

    const response = await fetch(`/api/admin/enrollments/export?${params}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enrollments-export.${exportFormat === "excel" ? "xlsx" : exportFormat}`;
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
        { value: "completed", label: "Completed" },
        { value: "dropped", label: "Dropped" },
        { value: "pending", label: "Pending" },
      ],
    },
  ];

  const columns: ColumnDef<Enrollment>[] = [
    {
      accessorKey: "student_name",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/users/students/${row.original.student_id}`}
            className="font-medium text-gray-900 hover:text-primary"
          >
            {row.original.student_name}
          </Link>
          <p className="text-xs text-gray-500">{row.original.student_email}</p>
        </div>
      ),
    },
    {
      accessorKey: "course_name",
      header: "Course",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.course_name}</p>
          <p className="text-xs text-gray-500">{row.original.course_code}</p>
        </div>
      ),
    },
    {
      accessorKey: "section_name",
      header: "Section",
      cell: ({ row }) => <span>{row.original.section_name}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "enrolled_at",
      header: "Enrolled",
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(row.original.enrolled_at), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status === "pending" && (
            <button
              onClick={() => setShowActionModal({ type: "approve", enrollment: row.original })}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Approve"
            >
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </button>
          )}
          {row.original.status === "active" && (
            <>
              <button
                onClick={() => setShowActionModal({ type: "transfer", enrollment: row.original })}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Transfer Section"
              >
                <span className="material-symbols-outlined text-lg">swap_horiz</span>
              </button>
              <button
                onClick={() => setShowActionModal({ type: "drop", enrollment: row.original })}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Drop"
              >
                <span className="material-symbols-outlined text-lg">person_remove</span>
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
          <p className="text-gray-500 mt-1">Manage student course enrollments</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExport={handleExport} />
          <Link
            href="/enrollments/bulk"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <span className="material-symbols-outlined text-lg">group_add</span>
            Bulk Enroll
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">check_circle</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
              <p className="text-sm text-gray-500">Total Enrollments</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">pending</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {enrollments?.filter((e) => e.status === "pending").length || 0}
              </p>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600">school</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {enrollments?.filter((e) => e.status === "active").length || 0}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-600">person_remove</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {enrollments?.filter((e) => e.status === "dropped").length || 0}
              </p>
              <p className="text-sm text-gray-500">Dropped</p>
            </div>
          </div>
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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={enrollments}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        selectable
        onSelectionChange={setSelectedEnrollments}
        loading={loading}
        emptyMessage="No enrollments found"
        emptyIcon="assignment_ind"
        rowKey="id"
      />

      {/* Drop Modal */}
      <ConfirmModal
        isOpen={showActionModal?.type === "drop"}
        onClose={() => setShowActionModal(null)}
        onConfirm={handleAction}
        title="Drop Enrollment"
        message={
          <div className="space-y-4">
            <p>
              Are you sure you want to drop{" "}
              <strong>{showActionModal?.enrollment?.student_name}</strong> from{" "}
              <strong>{showActionModal?.enrollment?.course_name}</strong>?
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for dropping
              </label>
              <textarea
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Enter reason..."
              />
            </div>
          </div>
        }
        confirmText="Drop Enrollment"
        variant="danger"
        loading={actionLoading}
      />

      {/* Transfer Modal */}
      {showActionModal?.type === "transfer" && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowActionModal(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transfer Section</h3>
              <p className="text-sm text-gray-600 mb-4">
                Transfer <strong>{showActionModal.enrollment?.student_name}</strong> to a different
                section for <strong>{showActionModal.enrollment?.course_name}</strong>.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Section
                </label>
                <select
                  value={transferSectionId}
                  onChange={(e) => setTransferSectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select section...</option>
                  <option value="section-a">Section A</option>
                  <option value="section-b">Section B</option>
                  <option value="section-c">Section C</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowActionModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={!transferSectionId || actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      <ConfirmModal
        isOpen={showActionModal?.type === "approve"}
        onClose={() => setShowActionModal(null)}
        onConfirm={handleAction}
        title="Approve Enrollment"
        message={
          <p>
            Approve enrollment for{" "}
            <strong>{showActionModal?.enrollment?.student_name}</strong> in{" "}
            <strong>{showActionModal?.enrollment?.course_name}</strong>?
          </p>
        }
        confirmText="Approve"
        variant="info"
        loading={actionLoading}
      />
    </div>
  );
}
