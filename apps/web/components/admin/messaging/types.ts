/**
 * Shared types for the messaging system
 */

export type UserRole = "teacher" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole?: UserRole;
  senderAvatar?: string;
  content: string;
  timestamp: Date | string;
  isFromAdmin: boolean;
  isRead: boolean;
  readAt?: Date | string;
}

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date | string;
  unreadCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MessageThread {
  conversation: Conversation;
  messages: Message[];
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
}

export interface CreateConversationPayload {
  userId: string;
  initialMessage: string;
}

export interface MarkAsReadPayload {
  conversationId: string;
  messageIds?: string[]; // If not provided, mark all as read
}

// API Response types
export interface MessagingAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Filter and sort options
export interface ConversationFilters {
  role?: UserRole;
  hasUnread?: boolean;
  search?: string;
}

export type ConversationSortBy = "lastMessage" | "unreadCount" | "userName";
export type SortOrder = "asc" | "desc";

export interface ConversationQueryOptions {
  filters?: ConversationFilters;
  sortBy?: ConversationSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

// WebSocket events (for real-time messaging)
export type MessageEvent =
  | { type: "message:new"; payload: Message }
  | { type: "message:read"; payload: { conversationId: string; messageIds: string[] } }
  | { type: "conversation:updated"; payload: Conversation }
  | { type: "user:typing"; payload: { conversationId: string; userId: string } };
