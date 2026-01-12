"use client";

import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  /** Whether user is online */
  isOnline: boolean;
  /** Additional classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show pulse animation when online */
  pulse?: boolean;
}

/**
 * Online/offline status indicator dot
 * Green when online, gray when offline
 */
export function OnlineIndicator({
  isOnline,
  className,
  size = "md",
  pulse = true,
}: OnlineIndicatorProps) {
  const sizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          "rounded-full",
          sizes[size],
          isOnline ? "bg-green-500" : "bg-slate-300",
          className
        )}
      />
      {isOnline && pulse && (
        <span
          className={cn(
            "absolute inline-flex rounded-full bg-green-400 opacity-75 animate-ping",
            sizes[size]
          )}
        />
      )}
    </span>
  );
}

/**
 * Online indicator with label text
 */
export function OnlineStatus({
  isOnline,
  lastSeen,
  className,
}: {
  isOnline: boolean;
  lastSeen?: string;
  className?: string;
}) {
  const formatLastSeen = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <OnlineIndicator isOnline={isOnline} size="sm" pulse={false} />
      <span className="text-xs text-slate-500">
        {isOnline ? "Online" : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : "Offline"}
      </span>
    </div>
  );
}
