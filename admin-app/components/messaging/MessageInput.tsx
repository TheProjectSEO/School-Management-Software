"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { clsx } from "clsx";

export interface MessageInputProps {
  onSend: (message: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}

export default function MessageInput({
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  maxLength = 2000,
  className,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [message]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || loading || disabled) return;

    setLoading(true);
    try {
      await onSend(trimmedMessage);
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || loading;
  const isSendDisabled = isDisabled || !message.trim();
  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.9;

  return (
    <div className={clsx("bg-white border-t border-gray-200 p-4", className)}>
      <div className="max-w-4xl mx-auto">
        {/* Character count (show when near limit) */}
        {isNearLimit && (
          <div className="flex justify-end mb-1">
            <span
              className={clsx(
                "text-xs font-medium",
                characterCount >= maxLength ? "text-red-600" : "text-gray-500"
              )}
            >
              {characterCount}/{maxLength}
            </span>
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isDisabled}
              rows={1}
              className={clsx(
                "w-full px-4 py-3 pr-12 rounded-xl border border-gray-300",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                "resize-none overflow-hidden",
                "placeholder:text-gray-400",
                "disabled:bg-gray-100 disabled:cursor-not-allowed",
                "transition-all"
              )}
              style={{ minHeight: "48px", maxHeight: "150px" }}
            />

            {/* Keyboard shortcut hint */}
            {!message && (
              <div className="absolute right-4 bottom-3 flex items-center gap-1 pointer-events-none">
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  Enter
                </span>
                <span className="text-xs text-gray-400">to send</span>
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={isSendDisabled}
            className={clsx(
              "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
              "transition-all font-medium",
              isSendDisabled
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-primary hover:bg-primary-hover text-white shadow-sm hover:shadow-md"
            )}
            aria-label="Send message"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-xl">send</span>
            )}
          </button>
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">info</span>
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Shift + Enter</kbd> for a new line
        </p>
      </div>
    </div>
  );
}
