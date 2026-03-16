"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/admin/ui/DataTable";
import FilterBar from "@/components/admin/ui/FilterBar";
import type { FilterOption } from "@/components/admin/ui/FilterBar";
import ConfirmModal from "@/components/admin/ui/ConfirmModal";
import { FormModal } from "@/components/admin/ui/FormModal";

interface Section {
  id: string;
  name: string;
  grade_level: string;
  capacity: number | null;
  school_id: string;
  enrolled_count: number;
  adviser_name: string | null;
  course_count: number;
}

const GRADE_LEVELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

interface SectionFormData {
  name: string;
  grade_level: string;
  capacity: string;
}

function SectionFormFields({
  formData,
  setFormData,
}: {
  formData: SectionFormData;
  setFormData: (data: SectionFormData) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Section Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="e.g., Section A"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Grade Level <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={formData.grade_level}
          onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          <option value="">Select Grade Level</option>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Capacity
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="e.g., 40"
        />
      </div>
    </div>
  );
}

export default function SectionsPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: "",
    gradeLevel: "",
  });

  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    grade_level: "",
    capacity: "",
  });

  const fetchSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.gradeLevel) params.set("gradeLevel", filters.gradeLevel);

      const response = await authFetch(`/api/admin/sections?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch sections");
      }
      const data = await response.json();
      setSections(data);
    } catch (err) {
      console.error("Failed to fetch sections:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch sections");
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.gradeLevel]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({ search: "", gradeLevel: "" });
  };

  const handleAddSection = async () => {
    if (!formData.name || !formData.grade_level) {
      alert("Please fill in all required fields");
      return;
    }

    setActionLoading(true);
    try {
      const response = await authFetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          grade_level: formData.grade_level,
          capacity: formData.capacity || null,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        resetForm();
        fetchSections();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add section");
      }
    } catch (err) {
      console.error("Failed to add section:", err);
      alert("Failed to add section. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSection = async () => {
    if (!selectedSection || !formData.name || !formData.grade_level) {
      alert("Please fill in all required fields");
      return;
    }

    setActionLoading(true);
    try {
      const response = await authFetch(`/api/admin/sections/${selectedSection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          grade_level: formData.grade_level,
          capacity: formData.capacity || null,
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedSection(null);
        resetForm();
        fetchSections();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update section");
      }
    } catch (err) {
      console.error("Failed to update section:", err);
      alert("Failed to update section. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedSection) return;

    setActionLoading(true);
    try {
      const response = await authFetch(`/api/admin/sections/${selectedSection.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedSection(null);
        fetchSections();
      } else {
        setShowDeleteModal(false);
        setSelectedSection(null);
        alert(data.error || "Failed to delete section.");
      }
    } catch (err) {
      console.error("Failed to delete section:", err);
      alert("Failed to delete section. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (section: Section) => {
    setSelectedSection(section);
    setFormData({
      name: section.name,
      grade_level: section.grade_level,
      capacity: section.capacity?.toString() || "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      grade_level: "",
      capacity: "",
    });
  };

  const totalStudents = sections.reduce((sum, s) => sum + s.enrolled_count, 0);
  const atCapacity = sections.filter(
    (s) => s.capacity && s.enrolled_count >= s.capacity
  ).length;

  const filterOptions: FilterOption[] = [
    {
      key: "gradeLevel",
      label: "Grade Level",
      type: "select",
      placeholder: "All Grades",
      options: GRADE_LEVELS.map((g) => ({ value: g, label: `Grade ${g}` })),
    },
  ];

  const columns: ColumnDef<Section>[] = [
    {
      accessorKey: "name",
      header: "Section Name",
      cell: ({ row }) => (
        <Link
          href={`/admin/sections/${row.original.id}`}
          className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "grade_level",
      header: "Grade Level",
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Grade {row.original.grade_level}
        </span>
      ),
    },
    {
      id: "capacity",
      header: "Capacity",
      cell: ({ row }) => {
        const s = row.original;
        const isFull = s.capacity && s.enrolled_count >= s.capacity;
        return (
          <span className={isFull ? "text-red-600 font-medium" : "text-gray-600"}>
            {s.enrolled_count}/{s.capacity || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "adviser_name",
      header: "Adviser",
      cell: ({ row }) => (
        <span className="text-gray-600">
          {row.original.adviser_name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "course_count",
      header: "Courses",
      cell: ({ row }) => (
        <span className="text-gray-600">{row.original.course_count}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/sections/${row.original.id}`}
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
              setSelectedSection(row.original);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sections</h1>
          <p className="text-sm text-gray-500 mt-1">Manage class sections and student groups</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span className="hidden sm:inline">Add Section</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600">error</span>
            <div>
              <p className="text-sm font-medium text-red-800">Error loading sections</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button
              onClick={fetchSections}
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
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <span className="material-symbols-outlined text-indigo-600">groups</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sections</p>
              <p className="text-2xl font-bold text-gray-900">{sections.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="material-symbols-outlined text-green-600">school</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="material-symbols-outlined text-red-600">warning</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">At Capacity</p>
              <p className="text-2xl font-bold text-gray-900">{atCapacity}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={sections}
        loading={loading}
        emptyMessage="No sections found"
        emptyIcon="groups"
        rowKey="id"
      />

      {/* Add Section Modal */}
      <FormModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        onSubmit={handleAddSection}
        title="Add New Section"
        submitLabel="Add Section"
        loading={actionLoading}
        size="md"
      >
        <SectionFormFields formData={formData} setFormData={setFormData} />
      </FormModal>

      {/* Edit Section Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedSection(null); resetForm(); }}
        onSubmit={handleEditSection}
        title="Edit Section"
        submitLabel="Save Changes"
        loading={actionLoading}
        size="md"
      >
        <SectionFormFields formData={formData} setFormData={setFormData} />
      </FormModal>

      {/* Delete Modal — blocked if section has dependencies, safe otherwise */}
      {selectedSection && (selectedSection.enrolled_count > 0 || selectedSection.course_count > 0) ? (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setSelectedSection(null); }}
          onConfirm={() => { setShowDeleteModal(false); router.push(`/admin/sections/${selectedSection.id}`); }}
          title="Cannot Delete Section"
          variant="warning"
          confirmText="Open Section Details"
          cancelText="Close"
          message={
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{selectedSection.name}</span> cannot be deleted because it still has active associations. Complete the following steps first:
              </p>
              <ol className="space-y-2 text-sm">
                {selectedSection.enrolled_count > 0 && (
                  <li className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                    <span>
                      <span className="font-medium">Reassign {selectedSection.enrolled_count} student(s)</span> to another section.{" "}
                      <span className="text-gray-500">Go to Section Details → Students tab → reassign each student to a different section.</span>
                    </span>
                  </li>
                )}
                {selectedSection.course_count > 0 && (
                  <li className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center mt-0.5">
                      {selectedSection.enrolled_count > 0 ? "2" : "1"}
                    </span>
                    <span>
                      <span className="font-medium">Remove {selectedSection.course_count} course assignment(s)</span> from this section.{" "}
                      <span className="text-gray-500">Go to Section Details → Courses tab → remove each teacher–course assignment.</span>
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs font-bold flex items-center justify-center mt-0.5">
                    {(selectedSection.enrolled_count > 0 ? 1 : 0) + (selectedSection.course_count > 0 ? 1 : 0) + 1}
                  </span>
                  <span>Once the section is empty, <span className="font-medium">delete it</span>.</span>
                </li>
              </ol>
            </div>
          }
        />
      ) : (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setSelectedSection(null); }}
          onConfirm={handleDeleteSection}
          title="Delete Section"
          message={
            <div>
              <p>
                Are you sure you want to delete{" "}
                <span className="font-medium">{selectedSection?.name}</span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
          }
          confirmText="Delete"
          variant="danger"
          loading={actionLoading}
        />
      )}
    </div>
  );
}
