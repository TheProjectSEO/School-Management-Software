"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Download } from "@/lib/dal";

type DownloadStatus = "ready" | "syncing" | "queued" | "error";

interface DownloadsClientProps {
  downloads: Download[];
  stats: {
    totalDownloads: number;
    readyDownloads: number;
    queuedDownloads: number;
    syncingDownloads: number;
    errorDownloads: number;
    totalSizeBytes: number;
  };
}

// Helper to format bytes to human-readable size
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i)) + " " + sizes[i];
}

// Helper to get icon based on file type
function getFileIcon(fileType?: string): {
  icon: string;
  iconBg: string;
  iconColor: string;
} {
  if (!fileType) {
    return {
      icon: "description",
      iconBg: "bg-slate-100 dark:bg-slate-800",
      iconColor: "text-slate-600 dark:text-slate-400",
    };
  }

  const type = fileType.toLowerCase();

  if (type.includes("video")) {
    return {
      icon: "play_circle",
      iconBg: "bg-primary/10 dark:bg-primary/30",
      iconColor: "text-primary dark:text-red-400",
    };
  }

  if (type.includes("pdf") || type.includes("document")) {
    return {
      icon: "description",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-700 dark:text-blue-400",
    };
  }

  if (type.includes("image")) {
    return {
      icon: "image",
      iconBg: "bg-msu-green/10 dark:bg-msu-green/20",
      iconColor: "text-msu-green dark:text-green-400",
    };
  }

  if (type.includes("audio")) {
    return {
      icon: "headphones",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-700 dark:text-purple-400",
    };
  }

  if (type.includes("zip") || type.includes("archive")) {
    return {
      icon: "folder_zip",
      iconBg: "bg-msu-gold/20 dark:bg-msu-gold/20",
      iconColor: "text-yellow-700 dark:text-msu-gold",
    };
  }

  return {
    icon: "description",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-400",
  };
}

function getStatusBadge(status: DownloadStatus) {
  switch (status) {
    case "ready":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-msu-green/10 dark:bg-msu-green/30 text-msu-green dark:text-green-400 border border-green-200 dark:border-green-800">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Ready Offline
        </span>
      );
    case "syncing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
          Syncing...
        </span>
      );
    case "queued":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-msu-gold/10 dark:bg-msu-gold/20 text-yellow-700 dark:text-msu-gold border border-msu-gold/30 dark:border-msu-gold/30">
          <span className="material-symbols-outlined text-sm">cloud_queue</span>
          Queued
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
          <span className="material-symbols-outlined text-sm">error</span>
          Error
        </span>
      );
  }
}

function getActionButtons(
  status: DownloadStatus,
  onDownload: () => void,
  onDelete: () => void,
  onRetry: () => void,
  isDownloading: boolean
) {
  switch (status) {
    case "ready":
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="text-slate-400 hover:text-msu-green dark:hover:text-green-400 p-2 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download File"
          >
            <span className="material-symbols-outlined">
              {isDownloading ? "hourglass_empty" : "download"}
            </span>
          </button>
          <button
            onClick={onDelete}
            className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete Pack"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      );
    case "syncing":
      return (
        <button
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Syncing..."
          disabled
        >
          <span className="material-symbols-outlined animate-spin">sync</span>
        </button>
      );
    case "queued":
      return (
        <button
          className="text-slate-400 hover:text-primary dark:hover:text-primary p-2 rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
          title="Waiting to sync"
          disabled
        >
          <span className="material-symbols-outlined">cloud_queue</span>
        </button>
      );
    case "error":
      return (
        <button
          onClick={onRetry}
          className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Retry Download"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      );
  }
}

export default function DownloadsClient({ downloads, stats }: DownloadsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "queued" | "history">("all");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [isSeeding, setIsSeeding] = useState(false);

  // Filter downloads based on active tab and file type
  const filteredDownloads = useMemo(() => {
    let result = downloads;

    // Filter by tab
    if (activeTab === "queued") {
      result = result.filter((d) => d.status === "queued" || d.status === "syncing");
    } else if (activeTab === "history") {
      result = result.filter((d) => d.status === "ready");
    }

    // Filter by file type
    if (fileTypeFilter !== "all") {
      result = result.filter((d) => {
        const fileType = d.file_type?.toLowerCase() || "";
        if (fileTypeFilter === "videos") {
          return fileType.includes("video");
        } else if (fileTypeFilter === "documents") {
          return fileType.includes("pdf") || fileType.includes("document") || fileType.includes("msword");
        } else if (fileTypeFilter === "images") {
          return fileType.includes("image");
        } else if (fileTypeFilter === "audio") {
          return fileType.includes("audio");
        }
        return true;
      });
    }

    return result;
  }, [downloads, activeTab, fileTypeFilter]);

  // Calculate storage percentage
  const totalStorageBytes = 10 * 1024 * 1024 * 1024; // 10 GB
  const storagePercent = Math.min(100, (stats.totalSizeBytes / totalStorageBytes) * 100);

  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  const handleDownload = async (downloadId: string, title: string) => {
    try {
      setIsDownloading((prev) => ({ ...prev, [downloadId]: true }));

      const response = await fetch(`/api/downloads/${downloadId}`);
      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }

      const { url } = await response.json();

      // Create a temporary anchor element and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = title;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file. Please try again.");
    } finally {
      setIsDownloading((prev) => ({ ...prev, [downloadId]: false }));
    }
  };

  const handleDownloadAll = async () => {
    try {
      setIsBatchDownloading(true);

      const downloadIds = filteredDownloads.filter((d) => d.status === "ready").map((d) => d.id);

      if (downloadIds.length === 0) {
        alert("No ready downloads to download");
        return;
      }

      const response = await fetch("/api/downloads/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to prepare batch download");
      }

      const { downloads } = await response.json();

      // Download each file with a small delay to avoid browser blocking
      for (let i = 0; i < downloads.length; i++) {
        const download = downloads[i];
        const link = document.createElement("a");
        link.href = download.url;
        link.download = download.fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Small delay between downloads
        if (i < downloads.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Error downloading all files:", error);
      alert("Failed to download all files. Please try again.");
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const handleDelete = async (downloadId: string) => {
    if (!confirm("Are you sure you want to delete this download?")) {
      return;
    }

    try {
      const response = await fetch(`/api/downloads/${downloadId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete download");
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error deleting download:", error);
      alert("Failed to delete download. Please try again.");
    }
  };

  const handleRetry = async (downloadId: string) => {
    try {
      const response = await fetch(`/api/downloads/${downloadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "queued" }),
      });

      if (!response.ok) {
        throw new Error("Failed to retry download");
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Error retrying download:", error);
      alert("Failed to retry download. Please try again.");
    }
  };

  const handleSeedDownloads = async () => {
    try {
      setIsSeeding(true);
      const response = await fetch("/api/admin/seed-downloads", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to seed downloads");
      }

      const result = await response.json();
      console.log("Seed result:", result);

      // Refresh the page to show the new downloads
      router.refresh();
    } catch (error) {
      console.error("Error seeding downloads:", error);
      alert("Failed to add sample downloads. Please try again.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-4xl">offline_pin</span>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Offline Learning Manager
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Manage your downloaded course packs and sync your progress when internet connectivity is available.
          </p>
        </div>

        {/* Storage Card */}
        <div className="w-full lg:w-96 bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Device Storage</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-msu-gold/10 dark:bg-slate-800 text-yellow-700 dark:text-msu-gold">
              {Math.round(storagePercent)}% Used
            </span>
          </div>
          <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${storagePercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatBytes(stats.totalSizeBytes)} used</span>
            <span>{formatBytes(totalStorageBytes)} total</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-msu-green/5 rounded-bl-full -mr-4 -mt-4"></div>
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
            <span className="material-symbols-outlined text-msu-green text-3xl">folder_zip</span>
            <span className="text-sm font-bold uppercase tracking-wider text-msu-green">Downloaded Packs</span>
          </div>
          <span className="text-4xl font-bold text-slate-900 dark:text-white">{stats.readyDownloads}</span>
          <span className="text-sm text-slate-400 dark:text-slate-500">Ready for offline use</span>
        </div>

        <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-msu-gold/10 rounded-bl-full -mr-4 -mt-4"></div>
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
            <span className="material-symbols-outlined text-yellow-700 dark:text-msu-gold">cloud_upload</span>
            <span className="text-sm font-bold uppercase tracking-wider text-yellow-700 dark:text-msu-gold">
              Pending Uploads
            </span>
          </div>
          <span className="text-4xl font-bold text-slate-900 dark:text-white">{stats.queuedDownloads}</span>
          <span className="text-sm text-slate-400 dark:text-slate-500">Waiting for connection</span>
        </div>

        <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-4 -mt-4"></div>
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
            <span className="material-symbols-outlined text-primary">sync</span>
            <span className="text-sm font-bold uppercase tracking-wider text-primary">Syncing Now</span>
          </div>
          <span className="text-4xl font-bold text-slate-900 dark:text-white">{stats.syncingDownloads}</span>
          <span className="text-sm text-slate-400 dark:text-slate-500">Downloads in progress</span>
        </div>
      </div>

      {/* Downloads Table Card */}
      <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 pt-2">
          <div className="flex gap-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`relative pb-4 pt-2 text-sm tracking-wide transition-colors ${
                activeTab === "all"
                  ? "text-primary font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              All Downloads
              {activeTab === "all" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("queued")}
              className={`relative pb-4 pt-2 text-sm tracking-wide transition-colors ${
                activeTab === "queued"
                  ? "text-primary font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              Queued Uploads
              {(stats.queuedDownloads > 0 || stats.syncingDownloads > 0) && (
                <span className="ml-1.5 bg-msu-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {stats.queuedDownloads + stats.syncingDownloads}
                </span>
              )}
              {activeTab === "queued" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`relative pb-4 pt-2 text-sm tracking-wide transition-colors ${
                activeTab === "history"
                  ? "text-primary font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              Sync History
              {activeTab === "history" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* Filter and Actions */}
        <div className="p-4 flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              filter_list
            </span>
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="videos">Videos</option>
              <option value="documents">Documents</option>
              <option value="images">Images</option>
              <option value="audio">Audio</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadAll}
              disabled={isBatchDownloading || filteredDownloads.filter((d) => d.status === "ready").length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-msu-green hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm shadow-msu-green/20 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">
                {isBatchDownloading ? "hourglass_empty" : "download_for_offline"}
              </span>
              {isBatchDownloading ? "Downloading..." : "Download All Ready"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredDownloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
                cloud_off
              </span>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                No downloads yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
                {activeTab === "all"
                  ? "Start downloading course materials to access them offline."
                  : activeTab === "queued"
                  ? "No downloads are currently queued or syncing."
                  : "No download history available yet."}
              </p>
              {activeTab === "all" && downloads.length === 0 && (
                <button
                  onClick={handleSeedDownloads}
                  disabled={isSeeding}
                  className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">
                    {isSeeding ? "hourglass_empty" : "add_circle"}
                  </span>
                  {isSeeding ? "Adding Sample Content..." : "Add Sample Downloads"}
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredDownloads.map((download) => {
                  const fileIcon = getFileIcon(download.file_type);
                  return (
                    <tr
                      key={download.id}
                      className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        download.status === "syncing" ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-lg ${fileIcon.iconBg} flex items-center justify-center ${fileIcon.iconColor}`}
                          >
                            <span className="material-symbols-outlined">{fileIcon.icon}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{download.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(download.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {download.file_type || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatBytes(download.file_size_bytes)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(download.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {getActionButtons(
                          download.status,
                          () => handleDownload(download.id, download.title),
                          () => handleDelete(download.id),
                          () => handleRetry(download.id),
                          isDownloading[download.id] || false
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination - Only show if there are downloads */}
        {filteredDownloads.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-medium text-slate-900 dark:text-white">1</span> to{" "}
              <span className="font-medium text-slate-900 dark:text-white">{filteredDownloads.length}</span> of{" "}
              <span className="font-medium text-slate-900 dark:text-white">{filteredDownloads.length}</span> results
            </p>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded text-slate-400 cursor-not-allowed"
                disabled
              >
                Previous
              </button>
              <button
                className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded text-slate-400 cursor-not-allowed"
                disabled
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
