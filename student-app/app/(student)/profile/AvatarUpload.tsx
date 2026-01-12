"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  fullName: string;
}

export default function AvatarUpload({ currentAvatarUrl, fullName }: AvatarUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a JPEG, PNG, GIF, or WebP image.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setAvatarUrl(data.avatarUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove image");
      }

      setAvatarUrl(undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end -mt-12 mb-6 gap-6">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
        {/* Avatar */}
        <div className="relative group">
          <div className="size-28 sm:size-32 rounded-full ring-4 ring-white dark:ring-[#1a2634] bg-gradient-to-br from-primary/20 to-msu-gold/20 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-primary dark:text-msu-gold text-6xl">
                person
              </span>
            )}

            {/* Upload Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <span className="material-symbols-outlined text-white animate-spin text-3xl">
                  progress_activity
                </span>
              </div>
            )}
          </div>

          {/* Online Indicator */}
          <div
            className="absolute bottom-2 right-2 bg-msu-green size-6 rounded-full border-4 border-white dark:border-[#1a2634]"
            title="Online"
          ></div>
        </div>

        {/* Name & Academic Info */}
        <div className="flex flex-col mb-2">
          <h1 className="text-primary dark:text-white text-2xl sm:text-3xl font-bold leading-tight">
            {fullName || "Student"}
          </h1>
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
        </div>
      </div>

      {/* Upload Buttons */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center justify-center rounded-lg h-10 px-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-sm font-bold transition-colors gap-2 border border-slate-200 dark:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isUploading ? "progress_activity" : "photo_camera"}
          </span>
          <span>{isUploading ? "Uploading..." : avatarUrl ? "Change Photo" : "Add Photo"}</span>
        </button>

        {avatarUrl && (
          <button
            onClick={handleRemoveAvatar}
            disabled={isUploading}
            className="flex items-center justify-center rounded-lg h-10 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold transition-colors gap-2 border border-red-200 dark:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        )}
      </div>
    </div>
  );
}
