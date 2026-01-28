"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";

// ============================================================================
// TYPES
// ============================================================================

export interface AdminMessage {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  body: string;
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

interface UseAdminMessagingOptions {
  /** Play sound on new message */
  playSound?: boolean;
  /** Callback when a new message arrives */
  onNewMessage?: (message: AdminMessage) => void;
  /** Callback when message status changes (read receipt) */
  onMessageRead?: (messageId: string) => void;
  /** Callback when conversation list updates */
  onConversationUpdate?: (update: ConversationUpdate) => void;
}

interface UseAdminMessagingReturn {
  /** Subscribe to a specific conversation with a user */
  subscribeToConversation: (userProfileId: string) => void;
  /** Unsubscribe from current conversation */
  unsubscribeFromConversation: () => void;
  /** Subscribe to all conversation updates (for conversation list) */
  subscribeToConversations: () => void;
  /** Unsubscribe from conversation list updates */
  unsubscribeFromConversations: () => void;
  /** Latest new message received */
  newMessage: AdminMessage | null;
  /** Conversation updates (new messages, read receipts) */
  conversationUpdates: ConversationUpdate[];
  /** Map of profile IDs to their presence state */
  presenceMap: Map<string, PresenceState>;
  /** Whether subscribed to a specific conversation */
  isConversationSubscribed: boolean;
  /** Whether subscribed to conversation list */
  isConversationsSubscribed: boolean;
  /** Connection error */
  error: string | null;
  /** Clear new message state */
  clearNewMessage: () => void;
  /** Clear conversation updates */
  clearConversationUpdates: () => void;
  /** Check if a specific profile is online */
  isOnline: (profileId: string) => boolean;
  /** Get last seen time for a profile */
  getLastSeen: (profileId: string) => string | undefined;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Comprehensive hook for admin real-time messaging using Supabase Realtime
 *
 * Features:
 * - Subscribe to specific conversation updates (new messages, read receipts)
 * - Subscribe to all conversation updates (for conversation list)
 * - Presence tracking (online/offline status)
 * - Automatic cleanup on unmount
 * - Sound notifications
 *
 * @param adminProfileId - The admin's profile ID
 * @param schoolId - The school ID (for presence channel scoping)
 * @param options - Configuration options
 */
export function useAdminMessaging(
  adminProfileId: string | null,
  schoolId: string | null,
  options: UseAdminMessagingOptions = {}
): UseAdminMessagingReturn {
  const { playSound = true, onNewMessage, onMessageRead, onConversationUpdate } = options;

  // State
  const [newMessage, setNewMessage] = useState<AdminMessage | null>(null);
  const [conversationUpdates, setConversationUpdates] = useState<ConversationUpdate[]>([]);
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceState>>(new Map());
  const [isConversationSubscribed, setIsConversationSubscribed] = useState(false);
  const [isConversationsSubscribed, setIsConversationsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const conversationChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationsChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUserRef = useRef<string | null>(null);

  // ============================================================================
  // NOTIFICATION SOUND
  // ============================================================================

  // Initialize notification sound
  useEffect(() => {
    if (typeof window !== "undefined" && playSound) {
      // Simple notification sound (base64 encoded WAV)
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRU5gLKqeUs4R3W4wJ1yOyc0drW7pGwjC0WKq6ZqQxseYpK3sHkuDDOGq7BxMRgYY5W8sXUtEzGHsLJ1MxkYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbJ2NBgYYpW9snYuEjKJsbI="
      );
      audioRef.current.volume = 0.3;
    }
  }, [playSound]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && playSound) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore errors (e.g., user hasn't interacted with page yet)
      });
    }
  }, [playSound]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const clearNewMessage = useCallback(() => {
    setNewMessage(null);
  }, []);

  const clearConversationUpdates = useCallback(() => {
    setConversationUpdates([]);
  }, []);

  const isOnline = useCallback(
    (profileId: string): boolean => {
      const state = presenceMap.get(profileId);
      return state?.status === "online";
    },
    [presenceMap]
  );

  const getLastSeen = useCallback(
    (profileId: string): string | undefined => {
      return presenceMap.get(profileId)?.lastSeen;
    },
    [presenceMap]
  );

  // ============================================================================
  // SUBSCRIBE TO SPECIFIC CONVERSATION
  // ============================================================================

  const subscribeToConversation = useCallback(
    (userProfileId: string) => {
      if (!adminProfileId) {
        console.warn("Cannot subscribe: adminProfileId is null");
        return;
      }

      // If already subscribed to this user, don't re-subscribe
      if (currentUserRef.current === userProfileId && conversationChannelRef.current) {
        return;
      }

      // Clean up existing subscription
      if (conversationChannelRef.current) {
        supabaseRef.current.removeChannel(conversationChannelRef.current);
      }

      currentUserRef.current = userProfileId;
      const supabase = supabaseRef.current;

      // Create channel for this specific conversation
      const channel = supabase
        .channel(`admin_conversation:${adminProfileId}:${userProfileId}`)
        // Listen for new messages TO admin FROM this user
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "teacher_direct_messages",
            filter: `to_profile_id=eq.${adminProfileId}`,
          },
          async (payload: RealtimePostgresInsertPayload<AdminMessage>) => {
            const message = payload.new as AdminMessage;

            // Only process if from current conversation partner
            if (message.from_profile_id === userProfileId) {
              // Enrich with profile data
              const { data: profiles } = await supabase
                .from("school_profiles")
                .select("id, full_name, email, avatar_url")
                .in("id", [message.from_profile_id, message.to_profile_id]);

              const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

              const enrichedMessage: AdminMessage = {
                ...message,
                sender: profileMap.get(message.from_profile_id) as any,
                receiver: profileMap.get(message.to_profile_id) as any,
              };

              setNewMessage(enrichedMessage);
              playNotificationSound();
              onNewMessage?.(enrichedMessage);
            }
          }
        )
        // Listen for updates to messages (read receipts)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "teacher_direct_messages",
            filter: `from_profile_id=eq.${adminProfileId}`,
          },
          (payload: RealtimePostgresUpdatePayload<AdminMessage>) => {
            const message = payload.new as AdminMessage;
            const oldMessage = payload.old as Partial<AdminMessage>;

            // Only process if to current conversation partner
            if (message.to_profile_id === userProfileId) {
              // Check if read status changed
              if (oldMessage.is_read === false && message.is_read === true) {
                onMessageRead?.(message.id);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsConversationSubscribed(true);
            setError(null);
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            setIsConversationSubscribed(false);
            setError("Connection lost to conversation");
          }
        });

      conversationChannelRef.current = channel;
    },
    [adminProfileId, playNotificationSound, onNewMessage, onMessageRead]
  );

  const unsubscribeFromConversation = useCallback(() => {
    if (conversationChannelRef.current) {
      supabaseRef.current.removeChannel(conversationChannelRef.current);
      conversationChannelRef.current = null;
      currentUserRef.current = null;
      setIsConversationSubscribed(false);
    }
  }, []);

  // ============================================================================
  // SUBSCRIBE TO ALL CONVERSATIONS (for conversation list)
  // ============================================================================

  const subscribeToConversations = useCallback(() => {
    if (!adminProfileId) {
      console.warn("Cannot subscribe: adminProfileId is null");
      return;
    }

    // Already subscribed
    if (conversationsChannelRef.current) {
      return;
    }

    const supabase = supabaseRef.current;

    // Create channel for all admin messages
    const channel = supabase
      .channel(`admin_messages:${adminProfileId}`)
      // Listen for ANY new message where admin is sender or receiver
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "teacher_direct_messages",
          filter: `or(from_profile_id.eq.${adminProfileId},to_profile_id.eq.${adminProfileId})`,
        },
        async (payload: RealtimePostgresInsertPayload<AdminMessage>) => {
          const message = payload.new as AdminMessage;

          // Enrich with profile data
          const { data: profiles } = await supabase
            .from("school_profiles")
            .select("id, full_name, email, avatar_url")
            .in("id", [message.from_profile_id, message.to_profile_id]);

          const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

          const enrichedMessage: AdminMessage = {
            ...message,
            sender: profileMap.get(message.from_profile_id) as any,
            receiver: profileMap.get(message.to_profile_id) as any,
          };

          // Determine conversation partner
          const partnerId =
            message.from_profile_id === adminProfileId
              ? message.to_profile_id
              : message.from_profile_id;

          const update: ConversationUpdate = {
            profile_id: partnerId,
            message: enrichedMessage,
            type: "new_message",
          };

          setConversationUpdates((prev) => [...prev, update]);
          onConversationUpdate?.(update);

          // Play sound if message is FROM someone else
          if (message.to_profile_id === adminProfileId) {
            playNotificationSound();
          }
        }
      )
      // Listen for read receipts
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teacher_direct_messages",
          filter: `or(from_profile_id.eq.${adminProfileId},to_profile_id.eq.${adminProfileId})`,
        },
        (payload: RealtimePostgresUpdatePayload<AdminMessage>) => {
          const message = payload.new as AdminMessage;
          const oldMessage = payload.old as Partial<AdminMessage>;

          // Check if read status changed
          if (oldMessage.is_read === false && message.is_read === true) {
            const partnerId =
              message.from_profile_id === adminProfileId
                ? message.to_profile_id
                : message.from_profile_id;

            const update: ConversationUpdate = {
              profile_id: partnerId,
              message: message,
              type: "message_read",
            };

            setConversationUpdates((prev) => [...prev, update]);
            onConversationUpdate?.(update);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConversationsSubscribed(true);
          setError(null);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConversationsSubscribed(false);
          setError("Connection lost to conversations");
        }
      });

    conversationsChannelRef.current = channel;
  }, [adminProfileId, playNotificationSound, onConversationUpdate]);

  const unsubscribeFromConversations = useCallback(() => {
    if (conversationsChannelRef.current) {
      supabaseRef.current.removeChannel(conversationsChannelRef.current);
      conversationsChannelRef.current = null;
      setIsConversationsSubscribed(false);
    }
  }, []);

  // ============================================================================
  // PRESENCE TRACKING
  // ============================================================================

  // Auto-track presence when adminProfileId and schoolId are available
  useEffect(() => {
    if (!adminProfileId || !schoolId) return;

    // Already tracking
    if (presenceChannelRef.current) return;

    const supabase = supabaseRef.current;
    const channelName = `presence:school:${schoolId}`;

    const channel = supabase
      .channel(channelName)
      .on("presence", { event: "sync" }, () => {
        // Get all presence state
        const state = channel.presenceState();
        const newMap = new Map<string, PresenceState>();

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const latest = presences[presences.length - 1];
            newMap.set(latest.profile_id, {
              profileId: latest.profile_id,
              status: "online",
              lastSeen: latest.online_at,
            });
          }
        });

        setPresenceMap(newMap);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const presences = newPresences as any[];
        setPresenceMap((prev) => {
          const updated = new Map(prev);
          presences.forEach((p) => {
            updated.set(p.profile_id, {
              profileId: p.profile_id,
              status: "online",
              lastSeen: p.online_at,
            });
          });
          return updated;
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const presences = leftPresences as any[];
        setPresenceMap((prev) => {
          const updated = new Map(prev);
          presences.forEach((p) => {
            updated.set(p.profile_id, {
              profileId: p.profile_id,
              status: "offline",
              lastSeen: new Date().toISOString(),
            });
          });
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track our own presence
          await channel.track({
            profile_id: adminProfileId,
            status: "online",
            online_at: new Date().toISOString(),
            role: "admin",
          });
        }
      });

    presenceChannelRef.current = channel;

    // Cleanup
    return () => {
      if (presenceChannelRef.current) {
        supabaseRef.current.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [adminProfileId, schoolId]);

  // ============================================================================
  // CLEANUP ON UNMOUNT
  // ============================================================================

  useEffect(() => {
    return () => {
      if (conversationChannelRef.current) {
        supabaseRef.current.removeChannel(conversationChannelRef.current);
      }
      if (conversationsChannelRef.current) {
        supabaseRef.current.removeChannel(conversationsChannelRef.current);
      }
      if (presenceChannelRef.current) {
        supabaseRef.current.removeChannel(presenceChannelRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    subscribeToConversation,
    unsubscribeFromConversation,
    subscribeToConversations,
    unsubscribeFromConversations,
    newMessage,
    conversationUpdates,
    presenceMap,
    isConversationSubscribed,
    isConversationsSubscribed,
    error,
    clearNewMessage,
    clearConversationUpdates,
    isOnline,
    getLastSeen,
  };
}
