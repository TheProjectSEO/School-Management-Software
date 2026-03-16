"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TeacherEditPageProps {
  params: Promise<{ teacherId: string }>;
}

interface TeacherData {
  id: string;
  profile_id: string;
  employee_id?: string;
  department?: string;
  specialization?: string;
  is_active: boolean;
  full_name: string;
  phone?: string;
  email?: string;
  hire_date?: string;
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

export default function TeacherEditPage({ params }: TeacherEditPageProps) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pendingNewEmail, setPendingNewEmail] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  const [formData, setFormData] = useState<TeacherData>({
    id: "",
    profile_id: "",
    employee_id: "",
    department: "",
    specialization: "",
    is_active: true,
    full_name: "",
    phone: "",
    email: "",
    hire_date: "",
  });

  // Assignment states
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Modal states
  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);
  const [showAssignAdviserModal, setShowAssignAdviserModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [autoEnroll, setAutoEnroll] = useState(true);
  const [enrollmentPreview, setEnrollmentPreview] = useState<{
    studentCount: number;
    courseCount: number;
  } | null>(null);

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setTeacherId(resolvedParams.teacherId);
    }
    loadParams();
  }, [params]);

  // Fetch teacher data
  const fetchTeacher = useCallback(async () => {
    if (!teacherId) return;
    try {
      const response = await authFetch(`/api/admin/users/teachers/${teacherId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch teacher");
      }
      const data = await response.json();
      const teacherEmail = data.email || data.profile?.email || "";
      setFormData({
        id: data.id,
        profile_id: data.profile_id,
        employee_id: data.employee_id || "",
        department: data.department || "",
        specialization: data.specialization || "",
        is_active: data.is_active,
        full_name: data.full_name || "",
        phone: data.phone || "",
        email: teacherEmail,
        hire_date: data.hire_date || "",
      });
      setOriginalEmail(teacherEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teacher");
    }
  }, [teacherId]);

  // Fetch assignments
  const fetchAssignments = useCallback(async () => {
    if (!teacherId) return;
    try {
      const response = await authFetch(`/api/admin/users/teachers/${teacherId}/assignments`);
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
      const response = await authFetch(`/api/admin/users/teachers/${teacherId}/advisory`);
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
        authFetch("/api/admin/sections"),
        authFetch("/api/admin/courses"),
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
  }, [teacherId, fetchTeacher, fetchAssignments, fetchAdvisories, fetchSectionsAndCourses]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveTeacherData();
  };

  const saveTeacherData = async (includeEmail = false, password = "") => {
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        department: formData.department,
        specialization: formData.specialization,
        fullName: formData.full_name,
        phone: formData.phone,
        isActive: formData.is_active,
      };

      // Add hire_date if provided
      if (formData.hire_date) {
        payload.hireDate = formData.hire_date;
      }

      // Include email and admin password if email is being changed (from modal)
      if (includeEmail && pendingNewEmail) {
        payload.email = pendingNewEmail;
        payload.adminPassword = password;
      }

      const response = await authFetch(`/api/admin/users/teachers/${teacherId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.code === "INVALID_PASSWORD") {
          throw new Error("Invalid admin password. Please try again.");
        }
        throw new Error(data.error || "Failed to update teacher");
      }

      setSuccessMessage("Teacher information updated successfully");
      setShowEmailChangeModal(false);
      setAdminPassword("");
      setPendingNewEmail("");
      await fetchTeacher();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChangeConfirm = async () => {
    if (!adminPassword) {
      setError("Please enter your admin password");
      return;
    }
    await saveTeacherData(true, adminPassword);
  };

  const handleResetPassword = async () => {
    setShowConfirmModal(false);
    setResettingPassword(true);
    setError(null);

    try {
      const response = await authFetch(`/api/admin/users/teachers/${teacherId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPassword || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "NO_AUTH_ACCOUNT") {
          setShowCreateAccountModal(true);
          setResettingPassword(false);
          return;
        }
        throw new Error(data.error || "Failed to reset password");
      }

      setGeneratedPassword(data.temporaryPassword);
      setNewPassword("");
      setAccountCreated(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCreateAuthAccount = async () => {
    if (!newEmail) {
      setError("Please enter an email address");
      return;
    }

    setResettingPassword(true);
    setError(null);

    try {
      const response = await authFetch(`/api/admin/users/teachers/${teacherId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: newPassword || undefined,
          email: newEmail,
          createAccount: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create auth account");
      }

      setGeneratedPassword(data.temporaryPassword);
      setNewPassword("");
      setNewEmail("");
      setShowCreateAccountModal(false);
      setAccountCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create auth account");
    } finally {
      setResettingPassword(false);
    }
  };

  // Assign course
  const handleAssignCourse = async () => {
    if (!teacherId || !selectedCourse || !selectedSection) return;
    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/api/admin/users/teachers/${teacherId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse,
          sectionId: selectedSection,
          isPrimary,
        }),
      });

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
    if (!confirm("Are you sure you want to remove this course assignment?")) return;

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
      setError(err instanceof Error ? err.message : "Failed to remove assignment");
    }
  };

  // Assign adviser
  const handleAssignAdviser = async () => {
    if (!teacherId || !selectedSection) return;
    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/api/admin/users/teachers/${teacherId}/advisory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: selectedSection,
          autoEnrollStudents: autoEnroll,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign as adviser");
      }

      const data = await response.json();
      const enrolledMsg = data.enrolledCount > 0 ? ` (${data.enrolledCount} students enrolled)` : "";
      setSuccessMessage(`Assigned as section adviser${enrolledMsg}`);
      setShowAssignAdviserModal(false);
      setSelectedSection("");
      setAutoEnroll(true);
      setEnrollmentPreview(null);
      await Promise.all([fetchAdvisories(), fetchSectionsAndCourses()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign as adviser");
    } finally {
      setSaving(false);
    }
  };

  // Remove adviser
  const handleRemoveAdviser = async (adviserId: string) => {
    if (!teacherId) return;
    if (!confirm("Are you sure you want to remove this advisory assignment?")) return;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Deduplicate sections by id (guards against duplicate rows returned from the API)
  const uniqueSections = sections.filter(
    (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
  );

  // If a section name already starts with "Grade", don't add a second grade prefix
  const formatSectionLabel = (name: string, grade_level: string, enrolled_count: number) => {
    const hasGradePrefix = /^grade\s/i.test(name.trim());
    const label = hasGradePrefix ? name : `Grade ${grade_level} - ${name}`;
    return `${label} (${enrolled_count} students)`;
  };

  const availableSectionsForAdviser = uniqueSections.filter((s) => !s.has_adviser);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/users/teachers/${teacherId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-500">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Teacher</h1>
          <p className="text-gray-500 mt-1">Manage teacher information and assignments</p>
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
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          {/* Basic Info Form */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                    <span className="material-symbols-outlined text-gray-400 text-lg">mail</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {originalEmail || <span className="text-gray-400 italic">No email set</span>}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingNewEmail(originalEmail);
                      setAdminPassword("");
                      setShowEmailChangeModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    Edit
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Email is used for login authentication</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.employee_id}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-generated and cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+63 XXX XXX XXXX"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select Department</option>
                  <option value="mathematics">Mathematics</option>
                  <option value="science">Science</option>
                  <option value="english">English</option>
                  <option value="filipino">Filipino</option>
                  <option value="social_studies">Social Studies</option>
                  <option value="mapeh">MAPEH</option>
                  <option value="tle">TLE</option>
                  <option value="values">Values Education</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g., Algebra, Physics"
                />
              </div>

              <div className="space-y-3 pt-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Active Teacher</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {saving && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Save Changes
              </button>
            </form>
          </div>

          {/* Password Reset Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Password Management</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Reset the teacher&apos;s password or create a login account.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password (optional)
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={resettingPassword}
                className="w-full px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resettingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">lock_reset</span>
                    Reset Password
                  </>
                )}
              </button>

              {generatedPassword && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    {accountCreated ? "Auth Account Created" : "Password Reset Successfully"}
                  </p>
                  <p className="text-sm text-green-700 mt-1">New password:</p>
                  <code className="block mt-2 px-3 py-2 bg-white border border-green-200 rounded font-mono text-sm">
                    {generatedPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword);
                      setSuccessMessage("Password copied to clipboard!");
                    }}
                    className="mt-2 text-sm text-green-700 hover:text-green-800 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    Copy password
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Assignments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject Assignments Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Subject Assignments</h2>
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
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Course</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Section</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Role</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="py-2 px-3">
                          <div>
                            <p className="font-medium text-gray-900">{assignment.course?.name}</p>
                            <p className="text-xs text-gray-500">{assignment.course?.subject_code}</p>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {assignment.section && (
                            /^grade\s/i.test(assignment.section.name.trim())
                              ? assignment.section.name
                              : `Grade ${assignment.section.grade_level} - ${assignment.section.name}`
                          )}
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
              <h2 className="text-lg font-semibold text-gray-900">Section Advisory</h2>
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
                        <span className="material-symbols-outlined text-primary">groups</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{advisory.section?.name}</p>
                        <p className="text-sm text-gray-500">
                          Grade {advisory.section?.grade_level} - {advisory.section?.student_count || 0} students
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAssignCourseModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Course</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select a section</option>
                    {uniqueSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {formatSectionLabel(section.name, section.grade_level, section.enrolled_count)}
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCourse}
                  disabled={!selectedCourse || !selectedSection || saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Adviser Modal */}
      {showAssignAdviserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAssignAdviserModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign as Section Adviser</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select a section</option>
                    {availableSectionsForAdviser.map((section) => (
                      <option key={section.id} value={section.id}>
                        {formatSectionLabel(section.name, section.grade_level, section.enrolled_count)}
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
                      {enrollmentPreview.courseCount} course(s) you teach in this section.
                    </p>
                  </div>
                )}
                {selectedSection && enrollmentPreview && autoEnroll && enrollmentPreview.courseCount === 0 && (
                  <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                    <p>
                      You are not teaching any courses in this section yet. Auto-enrollment will have
                      no effect until you assign courses first.
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignAdviser}
                  disabled={!selectedSection || saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowConfirmModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600">lock_reset</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Password Reset</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to reset the password for <strong>{formData.full_name}</strong>?
                {newPassword ? " The password will be set to the value you provided." : " A temporary password will be generated."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Auth Account Modal */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => !resettingPassword && setShowCreateAccountModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">person_add</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Create Login Account</h3>
                  <p className="text-sm text-gray-500">This teacher doesn&apos;t have a login account yet</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                  To enable login access for <strong>{formData.full_name}</strong>, we need to create an authentication account with an email address.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="teacher@school.edu.ph"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={resettingPassword}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (optional)
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={resettingPassword}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateAccountModal(false);
                    setNewEmail("");
                  }}
                  disabled={resettingPassword}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAuthAccount}
                  disabled={resettingPassword || !newEmail}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resettingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Change Confirmation Modal */}
      {showEmailChangeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => !saving && setShowEmailChangeModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600">mail_lock</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Email Change</h3>
                  <p className="text-sm text-gray-500">Admin verification required</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">warning</span>
                  Changing the email will affect how <strong>{formData.full_name}</strong> logs in. Admin password required.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Email
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {originalEmail || <span className="italic text-gray-400">(none)</span>}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={pendingNewEmail}
                  onChange={(e) => setPendingNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Admin Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={saving}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && adminPassword && pendingNewEmail) {
                      handleEmailChangeConfirm();
                    }
                  }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEmailChangeModal(false);
                    setAdminPassword("");
                    setPendingNewEmail("");
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailChangeConfirm}
                  disabled={saving || !adminPassword || !pendingNewEmail || pendingNewEmail === originalEmail}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Confirm Change"
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
