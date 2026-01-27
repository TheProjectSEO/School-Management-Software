"use client";

import { clsx } from "clsx";

interface AdminBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

export default function AdminBadge({ size = "sm", className }: AdminBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        "bg-primary text-white",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span className={clsx("material-symbols-outlined", size === "sm" ? "text-xs" : "text-sm")}>
        shield_person
      </span>
      ADMIN
    </span>
  );
}
