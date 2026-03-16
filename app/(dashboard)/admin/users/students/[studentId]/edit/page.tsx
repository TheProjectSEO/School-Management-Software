"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StudentEditPageProps {
  params: Promise<{ studentId: string }>;
}

interface StudentData {
  id: string;
  profile_id: string;
  lrn: string;
  grade_level: string;
  section_id: string;
  status: string;
  full_name: string;
  phone: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
}

interface Section {
  id: string;
  name: string;
  grade_level: string;
}

export default function StudentEditPage({ params }: StudentEditPageProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pendingNewEmail, setPendingNewEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lrnError, setLrnError] = useState("");
  const [formData, setFormData] = useState<StudentData>({
    id: "",
    profile_id: "",
    lrn: "",
    grade_level: "",
    section_id: "",
    status: "active",
    full_name: "",
    phone: "",
    email: "",
    birth_date: "",
    gender: "",
    address: "",
    guardian_name: "",
    guardian_phone: "",
  });

  const validateLRN = (lrn: string): boolean => {
    if (!lrn) {
      setLrnError("");
      return true;
    }
    const lrnPattern = /^\d{4}-MSU-\d{4,}$/;
    if (!lrnPattern.test(lrn)) {
      setLrnError("Invalid format. Must be YYYY-MSU-#### (e.g., 2026-MSU-0010)");
      return false;
    }
    setLrnError("");
    return true;
  };

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setStudentId(resolvedParams.studentId);
    }
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!studentId) return;

    async function fetchData() {
      try {
        const response = await authFetch(`/api/admin/users/students/${studentId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch student");
        }
        const data = await response.json();
        const studentEmail = data.email || data.profile?.email || "";
        setFormData({
          id: data.id,
          profile_id: data.profile_id,
          lrn: data.lrn || "",
          grade_level: data.grade_level || "",
          section_id: data.section_id || "",
          status: data.status || "active",
          full_name: data.full_name || "",
          phone: data.phone || "",
          email: studentEmail,
          birth_date: data.birth_date || "",
          gender: data.gender || "",
          address: data.address || "",
          guardian_name: data.guardian_name || "",
          guardian_phone: data.guardian_phone || "",
        });
        setOriginalEmail(studentEmail);

        const sectionsResponse = await authFetch("/api/admin/sections");
        if (sectionsResponse.ok) {
          const sectionsData = await sectionsResponse.json();
          setSections(Array.isArray(sectionsData) ? sectionsData : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load student");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.lrn && !validateLRN(formData.lrn)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(`/api/admin/users/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lrn: formData.lrn,
          gradeLevel: formData.grade_level,
          sectionId: formData.section_id || null,
          fullName: formData.full_name,
          phone: formData.phone,
          birthDate: formData.birth_date || null,
          gender: formData.gender || null,
          address: formData.address || null,
          guardianName: formData.guardian_name || null,
          guardianPhone: formData.guardian_phone || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update student");
      }

      if (formData.status) {
        await authFetch(`/api/admin/users/students/${studentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: formData.status }),
        });
      }

      router.push(`/admin/users/students/${studentId}`);
      router.refresh();
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
    setSaving(true);
    setError(null);
    try {
      const response = await authFetch(`/api/admin/users/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingNewEmail,
          adminPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.code === "INVALID_PASSWORD") {
          throw new Error("Invalid admin password. Please try again.");
        }
        throw new Error(data.error || "Failed to update email");
      }

      setFormData((prev) => ({ ...prev, email: pendingNewEmail }));
      setOriginalEmail(pendingNewEmail);
      setShowEmailChangeModal(false);
      setAdminPassword("");
      setPendingNewEmail("");
      setSuccessMessage("Email updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setSaving(false);
    }
  };

  const filteredSections = sections.filter(
    (s) => !formData.grade_level || s.grade_level === formData.grade_level
  );

  const handleResetPassword = async () => {
    setShowConfirmModal(false);
    setResettingPassword(true);
    setError(null);

    try {
      const response = await authFetch(`/api/admin/users/students/${studentId}/reset-password`, {
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
      const response = await authFetch(`/api/admin/users/students/${studentId}/reset-password`, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/users/students/${studentId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-500">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
          <p className="text-gray-500 mt-1">Update student information</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                LRN (Learner Reference Number) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lrn}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, lrn: value });
                  validateLRN(value);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                  lrnError ? "border-red-500" : "border-gray-200"
                }`}
              />
              {lrnError && (
                <p className="text-sm text-red-500 mt-1">{lrnError}</p>
              )}
            </div>

            {/* Email field with Edit button */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  disabled
                  value={formData.email || ""}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPendingNewEmail(formData.email || "");
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
                Grade Level
              </label>
              <select
                value={formData.grade_level}
                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value, section_id: "" })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Select Grade Level</option>
                <option value="1">Grade 1</option>
                <option value="2">Grade 2</option>
                <option value="3">Grade 3</option>
                <option value="4">Grade 4</option>
                <option value="5">Grade 5</option>
                <option value="6">Grade 6</option>
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section
              </label>
              <select
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Select Section</option>
                {filteredSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name} (Grade {section.grade_level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="graduated">Graduated</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
          </div>

          {/* Personal Information */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.birth_date || ""}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender || ""}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Barangay, City"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardian Name
                </label>
                <input
                  type="text"
                  value={formData.guardian_name || ""}
                  onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                  placeholder="Parent or guardian name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardian Phone
                </label>
                <input
                  type="tel"
                  value={formData.guardian_phone || ""}
                  onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              href={`/admin/users/students/${studentId}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !!lrnError}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Password Reset Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Password Management</h2>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Reset the student&apos;s password. You can provide a custom password or generate a temporary one automatically.
          </p>

          <div className="flex items-start gap-4">
            <div className="flex-1">
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
              className="mt-6 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 flex items-center gap-2"
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
          </div>

          {generatedPassword && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    {accountCreated ? "Auth Account Created & Password Set" : "Password Reset Successfully"}
                  </p>
                  <p className="text-sm text-green-700 mt-1">New temporary password:</p>
                  <code className="block mt-2 px-3 py-2 bg-white border border-green-200 rounded font-mono text-sm">
                    {generatedPassword}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPassword);
                    alert("Password copied to clipboard!");
                  }}
                  className="p-2 text-green-700 hover:bg-green-100 rounded-lg"
                  title="Copy password"
                >
                  <span className="material-symbols-outlined">content_copy</span>
                </button>
              </div>
              <p className="text-xs text-green-600 mt-3">
                Make sure to share this password securely with the student.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Email Change Modal */}
      {showEmailChangeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => !saving && setShowEmailChangeModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">email</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Change Email Address</h3>
                  <p className="text-sm text-gray-500">Admin password required for security</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={originalEmail}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={pendingNewEmail}
                    onChange={(e) => setPendingNewEmail(e.target.value)}
                    placeholder="new@email.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Admin Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter your admin password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEmailChangeModal(false);
                    setAdminPassword("");
                    setPendingNewEmail("");
                    setError(null);
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailChangeConfirm}
                  disabled={saving || !pendingNewEmail || !adminPassword}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Update Email"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
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
                  <p className="text-sm text-gray-500">This student doesn&apos;t have a login account yet</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                  To enable login access for <strong>{formData.full_name}</strong>, we need to create an authentication account with an email address.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="student@school.edu.ph"
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
    </div>
  );
}
