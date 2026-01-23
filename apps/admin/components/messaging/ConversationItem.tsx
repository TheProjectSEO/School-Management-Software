"use client";

import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";

export interface ConversationItemProps {
  id: string;
  userName: string;
  userAvatar?: string;
  userRole: "teacher" | "student";
  lastMessage: string;
  lastMessageTime: Date | string;
  unreadCount: number;
  isActive?: boolean;
  onClick: (id: string) => void;
}

export default function ConversationItem({
  id,
  userName,
  userAvatar,
  userRole,
  lastMessage,
  lastMessageTime,
  unreadCount,
  isActive = false,
  onClick,
}: ConversationItemProps) {
  const timeString = formatDistanceToNow(new Date(lastMessageTime), { addSuffix: true });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateMessage = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const roleConfig = {
    teacher: {
      label: "Teacher",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      avatarBg: "bg-blue-100",
      avatarText: "text-blue-700",
    },
    student: {
      label: "Student",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      avatarBg: "bg-purple-100",
      avatarText: "text-purple-700",
    },
  };

  const config = roleConfig[userRole];

  return (
    <button
      onClick={() => onClick(id)}
      className={clsx(
        "w-full flex items-center gap-3 p-4 transition-all border-b border-gray-100",
        "hover:bg-gray-50 cursor-pointer",
        isActive && "bg-primary/5 border-l-4 border-l-primary",
        !isActive && "border-l-4 border-l-transparent"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 relative">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt={userName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div
            className={clsx(
              "w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold",
              config.avatarBg,
              config.avatarText
            )}
          >
            {getInitials(userName)}
          </div>
        )}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3
              className={clsx(
                "font-semibold text-sm truncate",
                unreadCount > 0 ? "text-gray-900" : "text-gray-700"
              )}
            >
              {userName}
            </h3>
            <span
              className={clsx(
                "inline-flex items-center rounded-full font-medium px-2 py-0.5 text-[10px]",
                config.bgColor,
                config.textColor
              )}
            >
              {config.label}
            </span>
          </div>
        </div>
        <p
          className={clsx(
            "text-xs mb-1",
            unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-500"
          )}
        >
          {truncateMessage(lastMessage)}
        </p>
        <span className="text-xs text-gray-400">{timeString}</span>
      </div>

      {/* Chevron */}
      <div className="flex-shrink-0">
        <span className="material-symbols-outlined text-gray-400 text-lg">
          chevron_right
        </span>
      </div>
    </button>
  );
}
