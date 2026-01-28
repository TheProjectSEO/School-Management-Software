/**
 * Type definitions for useAdminMessaging hook
 * Provides TypeScript autocomplete and IntelliSense support
 */

import type { RealtimeChannel } from "@supabase/supabase-js";

export interface AdminMessage {
  id: string;
  sender_profile_id: string;
  receiver_profile_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  receiver?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface ConversationUpdate {
  profile_id: string;
  message: AdminMessage;
  type: "new_message" | "message_read";
}

export interface PresenceState {
  profileId: string;
  status: "online" | "offline";
  lastSeen?: string;
}

export interface UseAdminMessagingOptions {
  /**
   * Play sound on new message
   * @default true
   */
  playSound?: boolean;

  /**
   * Callback when a new message arrives
   */
  onNewMessage?: (message: AdminMessage) => void;

  /**
   * Callback when message status changes (read receipt)
   */
  onMessageRead?: (messageId: string) => void;

  /**
   * Callback when conversation list updates
   */
  onConversationUpdate?: (update: ConversationUpdate) => void;
}

export interface UseAdminMessagingReturn {
  /**
   * Subscribe to a specific conversation with a user
   * @param userProfileId - Profile ID of the user to chat with
   */
  subscribeToConversation: (userProfileId: string) => void;

  /**
   * Unsubscribe from current conversation
   */
  unsubscribeFromConversation: () => void;

  /**
   * Subscribe to all conversation updates (for conversation list)
   */
  subscribeToConversations: () => void;

  /**
   * Unsubscribe from conversation list updates
   */
  unsubscribeFromConversations: () => void;

  /**
   * Latest new message received
   */
  newMessage: AdminMessage | null;

  /**
   * Conversation updates (new messages, read receipts)
   */
  conversationUpdates: ConversationUpdate[];

  /**
   * Map of profile IDs to their presence state
   */
  presenceMap: Map<string, PresenceState>;

  /**
   * Whether subscribed to a specific conversation
   */
  isConversationSubscribed: boolean;

  /**
   * Whether subscribed to conversation list
   */
  isConversationsSubscribed: boolean;

  /**
   * Connection error
   */
  error: string | null;

  /**
   * Clear new message state
   */
  clearNewMessage: () => void;

  /**
   * Clear conversation updates
   */
  clearConversationUpdates: () => void;

  /**
   * Check if a specific profile is online
   * @param profileId - Profile ID to check
   */
  isOnline: (profileId: string) => boolean;

  /**
   * Get last seen time for a profile
   * @param profileId - Profile ID to check
   */
  getLastSeen: (profileId: string) => string | undefined;
}

/**
 * Comprehensive hook for admin real-time messaging using Supabase Realtime
 *
 * @example
 * ```typescript
 * const {
 *   subscribeToConversation,
 *   newMessage,
 *   isConversationSubscribed
 * } = useAdminMessaging(adminProfileId, schoolId);
 *
 * useEffect(() => {
 *   subscribeToConversation(userId);
 *   return () => unsubscribeFromConversation();
 * }, [userId]);
 * ```
 *
 * @param adminProfileId - The admin's profile ID
 * @param schoolId - The school ID (for presence channel scoping)
 * @param options - Configuration options
 */
export function useAdminMessaging(
  adminProfileId: string | null,
  schoolId: string | null,
  options?: UseAdminMessagingOptions
): UseAdminMessagingReturn;
