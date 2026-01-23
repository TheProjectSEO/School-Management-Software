"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  profileData: {
    fullName: string;
    studentId: string;
    email: string;
    phone: string;
    gradeLevel: string;
    sectionId: string;
    avatarUrl?: string;
    profileId: string;
  };
}

interface FormErrors {
  fullName?: string;
  phone?: string;
}

export default function ProfileForm({ profileData }: ProfileFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: profileData.fullName,
    phone: profileData.phone,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    // Validate phone (optional but must be valid if provided)
    if (formData.phone.trim()) {
      // Basic Philippine phone number validation
      const phoneRegex = /^(\+63|0)?9\d{9}$/;
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone = "Please enter a valid Philippine phone number (e.g., 0917 123 4567)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Clear previous messages
    setMessage(null);

    // Validate form
    if (!validateForm()) {
      setMessage({
        type: "error",
        text: "Please fix the errors before saving",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: profileData.profileId,
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });

      // Refresh the page to show updated data from server
      setTimeout(() => {
        router.refresh();
      }, 500);

      // Clear success message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original data
    setFormData({
      fullName: profileData.fullName,
      phone: profileData.phone,
    });
    setErrors({});
    setMessage(null);
  };

  const hasChanges =
    formData.fullName !== profileData.fullName || formData.phone !== profileData.phone;

  return (
    <>
      {/* Message Alert */}
      {message && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              {message.type === "success" ? "check_circle" : "error"}
            </span>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#1a2634] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 px-6 sm:px-8 py-8">
        {/* Personal Information Section */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-8 bg-primary rounded-full"></div>
          <h3 className="text-slate-900 dark:text-white text-xl font-bold">
            Personal Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Full Name */}
          <label className="flex flex-col gap-2 group">
            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium group-focus-within:text-primary transition-colors">
              Full Name <span className="text-red-500">*</span>
            </span>
            <div className="relative">
              <input
                className={`w-full rounded-lg border ${
                  errors.fullName
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-300 dark:border-slate-600 focus:ring-primary"
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white h-12 px-4 pr-12 focus:ring-2 focus:border-transparent outline-none transition-all`}
                type="text"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (errors.fullName) {
                    setErrors({ ...errors, fullName: undefined });
                  }
                }}
                placeholder="Enter your full name"
              />
              <span className="material-symbols-outlined absolute right-4 top-3 text-slate-400">
                person
              </span>
            </div>
            {errors.fullName && (
              <p className="text-xs text-red-500 dark:text-red-400">{errors.fullName}</p>
            )}
          </label>

          {/* Student ID - Read Only */}
          <label className="flex flex-col gap-2 group">
            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              Student ID
            </span>
            <div className="relative">
              <input
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 h-12 px-4 pr-12 outline-none cursor-not-allowed"
                type="text"
                value={profileData.studentId}
                disabled
              />
              <span className="material-symbols-outlined absolute right-4 top-3 text-slate-400">
                badge
              </span>
            </div>
          </label>

          {/* Email - Read Only */}
          <label className="flex flex-col gap-2 group">
            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              Email Address
            </span>
            <div className="relative">
              <input
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 h-12 px-4 pr-12 outline-none cursor-not-allowed"
                type="email"
                value={profileData.email || "Not set"}
                disabled
                title="Email cannot be changed"
              />
              <span className="material-symbols-outlined absolute right-4 top-3 text-slate-400">
                mail
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contact admin to update email
            </p>
          </label>

          {/* Phone */}
          <label className="flex flex-col gap-2 group">
            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium group-focus-within:text-primary transition-colors">
              Phone Number
            </span>
            <div className="relative">
              <input
                className={`w-full rounded-lg border ${
                  errors.phone
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-300 dark:border-slate-600 focus:ring-primary"
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white h-12 px-4 pr-12 focus:ring-2 focus:border-transparent outline-none transition-all`}
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) {
                    setErrors({ ...errors, phone: undefined });
                  }
                }}
                placeholder="+63 917 123 4567"
              />
              <span className="material-symbols-outlined absolute right-4 top-3 text-slate-400">
                phone
              </span>
            </div>
            {errors.phone && (
              <p className="text-xs text-red-500 dark:text-red-400">{errors.phone}</p>
            )}
          </label>
        </div>

        {/* Academic Details Section */}
        <div className="flex items-center gap-3 mb-6 mt-8 pt-6 border-t border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-1.5 h-8 bg-primary rounded-full"></div>
          <h3 className="text-slate-900 dark:text-white text-xl font-bold">Academic Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Grade Level - Read Only */}
          <label className="flex flex-col gap-2 group">
            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              Grade Level
            </span>
            <div className="relative">
              <input
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 h-12 px-4 pr-12 outline-none cursor-not-allowed"
                type="text"
                value={profileData.gradeLevel}
                disabled
              />
              <span className="material-symbols-outlined absolute right-4 top-3 text-slate-400">
                school
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assigned by school administrator
            </p>
          </label>

          {/* Section ID - Read Only */}
          <label className="flex flex-col gap-2 group">
            <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">
              Section
            </span>
            <div className="relative">
              <input
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 h-12 px-4 pr-12 outline-none cursor-not-allowed"
                type="text"
                value={profileData.sectionId || "Not assigned"}
                disabled
              />
              <span className="material-symbols-outlined absolute right-4 top-3 text-slate-400">
                groups
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assigned by school administrator
            </p>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleCancel}
            disabled={!hasChanges || isSaving}
            className="px-8 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-[#1a2634] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-8 py-3 rounded-lg bg-primary text-white font-bold hover:bg-[#5a0c0e] shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 border border-transparent hover:border-msu-gold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
