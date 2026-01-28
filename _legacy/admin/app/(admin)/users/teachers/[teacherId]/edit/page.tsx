"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Teacher {
  id: string;
  profile_id: string;
  employee_id: string;
  department: string | null;
  specialization: string | null;
  is_active: boolean;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
  };
}

interface CourseAssignment {
  id: string;
  course_id: string;
  section_id: string;
  is_primary: boolean;
  course?: {
    id: string;
    name: string;
    subject_code: string;
  };
  section?: {
    id: string;
    name: string;
    grade_level: string;
  };
}

interface Advisory {
  id: string;
  section_id: string;
  section?: {
    id: string;
    name: string;
    grade_level: string;
    student_count?: number;
  };
}

interface Section {
  id: string;
  name: string;
  grade_level: string;
  enrolled_count: number;
  has_adviser: boolean;
}

interface Course {
  id: string;
  name: string;
  subject_code: string;
}

export default function TeacherEditPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state for basic info
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    department: "",
    specialization: "",
    phone: "",
    isActive: true,
  });

  // Modal state
  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);
  const [showAssignAdviserModal, setShowAssignAdviserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [autoEnroll, setAutoEnroll] = useState(true);
  const [enrollmentPreview, setEnrollmentPreview] = useState<{
    studentCount: number;
    courseCount: number;
  } | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setTeacherId(p.teacherId));
  }, [params]);

  // Fetch teacher data
  const fetchTeacher = useCallback(async () => {
    if (!teacherId) return;
    try {
      const response = await fetch(`/api/admin/users/teachers/${teacherId}`);
      if (!response.ok) throw new Error("Failed to fetch teacher");
      const data = await response.json();
      setTeacher(data);
      setFormData({
        fullName: data.profiles?.full_name || "",
        email: data.profiles?.email || "",
        employeeId: data.employee_id || "",
        department: data.department || "",
        specialization: data.specialization || "",
        phone: data.profiles?.phone || "",
        isActive: data.is_active,
      });
    } catch (err) {
      setError("Failed to load teacher data");
      console.error(err);
    }
  }, [teacherId]);

  // Fetch assignments
  const fetchAssignments = useCallback(async () => {
    if (!teacherId) return;
    try {
      const response = await fetch(
        `/api/admin/users/teachers/${teacherId}/assignments`
      );
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
    }
  }, [teacherId]);

  // Fetch advisories
  const fetchAdvisories = useCallback(async () => {
    if (!teacherId) return;
    try {
      const response = await fetch(
        `/api/admin/users/teachers/${teacherId}/advisory`
      );
      if (response.ok) {
        const data = await response.json();
        setAdvisories(data);
      }
    } catch (err) {
      console.error("Failed to fetch advisories:", err);
    }
  }, [teacherId]);

  // Fetch sections and courses
  const fetchSectionsAndCourses = useCallback(async () => {
    try {
      const [sectionsRes, coursesRes] = await Promise.all([
        fetch("/api/admin/sections"),
        fetch("/api/admin/courses"),
      ]);
      if (sectionsRes.ok) {
        const data = await sectionsRes.json();
        setSections(data);
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data);
      }
    } catch (err) {
      console.error("Failed to fetch sections/courses:", err);
    }
  }, []);

  // Load all data
  useEffect(() => {
    if (!teacherId) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTeacher(),
        fetchAssignments(),
        fetchAdvisories(),
        fetchSectionsAndCourses(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [
    teacherId,
    fetchTeacher,
    fetchAssignments,
    fetchAdvisories,
    fetchSectionsAndCourses,
  ]);

  // Fetch enrollment preview when section is selected for adviser
  useEffect(() => {
    if (!teacherId || !selectedSection || !showAssignAdviserModal) {
      setEnrollmentPreview(null);
      return;
    }

    const fetchPreview = async () => {
      try {
        const response = await fetch(
          `/api/admin/users/teachers/${teacherId}/advisory?preview=${selectedSection}`
        );
        if (response.ok) {
          const data = await response.json();
          setEnrollmentPreview(data);
        }
      } catch (err) {
        console.error("Failed to fetch preview:", err);
      }
    };

    fetchPreview();
  }, [teacherId, selectedSection, showAssignAdviserModal]);

  // Save basic info
  const handleSaveBasicInfo = async () => {
    if (!teacherId) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/users/teachers/${teacherId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update teacher");
      }

      // Update status if changed
      if (teacher && teacher.is_active !== formData.isActive) {
        await fetch(`/api/admin/users/teachers/${teacherId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: formData.isActive }),
        });
      }

      setSuccessMessage("Teacher information updated successfully");
      await fetchTeacher();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update teacher");
    } finally {
      setSaving(false);
    }
  };

  // Assign course
  const handleAssignCourse = async () => {
    if (!teacherId || !selectedCourse || !selectedSection) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/users/teachers/${teacherId}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: selectedCourse,
            sectionId: selectedSection,
            isPrimary,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign course");
      }

      setSuccessMessage("Course assigned successfully");
      setShowAssignCourseModal(false);
      setSelectedCourse("");
      setSelectedSection("");
      setIsPrimary(true);
      await fetchAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign course");
    } finally {
      setSaving(false);
    }
  };

  // Remove course assignment
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!teacherId) return;
    if (!confirm("Are you sure you want to remove this course assignment?"))
      return;

    try {
      const response = await fetch(
        `/api/admin/users/teachers/${teacherId}/assignments?assignmentId=${assignmentId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove assignment");
      }

      setSuccessMessage("Course assignment removed");
      await fetchAssignments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove assignment"
      );
    }
  };

  // Assign adviser
  const handleAssignAdviser = async () => {
    if (!teacherId || !selectedSection) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/users/teachers/${teacherId}/advisory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: selectedSection,
            autoEnrollStudents: autoEnroll,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign as adviser");
      }

      const data = await response.json();
      const enrolledMsg =
        data.enrolledCount > 0 ? ` (${data.enrolledCount} students enrolled)` : "";
      setSuccessMessage(`Assigned as section adviser${enrolledMsg}`);
      setShowAssignAdviserModal(false);
      setSelectedSection("");
      setAutoEnroll(true);
      setEnrollmentPreview(null);
      await Promise.all([fetchAdvisories(), fetchSectionsAndCourses()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign as adviser"
      );
    } finally {
      setSaving(false);
    }
  };

  // Remove adviser
  const handleRemoveAdviser = async (adviserId: string) => {
    if (!teacherId) return;
    if (!confirm("Are you sure you want to remove this advisory assignment?"))
      return;

    try {
      const response = await fetch(
        `/api/admin/users/teachers/${teacherId}/advisory?adviserId=${adviserId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove adviser");
      }

      setSuccessMessage("Advisory assignment removed");
      await Promise.all([fetchAdvisories(), fetchSectionsAndCourses()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove adviser");
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!teacherId) return;
    setPasswordError(null);

    // Validation
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setSavingPassword(true);

    try {
      const response = await fetch(
        `/api/admin/users/teachers/${teacherId}/password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to change password");
      }

      setSuccessMessage("Password changed successfully");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setSavingPassword(false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Teacher not found</p>
        <Link href="/users/teachers" className="text-primary hover:underline mt-2 inline-block">
          Back to Teachers
        </Link>
      </div>
    );
  }

  const availableSectionsForAdviser = sections.filter((s) => !s.has_adviser);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/users/teachers/${teacherId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">
              arrow_back
            </span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Teacher</h1>
            <p className="text-gray-500 mt-1">
              Manage teacher information and assignments
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) =>
                  setFormData({ ...formData, employeeId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Select Department</option>
                <option value="mathematics">Mathematics</option>
                <option value="science">Science</option>
                <option value="english">English</option>
                <option value="filipino">Filipino</option>
                <option value="social_studies">Social Studies</option>
                <option value="mapeh">MAPEH</option>
                <option value="tle">TLE</option>
                <option value="values_education">Values Education</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) =>
                  setFormData({ ...formData, specialization: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g., Algebra, Physics, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active
              </label>
            </div>
            <button
              onClick={handleSaveBasicInfo}
              disabled={saving}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">lock_reset</span>
              Change Password
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject Assignments Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Subject Assignments
              </h2>
              <button
                onClick={() => setShowAssignCourseModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Assign Subject
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                  menu_book
                </span>
                No course assignments yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 font-medium text-gray-500">
                        Course
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">
                        Section
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">
                        Role
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="py-2 px-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {assignment.course?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {assignment.course?.subject_code}
                            </p>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          Grade {assignment.section?.grade_level} -{" "}
                          {assignment.section?.name}
                        </td>
                        <td className="py-2 px-3">
                          {assignment.is_primary ? (
                            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                              Primary
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              Assistant
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section Advisory Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Section Advisory
              </h2>
              <button
                onClick={() => setShowAssignAdviserModal(true)}
                disabled={availableSectionsForAdviser.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Assign as Adviser
              </button>
            </div>

            {advisories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                  groups
                </span>
                Not assigned as adviser to any section
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {advisories.map((advisory) => (
                  <div
                    key={advisory.id}
                    className="p-3 border border-gray-100 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">
                          groups
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {advisory.section?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Grade {advisory.section?.grade_level} -{" "}
                          {advisory.section?.student_count || 0} students
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAdviser(advisory.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Course Modal */}
      {showAssignCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Course
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.subject_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select a section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      Grade {section.grade_level} - {section.name} (
                      {section.enrolled_count} students)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="isPrimary" className="text-sm text-gray-700">
                  Primary Teacher
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignCourseModal(false);
                  setSelectedCourse("");
                  setSelectedSection("");
                  setIsPrimary(true);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCourse}
                disabled={!selectedCourse || !selectedSection || saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Adviser Modal */}
      {showAssignAdviserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign as Section Adviser
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select a section</option>
                  {availableSectionsForAdviser.map((section) => (
                    <option key={section.id} value={section.id}>
                      Grade {section.grade_level} - {section.name} (
                      {section.enrolled_count} students)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoEnroll"
                  checked={autoEnroll}
                  onChange={(e) => setAutoEnroll(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="autoEnroll" className="text-sm text-gray-700">
                  Auto-enroll all students in subjects I teach
                </label>
              </div>
              {selectedSection && enrollmentPreview && autoEnroll && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <p>
                    This will enroll {enrollmentPreview.studentCount} students in{" "}
                    {enrollmentPreview.courseCount} course(s) you teach in this
                    section.
                  </p>
                </div>
              )}
              {selectedSection &&
                enrollmentPreview &&
                autoEnroll &&
                enrollmentPreview.courseCount === 0 && (
                  <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                    <p>
                      You are not teaching any courses in this section yet.
                      Auto-enrollment will have no effect until you assign
                      courses first.
                    </p>
                  </div>
                )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignAdviserModal(false);
                  setSelectedSection("");
                  setAutoEnroll(true);
                  setEnrollmentPreview(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignAdviser}
                disabled={!selectedSection || saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Change Password
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Set a new password for {teacher?.profiles?.full_name || "this teacher"}.
            </p>
            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {passwordError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Confirm new password"
                />
              </div>
              <p className="text-xs text-gray-500">
                Password must be at least 8 characters long.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword || savingPassword}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {savingPassword ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
