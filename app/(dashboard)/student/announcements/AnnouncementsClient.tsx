"use client";

import { useState } from "react";
import type { Announcement } from "@/lib/dal";
import { formatDistanceToNow, format } from "date-fns";
import { useStudentTheme } from "@/components/student/providers/StudentThemeProvider";

interface AttachmentData {
  name?: string;
  url?: string;
  type?: string;
  size?: number;
}

interface AnnouncementsClientProps {
  announcements: Announcement[];
  unreadCount: number;
  studentId: string;
}

type FilterType = "all" | "unread" | "urgent" | "high" | "normal";

const filters = [
  { name: "All Announcements", icon: "campaign", key: "all" as FilterType },
  { name: "Unread", icon: "mark_email_unread", key: "unread" as FilterType },
  { name: "Urgent", icon: "priority_high", key: "urgent" as FilterType },
  { name: "Important", icon: "star", key: "high" as FilterType },
  { name: "General", icon: "inbox", key: "normal" as FilterType },
];

function getPriorityStyle(priority: Announcement["priority"]) {
  switch (priority) {
    case "urgent":
      return {
        badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        border: "border-l-red-500",
        icon: "priority_high",
        label: "Urgent",
      };
    case "high":
      return {
        badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        border: "border-l-orange-500",
        icon: "star",
        label: "Important",
      };
    case "normal":
      return {
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        border: "border-l-blue-500",
        icon: "info",
        label: "General",
      };
    case "low":
    default:
      return {
        badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        border: "border-l-slate-400",
        icon: "chat_bubble",
        label: "FYI",
      };
  }
}

function getTargetLabel(type: Announcement["target_type"]) {
  switch (type) {
    case "section":
      return "Your Section";
    case "grade":
      return "Your Grade Level";
    case "course":
      return "Your Course";
    case "school":
      return "School-wide";
    default:
      return "";
  }
}

function formatTimestamp(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "Recently";
  }
}

function formatExpiryDate(timestamp: string): string {
  try {
    return format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return timestamp;
  }
}

export function AnnouncementsClient({
  announcements: initialAnnouncements,
  unreadCount: initialUnreadCount,
  studentId,
}: AnnouncementsClientProps) {
  const { isPlayful } = useStudentTheme();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState<string | null>(null);

  // Filter announcements based on active filter
  const filteredAnnouncements = announcements.filter((announcement) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !announcement.is_read;
    return announcement.priority === activeFilter;
  });

  // Sort by priority (urgent first) then by date
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.published_at || b.created_at).getTime() -
           new Date(a.published_at || a.created_at).getTime();
  });

  const handleMarkAsRead = async (announcementId: string) => {
    if (isMarkingRead) return;

    setIsMarkingRead(announcementId);
    try {
      const response = await fetch(`/api/student/announcements/${announcementId}`, {
        method: "POST",
      });

      if (response.ok) {
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === announcementId ? { ...a, is_read: true } : a
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    } finally {
      setIsMarkingRead(null);
    }
  };

  const handleExpand = async (announcementId: string) => {
    const announcement = announcements.find((a) => a.id === announcementId);

    // Toggle expansion
    if (expandedId === announcementId) {
      setExpandedId(null);
    } else {
      setExpandedId(announcementId);

      // Mark as read when expanded
      if (announcement && !announcement.is_read) {
        await handleMarkAsRead(announcementId);
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 -mx-4 sm:-mx-6 lg:-mx-8 -my-8 min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className={`hidden lg:flex w-64 flex-col shrink-0 gap-6 sticky top-0 self-start h-auto py-8 px-6 border-r ${
        isPlayful
          ? "bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200"
          : "bg-white dark:bg-[#1a2634] border-slate-200 dark:border-slate-700"
      }`}>
        <div className="flex flex-col gap-2">
          <h2 className={`text-lg font-bold mb-2 uppercase tracking-wide ${
            isPlayful ? "text-pink-600" : "text-primary dark:text-msu-gold"
          }`}>
            {isPlayful ? "\u{1F3AF} Filter By" : "Filter By"}
          </h2>
          <nav className="flex flex-col gap-1">
            {filters.map((filter) => {
              const count =
                filter.key === "unread"
                  ? unreadCount
                  : filter.key === "all"
                  ? null
                  : announcements.filter((a) => a.priority === filter.key).length;

              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-left ${
                    activeFilter === filter.key
                      ? isPlayful
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm"
                        : "bg-primary text-white shadow-sm"
                      : isPlayful
                        ? "text-slate-700 hover:bg-pink-100/60"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${
                      activeFilter !== filter.key
                        ? isPlayful ? "text-pink-500" : "text-primary dark:text-msu-gold"
                        : ""
                    }`}
                  >
                    {filter.icon}
                  </span>
                  <span>{filter.name}</span>
                  {count !== null && count > 0 && (
                    <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                      isPlayful
                        ? "bg-pink-500 text-white"
                        : "bg-msu-gold text-primary"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Info Card */}
        <div className={`mt-4 rounded-xl p-4 border ${
          isPlayful
            ? "bg-gradient-to-br from-pink-100/60 to-purple-100/60 border-pink-200"
            : "bg-gradient-to-br from-primary/10 to-msu-gold/10 border-primary/10"
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${
            isPlayful ? "text-pink-600" : "text-primary dark:text-msu-gold"
          }`}>
            <span className="material-symbols-outlined">info</span>
            <span className="font-bold text-sm">{isPlayful ? "What is this?" : "About Announcements"}</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isPlayful
              ? "This is where your teachers and school share important news with you. Tap on one to read more!"
              : "Announcements are messages from your teachers and school administration. Click to read the full content."}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-col flex-1 max-w-[800px] py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-primary dark:text-white tracking-tight">
                {isPlayful ? "\u{1F4E2} News" : "Announcements"}
              </h1>
              {unreadCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isPlayful
                    ? "bg-pink-500 text-white"
                    : "bg-primary text-white"
                }`}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              {isPlayful
                ? "See what your teachers and school have to share!"
                : "Important messages from your teachers and school"}
            </p>
          </div>
        </div>

        {/* Mobile Filter Pills */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter.key
                  ? isPlayful
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                    : "bg-primary text-white"
                  : isPlayful
                    ? "bg-white text-slate-700 border border-pink-200"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{filter.icon}</span>
              {filter.name}
            </button>
          ))}
        </div>

        {/* Announcement Cards */}
        {sortedAnnouncements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className={`size-20 rounded-full flex items-center justify-center mb-4 ${
              isPlayful ? "bg-pink-100" : "bg-slate-100 dark:bg-slate-800"
            }`}>
              <span className={`material-symbols-outlined text-4xl ${
                isPlayful ? "text-pink-400" : "text-slate-400"
              }`}>
                {activeFilter === "unread" ? "mark_email_read" : "campaign_off"}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {activeFilter === "unread"
                ? isPlayful ? "\u{1F389} All caught up!" : "All caught up!"
                : isPlayful ? "\u{1F4ED} Nothing here yet!" : "No announcements"}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">
              {activeFilter === "unread"
                ? isPlayful ? "You read everything! Great job!" : "You have read all announcements."
                : activeFilter === "all"
                ? isPlayful
                  ? "No news right now. Check back later!"
                  : "There are no announcements for you at the moment."
                : `No ${activeFilter} priority announcements found.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedAnnouncements.map((announcement) => {
              const style = getPriorityStyle(announcement.priority);
              const isExpanded = expandedId === announcement.id;
              const teacherName = announcement.teacher?.profile?.full_name || "School Administration";

              return (
                <div
                  key={announcement.id}
                  className={`group relative shadow-sm border-l-4 ${style.border} hover:shadow-md transition-all overflow-hidden ${
                    isPlayful
                      ? `bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-y-2 border-r-2 border-pink-200 ${
                          !announcement.is_read ? "ring-2 ring-pink-300" : ""
                        }`
                      : `bg-white dark:bg-[#1a2634] rounded-xl border-y border-r border-slate-100 dark:border-slate-700 ${
                          !announcement.is_read ? "ring-2 ring-primary/20" : ""
                        }`
                  }`}
                >
                  {/* Header - Always visible */}
                  <button
                    onClick={() => handleExpand(announcement.id)}
                    className="w-full p-5 text-left"
                  >
                    <div className="flex items-start gap-4">
                      {/* Priority Icon */}
                      <div className={`shrink-0 size-12 rounded-lg flex items-center justify-center ${
                        announcement.priority === "urgent"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          : announcement.priority === "high"
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      }`}>
                        <span className="material-symbols-outlined">campaign</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                                {style.label}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {getTargetLabel(announcement.target_type)}
                              </span>
                              {!announcement.is_read && (
                                <div className={`size-2 rounded-full ${
                                  isPlayful ? "bg-pink-500" : "bg-primary"
                                }`}></div>
                              )}
                            </div>
                            <h3 className={`text-lg ${!announcement.is_read ? "font-bold" : "font-semibold"} text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-msu-gold transition-colors`}>
                              {announcement.title}
                            </h3>
                          </div>
                          <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                            expand_more
                          </span>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">person</span>
                            <span>{teacherName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">schedule</span>
                            <span>{formatTimestamp(announcement.published_at || announcement.created_at)}</span>
                          </div>
                          {announcement.expires_at && (
                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <span className="material-symbols-outlined text-base">timer</span>
                              <span>Expires {formatExpiryDate(announcement.expires_at)}</span>
                            </div>
                          )}
                        </div>

                        {/* Preview text when collapsed */}
                        {!isExpanded && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {announcement.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0">
                      <div className="ml-16 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {announcement.content}
                          </p>
                        </div>

                        {/* Attachments placeholder */}
                        {announcement.attachments && announcement.attachments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">attach_file</span>
                              Attachments
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {announcement.attachments.map((attachment, index) => {
                                const att = attachment as AttachmentData;
                                return (
                                  <a
                                    key={index}
                                    href={att.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-base">description</span>
                                    {att.name || `Attachment ${index + 1}`}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex items-center gap-3">
                          {announcement.is_read ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <span className="material-symbols-outlined text-base">check_circle</span>
                              Read
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(announcement.id);
                              }}
                              disabled={isMarkingRead === announcement.id}
                              className="flex items-center gap-1 text-xs font-medium text-primary dark:text-msu-gold hover:underline disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-base">done</span>
                              {isMarkingRead === announcement.id ? "Marking..." : "Mark as read"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {sortedAnnouncements.length >= 20 && (
          <div className="mt-8 flex justify-center">
            <button className="text-sm font-medium text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-msu-gold transition-colors flex items-center gap-1">
              Load more announcements
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
