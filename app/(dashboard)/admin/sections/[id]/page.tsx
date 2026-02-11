"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FormModal } from "@/components/admin/ui/FormModal";
import ConfirmModal from "@/components/admin/ui/ConfirmModal";

interface CourseAssignment {
  assignment_id: string;
  course_id: string;
  teacher_profile_id: string;
  course_name: string;
  subject_code: string;
  teacher_name: string;
}

interface SectionStudent {
  id: string;
  profile_id: string;
  lrn: string;
  grade_level: string;
  full_name: string;
}

interface SectionDetail {
  id: string;
  name: string;
  grade_level: string;
  capacity: number | null;
  school_id: string;
  adviser_name: string | null;
  assigned_courses: CourseAssignment[];
  students: SectionStudent[];
}

interface CourseOption {
  id: string;
  name: string;
  subject_code: string;
}

interface TeacherOption {
  id: string;
  full_name: string;
}

interface StudentOption {
  id: string;
  full_name: string;
  lrn: string;
  grade_level: string;
}

export default function SectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.id as string;

  const [section, setSection] = useState<SectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"courses" | "students">("courses");

  // Add Course modal state
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [courseForm, setCourseForm] = useState({ courseId: "", teacherProfileId: "" });
  const [courseActionLoading, setCourseActionLoading] = useState(false);

  // Remove Course modal state
  const [showRemoveCourseModal, setShowRemoveCourseModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<CourseAssignment | null>(null);

  // Enroll Students modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollResult, setEnrollResult] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(false);

  const fetchSection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/sections/${sectionId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch section");
      }
      const data = await response.json();
      setSection(data);
    } catch (err) {
      console.error("Failed to fetch section:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch section");
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchSection();
  }, [fetchSection]);

  // Fetch courses and teachers for the Add Course modal
  const openAddCourseModal = async () => {
    setCourseForm({ courseId: "", teacherProfileId: "" });
    setShowAddCourseModal(true);

    try {
      const [coursesRes, teachersRes] = await Promise.all([
        fetch("/api/admin/courses"),
        fetch("/api/admin/users/teachers?status=active&pageSize=100"),
      ]);

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        // Filter out courses already assigned to this section
        const assignedCourseIds = new Set(
          (section?.assigned_courses || []).map((a) => a.course_id)
        );
        const filtered = (coursesData as CourseOption[]).filter(
          (c) => !assignedCourseIds.has(c.id)
        );
        setCourses(filtered);
      }

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(
          (teachersData.data || []).map((t: { id: string; full_name?: string }) => ({
            id: t.id,
            full_name: t.full_name || "Unknown",
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load courses/teachers:", err);
    }
  };

  const handleAddCourse = async () => {
    if (!courseForm.courseId || !courseForm.teacherProfileId) {
      alert("Please select both a course and a teacher");
      return;
    }

    setCourseActionLoading(true);
    try {
      const response = await fetch(`/api/admin/sections/${sectionId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseForm.courseId,
          teacherProfileId: courseForm.teacherProfileId,
        }),
      });

      if (response.ok) {
        setShowAddCourseModal(false);
        fetchSection();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to assign course");
      }
    } catch (err) {
      console.error("Failed to assign course:", err);
      alert("Failed to assign course. Please try again.");
    } finally {
      setCourseActionLoading(false);
    }
  };

  const handleRemoveCourse = async () => {
    if (!selectedAssignment) return;

    setCourseActionLoading(true);
    try {
      const response = await fetch(
        `/api/admin/sections/${sectionId}/courses?assignmentId=${selectedAssignment.assignment_id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setShowRemoveCourseModal(false);
        setSelectedAssignment(null);
        fetchSection();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to remove course assignment");
      }
    } catch (err) {
      console.error("Failed to remove course:", err);
      alert("Failed to remove course. Please try again.");
    } finally {
      setCourseActionLoading(false);
    }
  };

  // Fetch available students for enrollment
  const openEnrollModal = async () => {
    setSelectedStudentIds(new Set());
    setEnrollResult(null);
    setStudentSearch("");
    setShowEnrollModal(true);
    await fetchAvailableStudents("");
  };

  const fetchAvailableStudents = async (search: string) => {
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (search) params.set("search", search);

      const response = await fetch(`/api/admin/users/students?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Filter: match section's grade level, exclude already enrolled students
        const enrolledIds = new Set((section?.students || []).map((s) => s.id));
        const filtered = (data.data || []).filter(
          (s: StudentOption & { grade_level: string }) =>
            !enrolledIds.has(s.id) &&
            (!section?.grade_level || s.grade_level === section.grade_level)
        );
        setAvailableStudents(
          filtered.map((s: { id: string; full_name?: string; lrn?: string; grade_level?: string }) => ({
            id: s.id,
            full_name: s.full_name || "Unknown",
            lrn: s.lrn || "",
            grade_level: s.grade_level || "",
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setStudentsLoading(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleAllStudents = () => {
    if (selectedStudentIds.size === availableStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(availableStudents.map((s) => s.id)));
    }
  };

  const handleEnrollStudents = async () => {
    if (selectedStudentIds.size === 0) {
      alert("Please select at least one student");
      return;
    }

    setEnrollLoading(true);
    setEnrollResult(null);
    try {
      const response = await fetch(`/api/admin/sections/${sectionId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selectedStudentIds) }),
      });

      const data = await response.json();

      if (response.ok) {
        setEnrollResult(data.summary || "Students enrolled successfully");
        fetchSection();
        // Reset selection after success
        setSelectedStudentIds(new Set());
        setAvailableStudents((prev) =>
          prev.filter((s) => !selectedStudentIds.has(s.id))
        );
      } else {
        alert(data.error || "Failed to enroll students");
      }
    } catch (err) {
      console.error("Failed to enroll students:", err);
      alert("Failed to enroll students. Please try again.");
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Loading section details...
        </div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-red-600 text-4xl">error</span>
          <p className="mt-2 text-red-800 font-medium">{error || "Section not found"}</p>
          <button
            onClick={() => router.push("/admin/sections")}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Back to Sections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/sections" className="hover:text-indigo-600 transition-colors">
          Sections
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{section.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900">{section.name}</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-400 text-xl">school</span>
                <div>
                  <p className="text-xs text-gray-500">Grade Level</p>
                  <p className="text-sm font-medium text-gray-900">Grade {section.grade_level}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-400 text-xl">group</span>
                <div>
                  <p className="text-xs text-gray-500">Students</p>
                  <p className="text-sm font-medium text-gray-900">
                    {section.students.length}{section.capacity ? ` / ${section.capacity}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-400 text-xl">person</span>
                <div>
                  <p className="text-xs text-gray-500">Adviser</p>
                  <p className="text-sm font-medium text-gray-900">
                    {section.adviser_name || "Not assigned"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-gray-400 text-xl">menu_book</span>
                <div>
                  <p className="text-xs text-gray-500">Assigned Courses</p>
                  <p className="text-sm font-medium text-gray-900">
                    {section.assigned_courses.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Tabbed Content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("courses")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "courses"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Assigned Courses ({section.assigned_courses.length})
                </button>
                <button
                  onClick={() => setActiveTab("students")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "students"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Students ({section.students.length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Courses Tab */}
              {activeTab === "courses" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Assigned Courses</h3>
                    <button
                      onClick={openAddCourseModal}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      Add Subject
                    </button>
                  </div>

                  {section.assigned_courses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <span className="material-symbols-outlined text-4xl text-gray-300">menu_book</span>
                      <p className="mt-2">No courses assigned yet</p>
                      <p className="text-sm">Click &quot;Add Subject&quot; to assign courses to this section</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {section.assigned_courses.map((assignment) => (
                        <div
                          key={assignment.assignment_id}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <span className="material-symbols-outlined text-blue-600 text-lg">menu_book</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {assignment.course_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {assignment.subject_code} &middot; {assignment.teacher_name}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowRemoveCourseModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Students Tab */}
              {activeTab === "students" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Students</h3>
                    <button
                      onClick={openEnrollModal}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">person_add</span>
                      Enroll Students
                    </button>
                  </div>

                  {section.students.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <span className="material-symbols-outlined text-4xl text-gray-300">school</span>
                      <p className="mt-2">No students enrolled yet</p>
                      <p className="text-sm">Click &quot;Enroll Students&quot; to add students to this section</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {section.students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {student.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {student.full_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                LRN: {student.lrn || "—"} &middot; Grade {student.grade_level}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Course Modal */}
      <FormModal
        isOpen={showAddCourseModal}
        onClose={() => setShowAddCourseModal(false)}
        onSubmit={handleAddCourse}
        title="Add Subject to Section"
        submitLabel="Assign"
        loading={courseActionLoading}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={courseForm.courseId}
              onChange={(e) => setCourseForm({ ...courseForm, courseId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.subject_code} — {c.name}
                </option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                All courses have already been assigned to this section.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teacher <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={courseForm.teacherProfileId}
              onChange={(e) => setCourseForm({ ...courseForm, teacherProfileId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="">Select a teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormModal>

      {/* Remove Course Confirmation */}
      <ConfirmModal
        isOpen={showRemoveCourseModal}
        onClose={() => {
          setShowRemoveCourseModal(false);
          setSelectedAssignment(null);
        }}
        onConfirm={handleRemoveCourse}
        title="Remove Course Assignment"
        message={
          <p>
            Are you sure you want to remove{" "}
            <span className="font-medium">{selectedAssignment?.course_name}</span> from
            this section?
          </p>
        }
        confirmText="Remove"
        variant="danger"
        loading={courseActionLoading}
      />

      {/* Enroll Students Modal */}
      <FormModal
        isOpen={showEnrollModal}
        onClose={() => {
          setShowEnrollModal(false);
          setEnrollResult(null);
        }}
        onSubmit={handleEnrollStudents}
        title="Enroll Students"
        submitLabel={`Enroll ${selectedStudentIds.size} Student${selectedStudentIds.size !== 1 ? "s" : ""}`}
        loading={enrollLoading}
        size="lg"
      >
        <div className="space-y-4">
          {enrollResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                <p className="text-sm text-green-800">{enrollResult}</p>
              </div>
            </div>
          )}

          {section.assigned_courses.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-600 text-lg">warning</span>
                <p className="text-sm text-yellow-800">
                  No courses are assigned to this section yet. Please assign courses first before enrolling students.
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search students by name or LRN..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchAvailableStudents(studentSearch);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => fetchAvailableStudents(studentSearch)}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Search
              </button>
            </div>

            {availableStudents.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.size === availableStudents.length && availableStudents.length > 0}
                    onChange={toggleAllStudents}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Select all ({availableStudents.length})
                </label>
                <span className="text-xs text-gray-500">
                  {selectedStudentIds.size} selected
                </span>
              </div>
            )}

            <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {studentsLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading students...
                </div>
              ) : availableStudents.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No eligible students found for Grade {section.grade_level}
                </div>
              ) : (
                availableStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.full_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        LRN: {student.lrn || "—"} &middot; Grade {student.grade_level}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {selectedStudentIds.size > 0 && section.assigned_courses.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                This will enroll <span className="font-medium">{selectedStudentIds.size}</span> student{selectedStudentIds.size !== 1 ? "s" : ""} into{" "}
                <span className="font-medium">{section.assigned_courses.length}</span> course{section.assigned_courses.length !== 1 ? "s" : ""},{" "}
                creating up to <span className="font-medium">{selectedStudentIds.size * section.assigned_courses.length}</span> enrollment records.
              </p>
            </div>
          )}
        </div>
      </FormModal>
    </div>
  );
}
