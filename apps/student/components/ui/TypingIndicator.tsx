"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  /** Name of the person typing */
  name?: string;
  /** Additional classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * Animated typing indicator showing bouncing dots
 * Used when partner is composing a message
 */
export function TypingIndicator({ name, className, size = "md" }: TypingIndicatorProps) {
  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
  };

  return (
    <div className={cn("flex items-center gap-2 text-slate-500", className)}>
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "bg-slate-400 rounded-full animate-bounce",
            dotSizes[size]
          )}
          style={{ animationDelay: "0ms" }}
        />
        <span
          className={cn(
            "bg-slate-400 rounded-full animate-bounce",
            dotSizes[size]
          )}
          style={{ animationDelay: "150ms" }}
        />
        <span
          className={cn(
            "bg-slate-400 rounded-full animate-bounce",
            dotSizes[size]
          )}
          style={{ animationDelay: "300ms" }}
        />
      </div>
      {name && (
        <span className={cn("text-slate-500", textSizes[size])}>
          {name} is typing...
        </span>
      )}
    </div>
  );
}

/**
 * Inline typing indicator for use in message list
 */
export function TypingIndicatorBubble({ name }: { name?: string }) {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
      <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
        <TypingIndicator name={name} size="sm" />
      </div>
    </div>
  );
}
