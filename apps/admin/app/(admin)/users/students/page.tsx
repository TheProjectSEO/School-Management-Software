"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, FilterBar, UserStatusBadge, ConfirmModal, ExportButton, FormModal } from "@/components/ui";
import type { FilterOption } from "@/components/ui/FilterBar";

interface Student {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  lrn: string;
  grade_level: string;
  section_name?: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
}

interface PaginatedResult {
  data: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function StudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<Student[]>([]);
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
    gradeLevel: searchParams.get("grade") || "",
    sectionId: searchParams.get("section") || "",
  });

  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    lrn: "",
    gradeLevel: "",
    sectionId: "",
    phone: "",
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.gradeLevel) params.set("gradeLevel", filters.gradeLevel);
      if (filters.sectionId) params.set("sectionId", filters.sectionId);

      const response = await fetch(`/api/admin/users/students?${params}`);
      const result: PaginatedResult = await response.json();

      setStudents(result.data);
      setPagination((prev) => ({
        ...prev,
        total: result.total,
        totalPages: result.totalPages,
      }));
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleReset = () => {
    setFilters({ search: "", status: "", gradeLevel: "", sectionId: "" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleBulkDeactivate = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/users/students/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudents.map((s) => s.id),
          status: "inactive",
        }),
      });

      if (response.ok) {
        setShowDeactivateModal(false);
        setSelectedStudents([]);
        fetchStudents();
      }
    } catch (error) {
      console.error("Failed to deactivate students:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.gradeLevel) params.set("gradeLevel", filters.gradeLevel);
    params.set("format", format);

    const response = await fetch(`/api/admin/users/students/export?${params}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-export.${format === "excel" ? "xlsx" : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleAddStudent = async () => {
    if (!formData.fullName || !formData.email || !formData.gradeLevel) {
      alert("Please fill in all required fields");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/users/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({
          fullName: "",
          email: "",
          lrn: "",
          gradeLevel: "",
          sectionId: "",
          phone: "",
        });
        fetchStudents();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add student");
      }
    } catch (error) {
      console.error("Failed to add student:", error);
      alert("Failed to add student. Please try again.");
    } finally {
      setActionLoading(false);
    }
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
        { value: "suspended", label: "Suspended" },
      ],
    },
    {
      key: "gradeLevel",
      label: "Grade Level",
      type: "select",
      placeholder: "All Grades",
      options: [
        { value: "7", label: "Grade 7" },
        { value: "8", label: "Grade 8" },
        { value: "9", label: "Grade 9" },
        { value: "10", label: "Grade 10" },
        { value: "11", label: "Grade 11" },
        { value: "12", label: "Grade 12" },
      ],
    },
  ];

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "full_name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/users/students/${row.original.id}`}
            className="font-medium text-gray-900 hover:text-primary"
          >
            {row.original.full_name}
          </Link>
          <p className="text-xs text-gray-500">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "lrn",
      header: "LRN",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.lrn || "-"}</span>
      ),
    },
    {
      accessorKey: "grade_level",
      header: "Grade Level",
      cell: ({ row }) => (
        <span>Grade {row.original.grade_level || "-"}</span>
      ),
    },
    {
      accessorKey: "section_name",
      header: "Section",
      cell: ({ row }) => (
        <span>{row.original.section_name || "-"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/users/students/${row.original.id}`}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="View Details"
          >
            <span className="material-symbols-outlined text-lg">visibility</span>
          </Link>
          <Link
            href={`/users/students/${row.original.id}/edit`}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </Link>
          <button
            onClick={() => {
              setSelectedStudents([row.original]);
              setShowDeactivateModal(true);
            }}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Deactivate"
          >
            <span className="material-symbols-outlined text-lg">block</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 mt-1">Manage student accounts and information</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExport={handleExport} />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Add Student
          </button>
          <Link
            href="/users/import"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <span className="material-symbols-outlined text-lg">upload</span>
            Import Students
          </Link>
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
      {selectedStudents.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">
            {selectedStudents.length} student(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeactivateModal(true)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Deactivate Selected
            </button>
            <button
              onClick={() => setSelectedStudents([])}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={students}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        selectable
        onSelectionChange={setSelectedStudents}
        loading={loading}
        emptyMessage="No students found"
        emptyIcon="school"
        rowKey="id"
      />

      {/* Deactivate Modal */}
      <ConfirmModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleBulkDeactivate}
        title="Deactivate Students"
        message={
          <div>
            <p>Are you sure you want to deactivate {selectedStudents.length} student(s)?</p>
            <p className="text-sm text-gray-500 mt-2">
              Deactivated students will not be able to log in or access the system.
            </p>
          </div>
        }
        confirmText="Deactivate"
        variant="danger"
        loading={actionLoading}
      />

      {/* Add Student Modal */}
      <FormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData({
            fullName: "",
            email: "",
            lrn: "",
            gradeLevel: "",
            sectionId: "",
            phone: "",
          });
        }}
        onSubmit={handleAddStudent}
        title="Add New Student"
        submitLabel="Add Student"
        loading={actionLoading}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Juan Dela Cruz"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="student@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LRN (Learner Reference Number)
              </label>
              <input
                type="text"
                value={formData.lrn}
                onChange={(e) => setFormData({ ...formData, lrn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="123456789012"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="+63 9XX XXX XXXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.gradeLevel}
                onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select Grade Level</option>
                {["7", "8", "9", "10", "11", "12"].map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section (Optional)
              </label>
              <input
                type="text"
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Leave blank to assign later"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Note:</span> The student will receive an email with login credentials once their account is created.
            </p>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
