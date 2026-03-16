"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useRef } from "react";

interface TeacherProfile {
  id: string;
  employee_id: string | null;
  department: string | null;
  specialization: string | null;
  school: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  profile: {
    id: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Security state
  const [securityView, setSecurityView] = useState<'none' | 'password' | 'email'>('none');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [emailForm, setEmailForm] = useState({ current: '', newEmail: '' });
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [specialization, setSpecialization] = useState("");

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Fetch profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await authFetch("/api/teacher/profile");

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        const p = data.profile;
        setProfile(p);

        // Initialize form values
        setFullName(p?.profile?.full_name || "");
        setPhone(p?.profile?.phone || "");
        setDepartment(p?.department || "");
        setSpecialization(p?.specialization || "");
        setAvatarUrl(p?.profile?.avatar_url || null);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Unable to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  // Avatar upload
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setAvatarError("Please select a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be less than 5MB.");
      return;
    }

    setAvatarError(null);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await authFetch("/api/teacher/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setAvatarUrl(data.avatarUrl);
      setSuccessMessage("Avatar updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      const response = await authFetch("/api/teacher/profile/avatar", {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove image");
      }

      setAvatarUrl(null);
      setSuccessMessage("Avatar removed successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to remove image");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await authFetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          department: department.trim() || null,
          specialization: specialization.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setProfile(data.profile);
      setSuccessMessage("Profile updated successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleSecuritySubmit = async (type: 'password' | 'email') => {
    setSecurityError(null);

    if (type === 'password') {
      if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
        setSecurityError('All fields are required');
        return;
      }
      if (pwForm.next.length < 8) {
        setSecurityError('Password must be at least 8 characters');
        return;
      }
      if (pwForm.next !== pwForm.confirm) {
        setSecurityError('Passwords do not match');
        return;
      }
    } else {
      if (!emailForm.current || !emailForm.newEmail) {
        setSecurityError('All fields are required');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailForm.newEmail)) {
        setSecurityError('Invalid email format');
        return;
      }
    }

    setSecurityLoading(true);
    try {
      const endpoint = type === 'password' ? '/api/auth/change-password' : '/api/auth/change-email';
      const body = type === 'password'
        ? { currentPassword: pwForm.current, newPassword: pwForm.next, confirmPassword: pwForm.confirm }
        : { currentPassword: emailForm.current, newEmail: emailForm.newEmail };

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setSecurityError(data.error || 'Something went wrong');
        return;
      }

      window.location.href = '/login?changed=1';
    } catch {
      setSecurityError('Network error. Please try again.');
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account and preferences
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Photo */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Profile Photo
          </h2>

          <div className="flex items-center gap-6">
            {/* Avatar Preview */}
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-msu-gold/20 flex items-center justify-center overflow-hidden ring-2 ring-slate-200 dark:ring-slate-600">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || "Teacher"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-primary dark:text-msu-gold text-4xl">
                    person
                  </span>
                )}

                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <span className="material-symbols-outlined animate-spin text-white text-2xl">
                      progress_activity
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Controls */}
            <div className="flex-1">
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isUploadingAvatar ? "progress_activity" : "photo_camera"}
                  </span>
                  {isUploadingAvatar ? "Uploading..." : avatarUrl ? "Change Photo" : "Upload Photo"}
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                JPEG, PNG, GIF, or WebP. Max 5MB.
              </p>
              {avatarError && (
                <p className="mt-1 text-sm text-red-500">{avatarError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Basic Information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Employee ID
              </label>
              <input
                type="text"
                value={profile?.employee_id || ""}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400"
              />
              <p className="mt-1 text-xs text-slate-500">
                Contact administrator to change
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 XXX XXX XXXX"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Professional Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., College of Engineering, Arts & Sciences"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Specialization
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g., Mathematics, Science, English"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* School Information (Read-only) */}
        {profile?.school && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              School Information
            </h2>

            <div className="flex items-center gap-4">
              {profile.school.logo_url ? (
                <img
                  src={profile.school.logo_url}
                  alt={profile.school.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xl font-bold text-slate-400 dark:bg-slate-700">
                  {profile.school.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {profile.school.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Contact administrator to change school assignment
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Notification Preferences */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Notification Preferences
        </h2>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Email Notifications
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Receive email alerts for new submissions
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Student Messages
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Get notified when students send messages
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Student Alerts
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Receive alerts about at-risk students
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
            />
          </label>
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Note: Notification preferences will be saved automatically.
        </p>
      </div>

      {/* Security Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Security
        </h2>

        {securityError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{securityError}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Change Password Row */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Change Password</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update your account password</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSecurityView(securityView === 'password' ? 'none' : 'password');
                  setSecurityError(null);
                  setPwForm({ current: '', next: '', confirm: '' });
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {securityView === 'password' ? 'Cancel' : 'Change'}
              </button>
            </div>

            {securityView === 'password' && (
              <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/40">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                  <input
                    type="password"
                    value={pwForm.next}
                    onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    placeholder="Repeat new password"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setSecurityView('none'); setSecurityError(null); }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSecuritySubmit('password')}
                    disabled={securityLoading}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#5a0c0e] disabled:opacity-50"
                  >
                    {securityLoading ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Change Email Row */}
          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Change Email</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update your login email address</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSecurityView(securityView === 'email' ? 'none' : 'email');
                  setSecurityError(null);
                  setEmailForm({ current: '', newEmail: '' });
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {securityView === 'email' ? 'Cancel' : 'Change'}
              </button>
            </div>

            {securityView === 'email' && (
              <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/40">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                  <input
                    type="password"
                    value={emailForm.current}
                    onChange={(e) => setEmailForm({ ...emailForm, current: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    placeholder="Enter current password to confirm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">New Email Address</label>
                  <input
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    placeholder="new@email.com"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You will be signed out after changing your email and must sign in again.
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setSecurityView('none'); setSecurityError(null); }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSecuritySubmit('email')}
                    disabled={securityLoading}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#5a0c0e] disabled:opacity-50"
                  >
                    {securityLoading ? 'Saving...' : 'Update Email'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2FA Row */}
          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Add an extra layer of security</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
