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
  grade_level: string | null;
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
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [courseActionLoading, setCourseActionLoading] = useState(false);
  const [assignResult, setAssignResult] = useState<{
    created: number;
    skipped: number;
    message: string;
  } | null>(null);

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
    setSelectedCourseIds(new Set());
    setSelectedTeacherId("");
    setAssignResult(null);
    setShowAddCourseModal(true);

    try {
      // Fetch courses filtered by grade level if section has one
      const coursesParams = new URLSearchParams();
      if (section?.grade_level) {
        coursesParams.set("grade_level", section.grade_level);
      }

      const [coursesRes, teachersRes] = await Promise.all([
        fetch(`/api/admin/courses?${coursesParams}`),
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

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const selectAllCourses = () => {
    if (selectedCourseIds.size === courses.length) {
      setSelectedCourseIds(new Set());
    } else {
      setSelectedCourseIds(new Set(courses.map((c) => c.id)));
    }
  };

  const handleAddCourses = async () => {
    if (selectedCourseIds.size === 0) {
      alert("Please select at least one subject");
      return;
    }
    if (!selectedTeacherId) {
      alert("Please select a teacher");
      return;
    }

    setCourseActionLoading(true);
    setAssignResult(null);
    try {
      const assignments = Array.from(selectedCourseIds).map((courseId) => ({
        courseId,
        teacherProfileId: selectedTeacherId,
      }));

      const response = await fetch(`/api/admin/sections/${sectionId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });

      const data = await response.json();

      if (response.ok || response.status === 201) {
        setAssignResult(data);
        fetchSection();
        // Remove assigned courses from the available list
        setCourses((prev) => prev.filter((c) => !selectedCourseIds.has(c.id)));
        setSelectedCourseIds(new Set());
      } else {
        alert(data.error || "Failed to assign subjects");
      }
    } catch (err) {
      console.error("Failed to assign courses:", err);
      alert("Failed to assign subjects. Please try again.");
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
                  <p className="text-xs text-gray-500">Assigned Subjects</p>
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
                  Assigned Subjects ({section.assigned_courses.length})
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
                    <h3 className="text-lg font-semibold text-gray-900">Assigned Subjects</h3>
                    <button
                      onClick={openAddCourseModal}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      Add Subjects
                    </button>
                  </div>

                  {section.assigned_courses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <span className="material-symbols-outlined text-4xl text-gray-300">menu_book</span>
                      <p className="mt-2">No subjects assigned yet</p>
                      <p className="text-sm">Click &quot;Add Subjects&quot; to assign subjects to this section</p>
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

      {/* Add Subjects Modal - Multi-select */}
      <FormModal
        isOpen={showAddCourseModal}
        onClose={() => {
          setShowAddCourseModal(false);
          setAssignResult(null);
        }}
        onSubmit={handleAddCourses}
        title={`Add Subjects to ${section.name}`}
        submitLabel={
          assignResult
            ? "Done"
            : `Assign ${selectedCourseIds.size} Subject${selectedCourseIds.size !== 1 ? "s" : ""}`
        }
        loading={courseActionLoading}
        size="lg"
      >
        <div className="space-y-4">
          {assignResult ? (
            <div className={`rounded-lg p-4 ${assignResult.created > 0 ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined mt-0.5 ${assignResult.created > 0 ? "text-green-600" : "text-yellow-600"}`}>
                  {assignResult.created > 0 ? "check_circle" : "info"}
                </span>
                <div>
                  <p className={`text-sm font-medium ${assignResult.created > 0 ? "text-green-800" : "text-yellow-800"}`}>
                    {assignResult.message}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Teacher Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Teacher <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">Select a teacher for all subjects</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  All selected subjects will be assigned to this teacher. You can change individual teachers later.
                </p>
              </div>

              {/* Subject Multi-select */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Subjects <span className="text-red-500">*</span>
                    {section.grade_level && (
                      <span className="ml-2 text-xs font-normal text-blue-600">
                        (Showing Grade {section.grade_level} subjects)
                      </span>
                    )}
                  </label>
                  {courses.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllCourses}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      {selectedCourseIds.size === courses.length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {courses.length === 0 ? (
                  <div className="text-center py-6 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="material-symbols-outlined text-3xl text-gray-300">check_circle</span>
                    <p className="text-sm text-gray-500 mt-2">
                      All available subjects are already assigned to this section.
                    </p>
                  </div>
                ) : (
                  <>
                    {selectedCourseIds.size > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500">
                          {selectedCourseIds.size} of {courses.length} selected
                        </span>
                      </div>
                    )}
                    <div className="max-h-[320px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {courses.map((course) => (
                        <label
                          key={course.id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            selectedCourseIds.has(course.id)
                              ? "bg-indigo-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCourseIds.has(course.id)}
                            onChange={() => toggleCourse(course.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {course.subject_code}
                              </span>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {course.name}
                              </p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
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
        title="Remove Subject Assignment"
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
                  No subjects are assigned to this section yet. Please assign subjects first before enrolling students.
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
                <span className="font-medium">{section.assigned_courses.length}</span> subject{section.assigned_courses.length !== 1 ? "s" : ""},{" "}
                creating up to <span className="font-medium">{selectedStudentIds.size * section.assigned_courses.length}</span> enrollment records.
              </p>
            </div>
          )}
        </div>
      </FormModal>
    </div>
  );
}
