"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, FilterBar, UserStatusBadge, ConfirmModal, ExportButton, FormModal } from "@/components/admin/ui";
import type { FilterOption } from "@/components/admin/ui/FilterBar";

interface Student {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  lrn: string;
  grade_level: string;
  section_name?: string;
  status: "active" | "inactive" | "suspended" | "graduated" | "transferred";
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

  // Real-time search state (updates immediately as user types)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [sections, setSections] = useState<{ id: string; name: string; grade_level: string; enrolled_count: number }[]>([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    lrn: "",
    gradeLevel: "",
    sectionId: "",
    phone: "+63 ",
    temporaryPassword: "",
    birthDate: "",
    gender: "",
    address: "",
    guardianName: "",
    guardianPhone: "",
  });

  const [lrnError, setLrnError] = useState("");

  // Validate LRN format: YYYY-MSU-#### (4 or more digits, no letters)
  const validateLRN = (lrn: string): boolean => {
    if (!lrn) {
      setLrnError("");
      return true; // Empty is OK (will be auto-generated)
    }

    const lrnPattern = /^\d{4}-MSU-\d{4,}$/;
    if (!lrnPattern.test(lrn)) {
      setLrnError("Invalid format. Must be YYYY-MSU-#### (e.g., 2026-MSU-0010, 2026-MSU-10000)");
      return false;
    }

    setLrnError("");
    return true;
  };

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

      const response = await authFetch(`/api/admin/users/students?${params}`);
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

  const fetchSections = useCallback(async () => {
    try {
      const response = await authFetch("/api/admin/sections");
      const data = await response.json();
      setSections(data || []);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    }
  }, []);

  const generateNextLRN = useCallback(async () => {
    try {
      const response = await authFetch("/api/admin/users/students/next-lrn");
      const result = await response.json();
      if (result.lrn) {
        setFormData((prev) => ({ ...prev, lrn: result.lrn }));
      }
    } catch (error) {
      console.error("Failed to generate next LRN:", error);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    if (showAddModal) {
      generateNextLRN();
    }
  }, [showAddModal, generateNextLRN]);

  // Debounced search - updates filters 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== searchQuery) {
        setFilters((prev) => ({ ...prev, search: searchQuery }));
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filters.search]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = (query: string) => {
    // Update search query immediately (real-time)
    // The useEffect with debouncing will update filters after 300ms
    setSearchQuery(query);
  };

  const handleReset = () => {
    setSearchQuery("");
    setFilters({ search: "", status: "", gradeLevel: "", sectionId: "" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleBulkDeactivate = async () => {
    setActionLoading(true);
    try {
      const response = await authFetch("/api/admin/users/students/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudents.map((s) => s.id),
          status: "inactive",
        }),
      });

      if (response.ok) {
        setShowDeactivateModal(false);
        // Keep students selected so user can perform additional actions
        fetchStudents();
      }
    } catch (error) {
      console.error("Failed to deactivate students:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReactivate = async () => {
    setActionLoading(true);
    try {
      const response = await authFetch("/api/admin/users/students/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudents.map((s) => s.id),
          status: "active",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowReactivateModal(false);
        // Keep students selected so user can perform additional actions
        fetchStudents();
      } else {
        alert(result.error || "Failed to reactivate students");
      }
    } catch (error) {
      console.error("Failed to reactivate students:", error);
      alert("Failed to reactivate students. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkSectionChange = async () => {
    if (!selectedSection) {
      alert("Please select a section");
      return;
    }

    setActionLoading(true);
    try {
      // Filter out any undefined/null values and map to IDs
      const studentIds = selectedStudents
        .filter((s): s is Student => s != null && s.id != null)
        .map((s) => s.id);

      if (studentIds.length === 0) {
        alert("No valid students selected");
        setActionLoading(false);
        return;
      }

      const response = await authFetch("/api/admin/users/students/bulk-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          sectionId: selectedSection,
          action: "update_section",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowSectionModal(false);
        // Keep students selected so user can perform additional actions
        setSelectedSection("");
        fetchStudents();
        fetchSections();
      } else {
        alert(result.error || "Failed to update sections");
      }
    } catch (error) {
      console.error("Failed to update sections:", error);
      alert("Failed to update sections. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkGradeChange = async () => {
    if (!selectedGrade) {
      alert("Please select a grade level");
      return;
    }

    if (!selectedSection) {
      alert("Please select a section");
      return;
    }

    // Debug logging
    console.log("selectedStudents:", selectedStudents);
    console.log("selectedStudents.length:", selectedStudents.length);

    if (selectedStudents.length === 0) {
      alert("No valid students selected");
      return;
    }

    setActionLoading(true);
    try {
      // Extract student IDs
      const studentIds = selectedStudents
        .filter((s) => s && s.id)
        .map((s) => s.id);

      console.log("studentIds:", studentIds);

      if (studentIds.length === 0) {
        alert("No valid students selected");
        setActionLoading(false);
        return;
      }

      const response = await authFetch("/api/admin/users/students/bulk-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          sectionId: selectedSection,
          gradeLevel: selectedGrade,
          action: "update_grade_and_section",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowGradeModal(false);
        // Keep students selected so user can perform additional actions
        setSelectedGrade("");
        setSelectedSection("");
        fetchStudents();
      } else {
        alert(result.error || "Failed to update grades and section");
      }
    } catch (error) {
      console.error("Failed to update grades:", error);
      alert("Failed to update grades. Please try again.");
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

    const response = await authFetch(`/api/admin/users/students/export?${params}`);
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

    // Validate LRN format if provided
    if (formData.lrn && !validateLRN(formData.lrn)) {
      alert("Please correct the LRN format before submitting");
      return;
    }

    setActionLoading(true);
    try {
      const response = await authFetch("/api/admin/users/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setShowAddModal(false);
        // Show credentials if a temporary password was generated
        if (result.temporaryPassword) {
          setCreatedCredentials({
            email: formData.email,
            password: result.temporaryPassword,
          });
          setShowCredentialsModal(true);
        }
        setFormData({
          fullName: "",
          email: "",
          lrn: "",
          gradeLevel: "",
          sectionId: "",
          phone: "",
          temporaryPassword: "",
          birthDate: "",
          gender: "",
          address: "",
          guardianName: "",
          guardianPhone: "",
        });
        fetchStudents();
      } else {
        alert(result.error || "Failed to add student");
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
        { value: "graduated", label: "Graduated" },
        { value: "transferred", label: "Transferred" },
      ],
    },
    {
      key: "gradeLevel",
      label: "Grade Level",
      type: "select",
      placeholder: "All Grades",
      options: [
        { value: "1", label: "Grade 1" },
        { value: "2", label: "Grade 2" },
        { value: "3", label: "Grade 3" },
        { value: "4", label: "Grade 4" },
        { value: "5", label: "Grade 5" },
        { value: "6", label: "Grade 6" },
        { value: "7", label: "Grade 7" },
        { value: "8", label: "Grade 8" },
        { value: "9", label: "Grade 9" },
        { value: "10", label: "Grade 10" },
        { value: "11", label: "Grade 11" },
        { value: "12", label: "Grade 12" },
      ],
    },
    {
      key: "sectionId",
      label: "Section",
      type: "select",
      placeholder: "All Sections",
      options: sections.map((section) => ({
        value: section.id,
        label: `${section.name} - Grade ${section.grade_level}`,
      })),
    },
  ];

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "full_name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/users/students/${row.original.id}`}
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
            href={`/admin/users/students/${row.original.id}`}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="View Details"
          >
            <span className="material-symbols-outlined text-lg">visibility</span>
          </Link>
          <Link
            href={`/admin/users/students/${row.original.id}/edit`}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </Link>
          {row.original.status === "active" ? (
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
          ) : (
            <button
              onClick={() => {
                setSelectedStudents([row.original]);
                setShowReactivateModal(true);
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
        <div className="border-l-4 border-l-primary pl-3">
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Students</h1>
          <p className="text-sm text-gray-500 mt-1">Manage student accounts and information</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <ExportButton onExport={handleExport} />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span className="hidden sm:inline">Add Student</span>
          </button>
          <Link
            href="/admin/users/import"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <span className="material-symbols-outlined text-lg">upload</span>
            <span className="hidden sm:inline">Import Students</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filterOptions}
        values={{ ...filters, search: searchQuery }}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Bulk Actions */}
      {selectedStudents.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center sm:justify-between">
          <span className="text-sm text-primary font-medium">
            {selectedStudents.length} student(s) selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowSectionModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="material-symbols-outlined text-base">move_group</span>
              <span className="hidden sm:inline">Move to Section</span>
            </button>
            <button
              onClick={() => setShowGradeModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span className="material-symbols-outlined text-base">school</span>
              <span className="hidden sm:inline">Change Grade</span>
            </button>
            {selectedStudents.some((s) => s.status === "active") && (
              <button
                onClick={() => setShowDeactivateModal(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <span className="material-symbols-outlined text-base">block</span>
                <span className="hidden sm:inline">Deactivate</span>
              </button>
            )}
            {selectedStudents.some((s) => s.status !== "active") && (
              <button
                onClick={() => setShowReactivateModal(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span className="hidden sm:inline">Reactivate</span>
              </button>
            )}
            <button
              onClick={() => setSelectedStudents([])}
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
        data={students}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        selectable
        onSelectionChange={setSelectedStudents}
        selectedItems={selectedStudents}
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

      {/* Reactivate Modal */}
      <ConfirmModal
        isOpen={showReactivateModal}
        onClose={() => setShowReactivateModal(false)}
        onConfirm={handleBulkReactivate}
        title="Reactivate Students"
        message={
          <div>
            <p>Are you sure you want to reactivate {selectedStudents.length} student(s)?</p>
            <p className="text-sm text-gray-500 mt-2">
              Reactivated students will be able to log in and access the system again.
            </p>
          </div>
        }
        confirmText="Reactivate"
        variant="info"
        loading={actionLoading}
      />

      {/* Add Student Modal */}
      <FormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setLrnError("");
          setFormData({
            fullName: "",
            email: "",
            lrn: "",
            gradeLevel: "",
            sectionId: "",
            phone: "+63 ",
            temporaryPassword: "",
            birthDate: "",
            gender: "",
            address: "",
            guardianName: "",
            guardianPhone: "",
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
                <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Auto-assigned</span>
              </label>
              <input
                type="text"
                readOnly
                value={formData.lrn}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="Generating…"
              />
              <p className="text-xs text-gray-400 mt-1">Assigned automatically in sequence</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value;
                  // Ensure +63 prefix is always present
                  if (value.startsWith("+63")) {
                    setFormData({ ...formData, phone: value });
                  } else {
                    setFormData({ ...formData, phone: "+63 " + value.replace(/^\+?63\s*/, "") });
                  }
                }}
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
                onChange={(e) => {
                  setFormData({ ...formData, gradeLevel: e.target.value, sectionId: "" });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select Grade Level</option>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((grade) => (
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
              <select
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={!formData.gradeLevel}
              >
                <option value="">
                  {!formData.gradeLevel ? "Select grade first..." : "Select Section (Optional)"}
                </option>
                {sections
                  .filter((section) => section.grade_level === formData.gradeLevel)
                  .map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} - Grade {section.grade_level}
                    </option>
                  ))}
              </select>
              {formData.gradeLevel && sections.filter((s) => s.grade_level === formData.gradeLevel).length === 0 && (
                <p className="text-sm text-orange-500 mt-1">
                  No sections available for Grade {formData.gradeLevel}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temporary Password
            </label>
            <input
              type="text"
              value={formData.temporaryPassword}
              onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Leave empty to auto-generate"
            />
            <p className="text-xs text-gray-500 mt-1">If left empty, a secure password will be generated automatically</p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Personal Information (Optional)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Street, Barangay, City"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardian Name
                </label>
                <input
                  type="text"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Parent or guardian name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardian Phone
                </label>
                <input
                  type="tel"
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Note:</span> After creation, you will see the login credentials to share with the student.
            </p>
          </div>
        </div>
      </FormModal>

      {/* Credentials Display Modal */}
      {showCredentialsModal && createdCredentials && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Student Created Successfully</h2>
                <p className="text-gray-500 mt-2">Share these credentials with the student</p>
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
                The student will be prompted to change this password on first login.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const text = `Email: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}`;
                    navigator.clipboard.writeText(text);
                    alert("Credentials copied to clipboard!");
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">content_copy</span>
                  Copy Credentials
                </button>
                <button
                  onClick={() => {
                    setShowCredentialsModal(false);
                    setCreatedCredentials(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move to Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => !actionLoading && setShowSectionModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Move Students to Section</h2>
                <p className="text-gray-500 mt-1">
                  Select a section for {selectedStudents.length} student(s)
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Section
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={actionLoading}
                >
                  <option value="">Choose a section...</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} (Grade {section.grade_level}) - {section.enrolled_count} students
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                  Moving students to a section will also update their grade level to match the section.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSectionModal(false);
                    setSelectedSection("");
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkSectionChange}
                  disabled={actionLoading || !selectedSection}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Moving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">move_group</span>
                      Move Students
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Grade Modal */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => !actionLoading && setShowGradeModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Change Grade Level</h2>
                <p className="text-gray-500 mt-1">
                  Select a grade level for {selectedStudents.length} student(s)
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Grade Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value);
                    setSelectedSection(""); // Clear section when grade changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={actionLoading}
                >
                  <option value="">Choose a grade level...</option>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={actionLoading || !selectedGrade}
                >
                  <option value="">
                    {!selectedGrade ? "Select grade first..." : "Choose a section..."}
                  </option>
                  {sections
                    .filter((section) => section.grade_level === selectedGrade)
                    .map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name} - Grade {section.grade_level}
                      </option>
                    ))}
                </select>
                {selectedGrade && sections.filter((s) => s.grade_level === selectedGrade).length === 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    No sections available for Grade {selectedGrade}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                  Both grade level and section will be updated. Section must match the selected grade.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowGradeModal(false);
                    setSelectedGrade("");
                    setSelectedSection("");
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkGradeChange}
                  disabled={actionLoading || !selectedGrade || !selectedSection}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">school</span>
                      Change Grade
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
