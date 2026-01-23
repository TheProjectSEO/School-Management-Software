/**
 * Live Session Presence Hook
 * Tracks who's online in a live session using Supabase Presence
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Participant {
  userId: string;
  userName: string;
  joinedAt: string;
}

interface PresenceState {
  participants: Participant[];
  count: number;
  isLoading: boolean;
}

export function useLiveSessionPresence(sessionId: string, currentUser?: {
  id: string;
  name: string;
}): PresenceState {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId) return;

    const channel: RealtimeChannel = supabase.channel(
      `session-presence:${sessionId}`,
      {
        config: {
          presence: {
            key: currentUser?.id || 'anonymous',
          },
        },
      }
    );

    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const participantList: Participant[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          presences.forEach((presence) => {
            participantList.push({
              userId: presence.userId,
              userName: presence.userName,
              joinedAt: presence.joinedAt,
            });
          });
        });

        setParticipants(participantList);
        setIsLoading(false);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUser) {
          // Track this user's presence
          await channel.track({
            userId: currentUser.id,
            userName: currentUser.name,
            joinedAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, currentUser?.id, currentUser?.name]);

  return {
    participants,
    count: participants.length,
    isLoading,
  };
}
