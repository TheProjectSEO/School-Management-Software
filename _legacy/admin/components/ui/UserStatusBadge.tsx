"use client";

import { clsx } from "clsx";

type Status = "active" | "inactive" | "suspended" | "pending" | "completed" | "dropped";

interface UserStatusBadgeProps {
  status: Status;
  size?: "sm" | "md";
}

const statusConfig: Record<
  Status,
  { label: string; bgColor: string; textColor: string; dotColor: string }
> = {
  active: {
    label: "Active",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    dotColor: "bg-green-500",
  },
  inactive: {
    label: "Inactive",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
    dotColor: "bg-gray-400",
  },
  suspended: {
    label: "Suspended",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    dotColor: "bg-red-500",
  },
  pending: {
    label: "Pending",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    dotColor: "bg-yellow-500",
  },
  completed: {
    label: "Completed",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    dotColor: "bg-blue-500",
  },
  dropped: {
    label: "Dropped",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    dotColor: "bg-orange-500",
  },
};

export default function UserStatusBadge({
  status,
  size = "md",
}: UserStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bgColor,
        config.textColor,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      )}
    >
      <span
        className={clsx(
          "rounded-full",
          config.dotColor,
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"
        )}
      />
      {config.label}
    </span>
  );
}
