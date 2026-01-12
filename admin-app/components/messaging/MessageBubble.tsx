"use client";

import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import AdminBadge from "./AdminBadge";

export interface MessageBubbleProps {
  id: string;
  content: string;
  timestamp: Date | string;
  isFromAdmin: boolean;
  senderName: string;
  senderRole?: "teacher" | "student";
  senderAvatar?: string;
  isRead?: boolean;
}

export default function MessageBubble({
  content,
  timestamp,
  isFromAdmin,
  senderName,
  senderRole,
  senderAvatar,
  isRead = true,
}: MessageBubbleProps) {
  const timeString = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = () => {
    if (isFromAdmin) {
      return <AdminBadge size="sm" />;
    }

    if (!senderRole) return null;

    const roleConfig = {
      teacher: {
        label: "Teacher",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
      },
      student: {
        label: "Student",
        bgColor: "bg-purple-50",
        textColor: "text-purple-700",
      },
    };

    const config = roleConfig[senderRole];

    return (
      <span
        className={clsx(
          "inline-flex items-center rounded-full font-medium px-2 py-0.5 text-[10px]",
          config.bgColor,
          config.textColor
        )}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div className={clsx("flex gap-3", isFromAdmin ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {senderAvatar ? (
          <img
            src={senderAvatar}
            alt={senderName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div
            className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
              isFromAdmin
                ? "bg-primary text-white"
                : senderRole === "teacher"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            )}
          >
            {getInitials(senderName)}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={clsx("flex-1 max-w-[70%]", isFromAdmin ? "items-end" : "items-start")}>
        {/* Sender Info */}
        <div className={clsx("flex items-center gap-2 mb-1", isFromAdmin && "flex-row-reverse")}>
          <span className="text-sm font-medium text-gray-900">{senderName}</span>
          {getRoleBadge()}
        </div>

        {/* Message Bubble */}
        <div
          className={clsx(
            "rounded-2xl px-4 py-2.5 shadow-sm",
            isFromAdmin
              ? "bg-primary text-white rounded-tr-sm"
              : "bg-white text-gray-900 border border-gray-200 rounded-tl-sm"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        </div>

        {/* Timestamp and Read Status */}
        <div
          className={clsx(
            "flex items-center gap-2 mt-1 px-1",
            isFromAdmin && "flex-row-reverse"
          )}
        >
          <span className="text-xs text-gray-500">{timeString}</span>
          {isFromAdmin && (
            <span
              className={clsx(
                "material-symbols-outlined text-xs",
                isRead ? "text-primary" : "text-gray-400"
              )}
            >
              {isRead ? "done_all" : "done"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
