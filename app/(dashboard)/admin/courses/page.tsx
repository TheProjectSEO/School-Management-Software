"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/admin/ui/DataTable";
import FilterBar from "@/components/admin/ui/FilterBar";
import type { FilterOption } from "@/components/admin/ui/FilterBar";
import ConfirmModal from "@/components/admin/ui/ConfirmModal";
import { FormModal } from "@/components/admin/ui/FormModal";

interface Course {
  id: string;
  name: string;
  subject_code: string;
  description: string | null;
  credits: number | null;
  school_id: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: "",
  });

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    subject_code: "",
    description: "",
    credits: "",
  });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);

      const response = await fetch(`/api/admin/courses?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch courses");
      }
      const data = await response.json();
      setCourses(data);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  }, [filters.search]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
  };

  const handleReset = () => {
    setFilters({ search: "" });
  };

  const handleAddCourse = async () => {
    if (!formData.name || !formData.subject_code) {
      alert("Please fill in all required fields");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          subject_code: formData.subject_code,
          description: formData.description || null,
          credits: formData.credits ? parseInt(formData.credits) : null,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        resetForm();
        fetchCourses();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add course");
      }
    } catch (err) {
      console.error("Failed to add course:", err);
      alert("Failed to add course. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCourse = async () => {
    if (!selectedCourse || !formData.name || !formData.subject_code) {
      alert("Please fill in all required fields");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          subject_code: formData.subject_code,
          description: formData.description || null,
          credits: formData.credits ? parseInt(formData.credits) : null,
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedCourse(null);
        resetForm();
        fetchCourses();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update course");
      }
    } catch (err) {
      console.error("Failed to update course:", err);
      alert("Failed to update course. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedCourse(null);
        fetchCourses();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete course");
      }
    } catch (err) {
      console.error("Failed to delete course:", err);
      alert("Failed to delete course. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      name: course.name,
      subject_code: course.subject_code,
      description: course.description || "",
      credits: course.credits?.toString() || "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      subject_code: "",
      description: "",
      credits: "",
    });
  };

  const filterOptions: FilterOption[] = [];

  const columns: ColumnDef<Course>[] = [
    {
      accessorKey: "subject_code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {row.original.subject_code}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Course Name",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/courses/${row.original.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
          >
            {row.original.name}
          </Link>
          {row.original.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "credits",
      header: "Credits",
      cell: ({ row }) => (
        <span className="text-gray-600">
          {row.original.credits ?? "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/courses/${row.original.id}`}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="View Details"
          >
            <span className="material-symbols-outlined text-lg">visibility</span>
          </Link>
          <button
            onClick={() => openEditModal(row.original)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
          <button
            onClick={() => {
              setSelectedCourse(row.original);
              setShowDeleteModal(true);
            }}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 mt-1">Manage courses and subject offerings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Course
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600">error</span>
            <div>
              <p className="text-sm font-medium text-red-800">Error loading courses</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={fetchCourses}
              className="ml-auto px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        filters={filterOptions}
        values={filters}
        onChange={() => {}}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <span className="material-symbols-outlined text-indigo-600">menu_book</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={courses}
        loading={loading}
        emptyMessage="No courses found"
        emptyIcon="menu_book"
        rowKey="id"
      />

      {/* Add Course Modal */}
      <FormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        onSubmit={handleAddCourse}
        title="Add New Course"
        submitLabel="Add Course"
        loading={actionLoading}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Mathematics 7"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.subject_code}
              onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., MATH7"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credits
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., 3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Course description..."
              rows={3}
            />
          </div>
        </div>
      </FormModal>

      {/* Edit Course Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCourse(null);
          resetForm();
        }}
        onSubmit={handleEditCourse}
        title="Edit Course"
        submitLabel="Save Changes"
        loading={actionLoading}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Mathematics 7"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.subject_code}
              onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., MATH7"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credits
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., 3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Course description..."
              rows={3}
            />
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedCourse(null);
        }}
        onConfirm={handleDeleteCourse}
        title="Delete Course"
        message={
          <div>
            <p>
              Are you sure you want to delete{" "}
              <span className="font-medium">{selectedCourse?.name}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. All associated sections and enrollments may be affected.
            </p>
          </div>
        }
        confirmText="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
