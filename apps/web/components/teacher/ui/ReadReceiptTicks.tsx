"use client";

import { cn } from "@/lib/utils";
import type { MessageStatus } from "@/hooks/useRealtimeMessages";

interface ReadReceiptTicksProps {
  /** Message status */
  status: MessageStatus;
  /** Additional classes */
  className?: string;
  /** Show as small version */
  small?: boolean;
}

/**
 * Read receipt ticks showing message delivery status
 * - sending: Clock icon (gray)
 * - sent: Single check (gray)
 * - delivered: Double check (gray)
 * - read: Double check (blue)
 */
export function ReadReceiptTicks({ status, className, small }: ReadReceiptTicksProps) {
  const iconSize = small ? "w-3 h-3" : "w-4 h-4";
  const baseClasses = cn(iconSize, "flex-shrink-0", className);

  // Sending - Clock
  if (status === "sending") {
    return (
      <svg
        className={cn(baseClasses, "text-slate-400")}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }

  // Sent - Single check
  if (status === "sent") {
    return (
      <svg
        className={cn(baseClasses, "text-slate-400")}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  // Delivered - Double check (gray)
  if (status === "delivered") {
    return (
      <svg
        className={cn(baseClasses, "text-slate-400")}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 6 7 17 2 12" />
        <polyline points="22 6 11 17" />
      </svg>
    );
  }

  // Read - Double check (blue)
  return (
    <svg
      className={cn(baseClasses, "text-blue-500")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="18 6 7 17 2 12" />
      <polyline points="22 6 11 17" />
    </svg>
  );
}

/**
 * Get message status from message properties
 */
export function getMessageStatus(message: {
  is_read?: boolean;
  read_at?: string | null;
  delivered_at?: string | null;
  tempId?: string;
}): MessageStatus {
  if (message.tempId) return "sending";
  if (message.is_read || message.read_at) return "read";
  if (message.delivered_at) return "delivered";
  return "sent";
}
