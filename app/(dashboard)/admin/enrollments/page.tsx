"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FilterBar, UserStatusBadge, ConfirmModal, ExportButton } from "@/components/admin/ui";
import type { FilterOption } from "@/components/admin/ui/FilterBar";
import { formatDistanceToNow } from "date-fns";

interface CourseEnrollment {
  enrollment_id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  section_id: string;
  section_name: string;
  status: "active" | "completed" | "dropped" | "pending";
  enrolled_at: string;
}

interface StudentEnrollment {
  student_id: string;
  student_name: string;
  student_email: string;
  section_id: string;
  section_name: string;
  grade_level: string;
  enrolled_at: string;
  courses: CourseEnrollment[];
}

interface PaginatedResult {
  data: StudentEnrollment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function EnrollmentsPage() {
  const searchParams = useSearchParams();

  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
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

  // Action modal state - actions operate on individual course enrollments
  const [showActionModal, setShowActionModal] = useState<{
    type: "approve" | "drop" | "transfer";
    enrollment?: CourseEnrollment;
    studentName?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [transferSectionId, setTransferSectionId] = useState("");
  const [dropReason, setDropReason] = useState("");
  const [availableSections, setAvailableSections] = useState<{ id: string; name: string; grade_level: string; capacity: number; enrolled_count: number }[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

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

      const response = await authFetch(`/api/admin/enrollments?${params}`);
      const result: PaginatedResult = await response.json();

      setStudents(result.data);
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

  // Fetch available sections when transfer modal opens
  useEffect(() => {
    if (showActionModal?.type === "transfer" && showActionModal.enrollment?.course_id) {
      const fetchSections = async () => {
        setSectionsLoading(true);
        try {
          const response = await authFetch(`/api/admin/courses/${showActionModal.enrollment?.course_id}/sections`);
          if (response.ok) {
            const sections = await response.json();
            const filtered = sections.filter((s: { id: string }) => s.id !== showActionModal.enrollment?.section_id);
            setAvailableSections(filtered);
          }
        } catch (error) {
          console.error("Failed to fetch sections:", error);
          setAvailableSections([]);
        } finally {
          setSectionsLoading(false);
        }
      };
      fetchSections();
    }
  }, [showActionModal]);

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

  const toggleExpand = (studentId: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleAction = async () => {
    if (!showActionModal?.enrollment) return;

    setActionLoading(true);
    setActionError(null);
    try {
      let response;
      const enrollmentId = showActionModal.enrollment.enrollment_id;

      if (showActionModal.type === "drop") {
        response = await authFetch(`/api/admin/enrollments/${enrollmentId}/drop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: dropReason }),
        });
      } else if (showActionModal.type === "transfer") {
        response = await authFetch(`/api/admin/enrollments/${enrollmentId}/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newSectionId: transferSectionId }),
        });
      } else if (showActionModal.type === "approve") {
        response = await authFetch(`/api/admin/enrollments/${enrollmentId}/approve`, {
          method: "POST",
        });
      }

      if (!response) {
        setActionError("Failed to perform action. Please try again.");
        return;
      }

      if (response.ok) {
        setShowActionModal(null);
        setDropReason("");
        setTransferSectionId("");
        setAvailableSections([]);
        fetchEnrollments();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setActionError(errorData.error || `Action failed with status ${response.status}`);
      }
    } catch (error) {
      console.error("Action failed:", error);
      setActionError("Network error. Please check your connection and try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (exportFormat: "csv" | "excel" | "pdf") => {
    setExportError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.courseId) params.set("courseId", filters.courseId);
      params.set("format", exportFormat);

      const response = await authFetch(`/api/admin/enrollments/export?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setExportError(errorData.error || "Failed to export data");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `enrollments-export.${exportFormat === "excel" ? "xlsx" : exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      setExportError("Failed to export. Please try again.");
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
        { value: "completed", label: "Completed" },
        { value: "dropped", label: "Dropped" },
        { value: "pending", label: "Pending" },
      ],
    },
  ];

  // Count stats from current page data
  const pendingCount = students.reduce(
    (sum, s) => sum + s.courses.filter((c) => c.status === "pending").length, 0
  );
  const activeCount = students.reduce(
    (sum, s) => sum + s.courses.filter((c) => c.status === "active").length, 0
  );
  const droppedCount = students.reduce(
    (sum, s) => sum + s.courses.filter((c) => c.status === "dropped").length, 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="border-l-4 border-l-primary pl-3">
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Enrollments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage student course enrollments</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ExportButton onExport={handleExport} />
          <Link
            href="/admin/enrollments/bulk"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <span className="material-symbols-outlined text-lg">group_add</span>
            <span className="hidden sm:inline">Bulk Enroll</span>
          </Link>
        </div>
      </div>

      {/* Export Error */}
      {exportError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{exportError}</span>
          <button onClick={() => setExportError(null)} className="text-red-500 hover:text-red-700">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">people</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
              <p className="text-sm text-gray-500">Total Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">pending</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
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
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-sm text-gray-500">Active Enrollments</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-600">person_remove</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{droppedCount}</p>
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

      {/* Student Table with Expandable Courses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subjects
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block">assignment_ind</span>
                    No enrollments found
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isExpanded = expandedStudents.has(student.student_id);
                  return (
                    <StudentRow
                      key={student.student_id}
                      student={student}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpand(student.student_id)}
                      onAction={(type, enrollment) =>
                        setShowActionModal({ type, enrollment, studentName: student.student_name })
                      }
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
              {pagination.total} students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

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
              <strong>{showActionModal?.studentName}</strong> from{" "}
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
                Transfer <strong>{showActionModal.studentName}</strong> to a different
                section for <strong>{showActionModal.enrollment?.course_name}</strong>.
              </p>
              {actionError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {actionError}
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Section
                </label>
                <select
                  value={transferSectionId}
                  onChange={(e) => setTransferSectionId(e.target.value)}
                  disabled={sectionsLoading}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-100"
                >
                  <option value="">
                    {sectionsLoading ? "Loading sections..." : "Select section..."}
                  </option>
                  {availableSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.grade_level}) - {section.enrolled_count}/{section.capacity} enrolled
                    </option>
                  ))}
                  {!sectionsLoading && availableSections.length === 0 && (
                    <option value="" disabled>No other sections available</option>
                  )}
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
            <strong>{showActionModal?.studentName}</strong> in{" "}
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

// ============================================================================
// Student Row with expandable courses
// ============================================================================

function StudentRow({
  student,
  isExpanded,
  onToggle,
  onAction,
}: {
  student: StudentEnrollment;
  isExpanded: boolean;
  onToggle: () => void;
  onAction: (type: "approve" | "drop" | "transfer", enrollment: CourseEnrollment) => void;
}) {
  const hasMultipleCourses = student.courses.length > 1;

  return (
    <>
      {/* Main student row */}
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-3 py-3 text-center">
          {hasMultipleCourses ? (
            <button
              onClick={onToggle}
              className="p-0.5 rounded hover:bg-gray-200 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              <span className="material-symbols-outlined text-lg text-gray-500">
                {isExpanded ? "expand_less" : "expand_more"}
              </span>
            </button>
          ) : (
            <span className="inline-block w-6" />
          )}
        </td>
        <td className="px-4 py-3">
          <Link
            href={`/admin/users/students/${student.student_id}`}
            className="font-medium text-gray-900 hover:text-primary"
          >
            {student.student_name}
          </Link>
          <p className="text-xs text-gray-500">{student.student_email}</p>
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {student.section_name}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {student.grade_level || "—"}
        </td>
        <td className="px-4 py-3">
          {hasMultipleCourses ? (
            <button
              onClick={onToggle}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium text-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">menu_book</span>
              {student.courses.length} courses
            </button>
          ) : student.courses.length === 1 ? (
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{student.courses[0].course_name}</p>
                <p className="text-xs text-gray-500">{student.courses[0].course_code}</p>
              </div>
              <UserStatusBadge status={student.courses[0].status} />
              <CourseActions enrollment={student.courses[0]} onAction={onAction} />
            </div>
          ) : (
            <span className="text-sm text-gray-400">No courses</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {student.enrolled_at
            ? formatDistanceToNow(new Date(student.enrolled_at), { addSuffix: true })
            : "—"}
        </td>
      </tr>

      {/* Expanded courses */}
      {isExpanded &&
        student.courses.map((course) => (
          <tr key={course.enrollment_id} className="bg-gray-50/70">
            <td className="px-3 py-2" />
            <td className="px-4 py-2" />
            <td className="px-4 py-2 text-sm text-gray-500">
              {course.section_name}
            </td>
            <td className="px-4 py-2" />
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{course.course_name}</p>
                  <p className="text-xs text-gray-500">{course.course_code}</p>
                </div>
                <UserStatusBadge status={course.status} />
                <CourseActions enrollment={course} onAction={onAction} />
              </div>
            </td>
            <td className="px-4 py-2 text-sm text-gray-500">
              {course.enrolled_at
                ? formatDistanceToNow(new Date(course.enrolled_at), { addSuffix: true })
                : "—"}
            </td>
          </tr>
        ))}
    </>
  );
}

// ============================================================================
// Action buttons for a single course enrollment
// ============================================================================

function CourseActions({
  enrollment,
  onAction,
}: {
  enrollment: CourseEnrollment;
  onAction: (type: "approve" | "drop" | "transfer", enrollment: CourseEnrollment) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 ml-auto">
      {enrollment.status === "pending" && (
        <button
          onClick={() => onAction("approve", enrollment)}
          className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          title="Approve"
        >
          <span className="material-symbols-outlined text-base">check_circle</span>
        </button>
      )}
      {enrollment.status === "active" && (
        <>
          <button
            onClick={() => onAction("transfer", enrollment)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Transfer Section"
          >
            <span className="material-symbols-outlined text-base">swap_horiz</span>
          </button>
          <button
            onClick={() => onAction("drop", enrollment)}
            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Drop"
          >
            <span className="material-symbols-outlined text-base">person_remove</span>
          </button>
        </>
      )}
    </div>
  );
}
