"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Types
export interface TypingState {
  isTyping: boolean;
  profileId: string;
  profileName?: string;
  timestamp: number;
}

interface TypingPayload {
  from_profile_id: string;
  from_name?: string;
  is_typing: boolean;
  timestamp: number;
}

interface UseTypingIndicatorOptions {
  /** Debounce delay for notifyTyping in ms */
  debounceMs?: number;
  /** Typing expiry time in ms (auto-expire after this) */
  expiryMs?: number;
}

interface UseTypingIndicatorReturn {
  /** Whether the partner is currently typing */
  isPartnerTyping: boolean;
  /** Partner's typing state */
  partnerTypingState: TypingState | null;
  /** Call this when user starts/stops typing */
  notifyTyping: (isTyping: boolean) => void;
  /** Whether connected to typing channel */
  isConnected: boolean;
  /** Connect to typing channel for a conversation */
  connect: (partnerProfileId: string, myName?: string) => void;
  /** Disconnect from typing channel */
  disconnect: () => void;
}

/**
 * Hook for typing indicators using Supabase Broadcast
 * Typing events are ephemeral - no database storage
 */
export function useTypingIndicator(
  profileId: string | null,
  options: UseTypingIndicatorOptions = {}
): UseTypingIndicatorReturn {
  const { debounceMs = 300, expiryMs = 3000 } = options;

  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerTypingState, setPartnerTypingState] = useState<TypingState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const partnerIdRef = useRef<string | null>(null);
  const myNameRef = useRef<string | undefined>(undefined);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotifyRef = useRef<number>(0);

  // Generate consistent channel name (sorted profile IDs)
  const getChannelName = useCallback((id1: string, id2: string) => {
    const sorted = [id1, id2].sort();
    return `typing:${sorted[0]}:${sorted[1]}`;
  }, []);

  // Clear typing state after expiry
  const clearTypingAfterExpiry = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
    }
    expiryTimerRef.current = setTimeout(() => {
      setIsPartnerTyping(false);
      setPartnerTypingState(null);
    }, expiryMs);
  }, [expiryMs]);

  // Connect to typing channel
  const connect = useCallback((partnerProfileId: string, myName?: string) => {
    if (!profileId) return;

    // Already connected to this partner
    if (partnerIdRef.current === partnerProfileId && channelRef.current) {
      return;
    }

    // Disconnect existing
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
    }

    partnerIdRef.current = partnerProfileId;
    myNameRef.current = myName;
    const supabase = supabaseRef.current;
    const channelName = getChannelName(profileId, partnerProfileId);

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as TypingPayload;

        // Ignore our own typing events
        if (data.from_profile_id === profileId) return;

        if (data.is_typing) {
          setIsPartnerTyping(true);
          setPartnerTypingState({
            isTyping: true,
            profileId: data.from_profile_id,
            profileName: data.from_name,
            timestamp: data.timestamp,
          });
          clearTypingAfterExpiry();
        } else {
          setIsPartnerTyping(false);
          setPartnerTypingState(null);
          if (expiryTimerRef.current) {
            clearTimeout(expiryTimerRef.current);
          }
        }
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;
  }, [profileId, getChannelName, clearTypingAfterExpiry]);

  // Disconnect from typing channel
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
      partnerIdRef.current = null;
      setIsConnected(false);
      setIsPartnerTyping(false);
      setPartnerTypingState(null);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
    }
  }, []);

  // Notify partner that we're typing (debounced)
  const notifyTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !profileId) return;

    const now = Date.now();

    // Debounce: don't send more often than debounceMs
    if (isTyping && now - lastNotifyRef.current < debounceMs) {
      // Clear any pending timer and set a new one
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        notifyTyping(true);
      }, debounceMs);
      return;
    }

    lastNotifyRef.current = now;

    // Send typing event via broadcast
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        from_profile_id: profileId,
        from_name: myNameRef.current,
        is_typing: isTyping,
        timestamp: now,
      } as TypingPayload,
    });

    // Auto-send stop typing after 3 seconds of not calling notifyTyping
    if (isTyping) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (channelRef.current && profileId) {
          channelRef.current.send({
            type: "broadcast",
            event: "typing",
            payload: {
              from_profile_id: profileId,
              from_name: myNameRef.current,
              is_typing: false,
              timestamp: Date.now(),
            } as TypingPayload,
          });
        }
      }, expiryMs);
    }
  }, [profileId, debounceMs, expiryMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isPartnerTyping,
    partnerTypingState,
    notifyTyping,
    isConnected,
    connect,
    disconnect,
  };
}
