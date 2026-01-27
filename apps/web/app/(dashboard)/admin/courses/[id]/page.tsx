"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

interface Section {
  id: string;
  name: string;
  grade_level: string;
  capacity: number;
  school_year?: string;
  enrolled_count: number;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    subject_code: "",
    description: "",
    credits: "",
  });

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/courses?search=`);
      if (!response.ok) {
        throw new Error("Failed to fetch course");
      }
      const courses = await response.json();
      const foundCourse = courses.find((c: Course) => c.id === courseId);
      if (!foundCourse) {
        throw new Error("Course not found");
      }
      setCourse(foundCourse);
      setFormData({
        name: foundCourse.name,
        subject_code: foundCourse.subject_code,
        description: foundCourse.description || "",
        credits: foundCourse.credits?.toString() || "",
      });
    } catch (err) {
      console.error("Failed to fetch course:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch course");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const fetchSections = useCallback(async () => {
    setSectionsLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/sections`);
      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (err) {
      console.error("Failed to fetch sections:", err);
    } finally {
      setSectionsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
    fetchSections();
  }, [fetchCourse, fetchSections]);

  const handleEditCourse = async () => {
    if (!course || !formData.name || !formData.subject_code) {
      alert("Please fill in all required fields");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
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
        fetchCourse();
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
    if (!course) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/admin/courses");
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-red-400 mb-3 block">error</span>
          <p className="text-lg font-medium text-red-800 mb-2">Course Not Found</p>
          <p className="text-sm text-red-600 mb-4">{error || "The requested course could not be found."}</p>
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/courses"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
            <p className="text-gray-500 mt-1">Course details and assigned sections</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            Edit
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Course Info */}
        <div className="space-y-6">
          {/* Course Details Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-indigo-600">menu_book</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{course.name}</h2>
                <p className="text-gray-500 font-mono">{course.subject_code}</p>
              </div>
            </div>

            <div className="space-y-4">
              <InfoRow label="Subject Code" value={course.subject_code} />
              <InfoRow label="Credits" value={course.credits?.toString() || "Not specified"} />
              <InfoRow
                label="Description"
                value={course.description || "No description provided"}
                multiline
              />
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">{sections.length}</p>
                <p className="text-xs text-indigo-600">Sections</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {sections.reduce((sum, s) => sum + s.enrolled_count, 0)}
                </p>
                <p className="text-xs text-green-600">Students</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sections List */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assigned Sections</h3>
              <Link
                href="/admin/sections"
                className="text-sm text-indigo-600 hover:underline"
              >
                Manage Sections
              </Link>
            </div>

            {sectionsLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading sections...</p>
              </div>
            ) : sections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                  groups
                </span>
                No sections assigned to this course
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sections.map((section) => (
                  <div key={section.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-600">groups</span>
                      </div>
                      <div>
                        <Link
                          href={`/admin/sections/${section.id}`}
                          className="font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {section.name}
                        </Link>
                        <p className="text-sm text-gray-500">Grade {section.grade_level}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {section.enrolled_count}/{section.capacity}
                      </p>
                      <p className="text-xs text-gray-500">students</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
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
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteCourse}
        title="Delete Course"
        message={
          <div>
            <p>
              Are you sure you want to delete{" "}
              <span className="font-medium">{course.name}</span>?
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

function InfoRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div className={multiline ? "py-2" : "flex items-center justify-between py-2 border-b border-gray-50 last:border-0"}>
      <span className="text-sm text-gray-500">{label}</span>
      {multiline ? (
        <p className="text-sm text-gray-900 mt-1">{value}</p>
      ) : (
        <span className="text-sm font-medium text-gray-900">{value}</span>
      )}
    </div>
  );
}
