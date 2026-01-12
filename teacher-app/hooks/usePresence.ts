"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Types
export interface PresenceState {
  profileId: string;
  status: "online" | "offline";
  lastSeen?: string;
}

interface PresencePayload {
  profile_id: string;
  status: "online" | "offline";
  online_at: string;
  presence_ref?: string; // Added by Supabase internally
}

interface UsePresenceOptions {
  /** Auto-track presence on mount */
  autoTrack?: boolean;
}

interface UsePresenceReturn {
  /** Map of profile IDs to their presence state */
  presenceMap: Map<string, PresenceState>;
  /** Check if a specific profile is online */
  isOnline: (profileId: string) => boolean;
  /** Get last seen time for a profile */
  getLastSeen: (profileId: string) => string | undefined;
  /** Whether connected to presence channel */
  isConnected: boolean;
  /** Start tracking presence */
  startTracking: () => void;
  /** Stop tracking presence */
  stopTracking: () => void;
}

/**
 * Hook for online/offline presence tracking using Supabase Presence
 * Automatically tracks when users join/leave and syncs state
 */
export function usePresence(
  profileId: string | null,
  schoolId: string | null,
  options: UsePresenceOptions = {}
): UsePresenceReturn {
  const { autoTrack = true } = options;

  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  // Check if a profile is online
  const isOnline = useCallback((checkProfileId: string): boolean => {
    const state = presenceMap.get(checkProfileId);
    return state?.status === "online";
  }, [presenceMap]);

  // Get last seen time
  const getLastSeen = useCallback((checkProfileId: string): string | undefined => {
    return presenceMap.get(checkProfileId)?.lastSeen;
  }, [presenceMap]);

  // Start tracking presence
  const startTracking = useCallback(() => {
    if (!profileId || !schoolId) return;

    // Already connected
    if (channelRef.current) return;

    const supabase = supabaseRef.current;
    const channelName = `presence:school:${schoolId}`;

    const channel = supabase
      .channel(channelName)
      .on("presence", { event: "sync" }, () => {
        // Get all presence state
        const state = channel.presenceState();
        const newMap = new Map<string, PresenceState>();

        Object.keys(state).forEach((key) => {
          const presences = state[key] as PresencePayload[];
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
        const presences = newPresences as PresencePayload[];
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
        const presences = leftPresences as PresencePayload[];
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
          setIsConnected(true);

          // Track our own presence
          await channel.track({
            profile_id: profileId,
            status: "online",
            online_at: new Date().toISOString(),
          } as PresencePayload);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
  }, [profileId, schoolId]);

  // Stop tracking presence
  const stopTracking = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Auto-track on mount if enabled
  useEffect(() => {
    if (autoTrack && profileId && schoolId) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [autoTrack, profileId, schoolId, startTracking, stopTracking]);

  return {
    presenceMap,
    isOnline,
    getLastSeen,
    isConnected,
    startTracking,
    stopTracking,
  };
}
