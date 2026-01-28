/**
 * Utility functions for the messaging system
 */

import type { Conversation, Message, UserRole } from "./types";

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Format message timestamp
 */
export function formatMessageTime(timestamp: Date | string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  // Format as date if older than a week
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Sort conversations by last message time (newest first)
 */
export function sortConversationsByTime(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    const timeA = new Date(a.lastMessageTime).getTime();
    const timeB = new Date(b.lastMessageTime).getTime();
    return timeB - timeA;
  });
}

/**
 * Sort conversations with unread first, then by time
 */
export function sortConversationsByUnread(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    // First sort by unread count
    if (a.unreadCount !== b.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    // Then by time
    const timeA = new Date(a.lastMessageTime).getTime();
    const timeB = new Date(b.lastMessageTime).getTime();
    return timeB - timeA;
  });
}

/**
 * Filter conversations by role
 */
export function filterConversationsByRole(
  conversations: Conversation[],
  role: UserRole | "all"
): Conversation[] {
  if (role === "all") return conversations;
  return conversations.filter((conv) => conv.userRole === role);
}

/**
 * Filter conversations by search query
 */
export function searchConversations(
  conversations: Conversation[],
  query: string
): Conversation[] {
  if (!query.trim()) return conversations;

  const lowercaseQuery = query.toLowerCase();
  return conversations.filter(
    (conv) =>
      conv.userName.toLowerCase().includes(lowercaseQuery) ||
      conv.userEmail.toLowerCase().includes(lowercaseQuery) ||
      conv.lastMessage.toLowerCase().includes(lowercaseQuery)
  );
}

/**
 * Get unread conversations count
 */
export function getUnreadCount(conversations: Conversation[]): number {
  return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
}

/**
 * Get conversations with unread messages
 */
export function getUnreadConversations(conversations: Conversation[]): Conversation[] {
  return conversations.filter((conv) => conv.unreadCount > 0);
}

/**
 * Group conversations by role
 */
export function groupConversationsByRole(conversations: Conversation[]): {
  teachers: Conversation[];
  students: Conversation[];
} {
  return conversations.reduce(
    (acc, conv) => {
      if (conv.userRole === "teacher") {
        acc.teachers.push(conv);
      } else {
        acc.students.push(conv);
      }
      return acc;
    },
    { teachers: [] as Conversation[], students: [] as Conversation[] }
  );
}

/**
 * Check if message is from today
 */
export function isToday(timestamp: Date | string): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if message is from yesterday
 */
export function isYesterday(timestamp: Date | string): boolean {
  const date = new Date(timestamp);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Group messages by date
 */
export function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();

  messages.forEach((message) => {
    const date = new Date(message.timestamp);
    let dateLabel: string;

    if (isToday(date)) {
      dateLabel = "Today";
    } else if (isYesterday(date)) {
      dateLabel = "Yesterday";
    } else {
      dateLabel = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    if (!groups.has(dateLabel)) {
      groups.set(dateLabel, []);
    }
    groups.get(dateLabel)!.push(message);
  });

  return groups;
}

/**
 * Validate message content
 */
export function validateMessageContent(content: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = content.trim();

  if (!trimmed) {
    return { valid: false, error: "Message cannot be empty" };
  }

  if (trimmed.length > 2000) {
    return { valid: false, error: "Message is too long (max 2000 characters)" };
  }

  return { valid: true };
}

/**
 * Generate a unique conversation ID
 */
export function generateConversationId(userId: string): string {
  return `conv-${userId}-${Date.now()}`;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get role color classes
 */
export function getRoleColors(role: UserRole): {
  bg: string;
  text: string;
  avatarBg: string;
  avatarText: string;
} {
  const colors = {
    teacher: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      avatarBg: "bg-blue-100",
      avatarText: "text-blue-700",
    },
    student: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      avatarBg: "bg-purple-100",
      avatarText: "text-purple-700",
    },
  };

  return colors[role];
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Sanitize message content (basic XSS prevention)
 */
export function sanitizeMessageContent(content: string): string {
  return content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Parse message content for URLs and convert to links
 */
export function parseMessageLinks(content: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
  );
}

/**
 * Check if user is online (requires online status tracking)
 */
export function isUserOnline(lastSeen: Date | string, thresholdMinutes: number = 5): boolean {
  const lastSeenTime = new Date(lastSeen).getTime();
  const now = Date.now();
  const diffMinutes = (now - lastSeenTime) / (1000 * 60);
  return diffMinutes < thresholdMinutes;
}
