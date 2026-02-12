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
  grade_level: string | null;
  is_active: boolean;
  school_id: string;
}

const GRADE_LEVELS = [
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
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: "",
    grade_level: "",
  });

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    subject_code: "",
    description: "",
    credits: "",
    grade_level: "",
  });

  const [bulkGrades, setBulkGrades] = useState<string[]>([]);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    skipped: number;
    message: string;
    skipped_subjects?: string[];
  } | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.grade_level) params.set("grade_level", filters.grade_level);

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
  }, [filters.search, filters.grade_level]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
  };

  const handleReset = () => {
    setFilters({ search: "", grade_level: "" });
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
          grade_level: formData.grade_level || null,
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
          grade_level: formData.grade_level || null,
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

  const handleBulkAddSubjects = async () => {
    if (bulkGrades.length === 0) {
      alert("Please select at least one grade level");
      return;
    }

    setActionLoading(true);
    setBulkResult(null);
    try {
      const response = await fetch("/api/admin/courses/bulk-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade_levels: bulkGrades }),
      });

      const data = await response.json();

      if (response.ok || response.status === 201) {
        setBulkResult(data);
        fetchCourses();
      } else {
        alert(data.error || "Failed to add subjects");
      }
    } catch (err) {
      console.error("Failed to bulk add subjects:", err);
      alert("Failed to add subjects. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleBulkGrade = (grade: string) => {
    setBulkGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const selectAllGrades = () => {
    setBulkGrades(["1", "2", "3", "4", "5", "6"]);
  };

  const openEditModal = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      name: course.name,
      subject_code: course.subject_code,
      description: course.description || "",
      credits: course.credits?.toString() || "",
      grade_level: course.grade_level || "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      subject_code: "",
      description: "",
      credits: "",
      grade_level: "",
    });
  };

  const filterOptions: FilterOption[] = [
    {
      key: "grade_level",
      label: "Grade Level",
      type: "select",
      options: [
        { value: "", label: "All Grades" },
        ...GRADE_LEVELS,
      ],
    },
  ];

  // Group courses by grade for summary
  const gradeGroups = courses.reduce<Record<string, number>>((acc, c) => {
    const key = c.grade_level || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

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
      header: "Subject Name",
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
      accessorKey: "grade_level",
      header: "Grade Level",
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.original.grade_level
            ? "bg-blue-100 text-blue-800"
            : "bg-gray-100 text-gray-500"
        }`}>
          {row.original.grade_level ? `Grade ${row.original.grade_level}` : "—"}
        </span>
      ),
    },
    {
      accessorKey: "credits",
      header: "Credits",
      cell: ({ row }) => (
        <span className="text-gray-600">
          {row.original.credits ?? "—"}
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
          <h1 className="text-2xl font-bold text-gray-900">Subjects / Courses</h1>
          <p className="text-gray-500 mt-1">Manage subjects and course offerings for all grade levels</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBulkGrades([]);
              setBulkResult(null);
              setShowBulkModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">library_add</span>
            Add Subjects (Grade 1-6)
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Subject
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600">error</span>
            <div>
              <p className="text-sm font-medium text-red-800">Error loading subjects</p>
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
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <span className="material-symbols-outlined text-indigo-600">menu_book</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
        </div>
        {Object.entries(gradeGroups)
          .sort(([a], [b]) => {
            if (a === "Unassigned") return 1;
            if (b === "Unassigned") return -1;
            return parseInt(a) - parseInt(b);
          })
          .slice(0, 4)
          .map(([grade, count]) => (
            <div key={grade} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="material-symbols-outlined text-blue-600">school</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {grade === "Unassigned" ? "Unassigned" : `Grade ${grade}`}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={courses}
        loading={loading}
        emptyMessage="No subjects found. Click 'Add Subjects (Grade 1-6)' to get started!"
        emptyIcon="menu_book"
        rowKey="id"
      />

      {/* Add Subject Modal */}
      <FormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        onSubmit={handleAddCourse}
        title="Add New Subject"
        submitLabel="Add Subject"
        loading={actionLoading}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Mathematics"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.subject_code}
                onChange={(e) => setFormData({ ...formData, subject_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., MATH1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                value={formData.grade_level}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select grade level</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
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
              placeholder="Subject description..."
              rows={3}
            />
          </div>
        </div>
      </FormModal>

      {/* Edit Subject Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCourse(null);
          resetForm();
        }}
        onSubmit={handleEditCourse}
        title="Edit Subject"
        submitLabel="Save Changes"
        loading={actionLoading}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Mathematics"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.subject_code}
                onChange={(e) => setFormData({ ...formData, subject_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., MATH1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                value={formData.grade_level}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select grade level</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
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
              placeholder="Subject description..."
              rows={3}
            />
          </div>
        </div>
      </FormModal>

      {/* Bulk Add Subjects Modal */}
      <FormModal
        isOpen={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setBulkGrades([]);
          setBulkResult(null);
        }}
        onSubmit={handleBulkAddSubjects}
        title="Add Standard Subjects for Grade 1-6"
        submitLabel={bulkResult ? "Done" : `Add Subjects for ${bulkGrades.length} Grade${bulkGrades.length !== 1 ? "s" : ""}`}
        loading={actionLoading}
        size="lg"
      >
        <div className="space-y-5">
          {!bulkResult ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Philippine DepEd K-12 Elementary Curriculum
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      This will create standard subjects for the selected grade levels following the DepEd K-12 curriculum:
                      Filipino, English, Mathematics, Science, Araling Panlipunan, MAPEH (Music, Arts, PE, Health),
                      ESP, and Mother Tongue (Grades 1-3) / TLE (Grades 4-6).
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Grade Levels <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={selectAllGrades}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Select All
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {["1", "2", "3", "4", "5", "6"].map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => toggleBulkGrade(grade)}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        bulkGrades.includes(grade)
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {bulkGrades.includes(grade) && (
                        <span className="absolute top-1.5 right-1.5 material-symbols-outlined text-indigo-500 text-base">
                          check_circle
                        </span>
                      )}
                      <span className="material-symbols-outlined text-2xl mb-1">school</span>
                      <span className="text-sm font-semibold">Grade {grade}</span>
                      <span className="text-xs text-gray-400 mt-0.5">
                        {parseInt(grade) <= 3 ? "11 subjects" : "11 subjects"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {bulkGrades.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{bulkGrades.length}</span> grade level{bulkGrades.length !== 1 ? "s" : ""} selected.
                    This will create approximately{" "}
                    <span className="font-medium">{bulkGrades.length * 11}</span> subjects.
                    Existing subjects with the same code will be skipped.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-lg p-4 ${bulkResult.created > 0 ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined mt-0.5 ${bulkResult.created > 0 ? "text-green-600" : "text-yellow-600"}`}>
                    {bulkResult.created > 0 ? "check_circle" : "info"}
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${bulkResult.created > 0 ? "text-green-800" : "text-yellow-800"}`}>
                      {bulkResult.message}
                    </p>
                    <div className="mt-2 flex gap-4 text-sm">
                      {bulkResult.created > 0 && (
                        <span className="text-green-700">
                          {bulkResult.created} created
                        </span>
                      )}
                      {bulkResult.skipped > 0 && (
                        <span className="text-yellow-700">
                          {bulkResult.skipped} skipped (already exist)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {bulkResult.skipped_subjects && bulkResult.skipped_subjects.length > 0 && (
                <details className="bg-gray-50 rounded-lg p-4">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    View skipped subjects ({bulkResult.skipped_subjects.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600 max-h-40 overflow-y-auto">
                    {bulkResult.skipped_subjects.map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">remove</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
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
        title="Delete Subject"
        message={
          <div>
            <p>
              Are you sure you want to delete{" "}
              <span className="font-medium">{selectedCourse?.name}</span>
              {selectedCourse?.grade_level && (
                <span className="text-gray-500"> (Grade {selectedCourse.grade_level})</span>
              )}
              ?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. All associated enrollments and assignments may be affected.
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
