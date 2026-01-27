"use client";

import { useState, useEffect } from "react";

interface TeacherProfile {
  id: string;
  employee_number: string;
  specialization: string | null;
  bio: string | null;
  office_hours: string | null;
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

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [officeHours, setOfficeHours] = useState("");

  // Fetch profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/teacher/profile");

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        const p = data.profile;
        setProfile(p);

        // Initialize form values
        setFullName(p?.profile?.full_name || "");
        setPhone(p?.profile?.phone || "");
        setSpecialization(p?.specialization || "");
        setBio(p?.bio || "");
        setOfficeHours(p?.office_hours || "");
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Unable to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  // Save profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          specialization: specialization.trim() || null,
          bio: bio.trim() || null,
          officeHours: officeHours.trim() || null,
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
                Employee Number
              </label>
              <input
                type="text"
                value={profile?.employee_number || ""}
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

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Office Hours
              </label>
              <input
                type="text"
                value={officeHours}
                onChange={(e) => setOfficeHours(e.target.value)}
                placeholder="e.g., Mon-Fri 8:00 AM - 5:00 PM"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Tell students about yourself..."
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Change Password
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Update your account password
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Change
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Two-Factor Authentication
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add an extra layer of security
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
