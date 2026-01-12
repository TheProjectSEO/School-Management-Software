"use client";

import type { AcademicStanding } from "@/lib/dal/types/grades";

interface AcademicStandingBadgeProps {
  standing: AcademicStanding | null | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const standingConfig: Record<
  AcademicStanding,
  { label: string; icon: string; bgClass: string; textClass: string; borderClass: string }
> = {
  good_standing: {
    label: "Good Standing",
    icon: "check_circle",
    bgClass: "bg-msu-green/10 dark:bg-green-900/30",
    textClass: "text-msu-green dark:text-green-400",
    borderClass: "border-msu-green/20",
  },
  deans_list: {
    label: "Dean's List",
    icon: "star",
    bgClass: "bg-msu-gold/20 dark:bg-yellow-900/30",
    textClass: "text-yellow-700 dark:text-msu-gold",
    borderClass: "border-msu-gold/30",
  },
  presidents_list: {
    label: "President's List",
    icon: "workspace_premium",
    bgClass: "bg-gradient-to-r from-msu-gold/20 to-amber-200/20 dark:from-yellow-900/40 dark:to-amber-900/30",
    textClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-msu-gold/40",
  },
  probation: {
    label: "Academic Probation",
    icon: "warning",
    bgClass: "bg-orange-100 dark:bg-orange-900/30",
    textClass: "text-orange-700 dark:text-orange-400",
    borderClass: "border-orange-300",
  },
  suspension: {
    label: "Academic Suspension",
    icon: "error",
    bgClass: "bg-red-100 dark:bg-red-900/30",
    textClass: "text-red-700 dark:text-red-400",
    borderClass: "border-red-300",
  },
};

export function AcademicStandingBadge({
  standing,
  size = "md",
  showIcon = true,
}: AcademicStandingBadgeProps) {
  if (!standing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="material-symbols-outlined text-[12px]">help</span>
        Pending
      </span>
    );
  }

  const config = standingConfig[standing];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  const iconSizes = {
    sm: "text-[12px]",
    md: "text-[14px]",
    lg: "text-[18px]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses[size]}`}
    >
      {showIcon && (
        <span className={`material-symbols-outlined ${iconSizes[size]}`}>
          {config.icon}
        </span>
      )}
      {config.label}
    </span>
  );
}
