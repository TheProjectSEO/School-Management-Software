/**
 * Live Reactions Hook
 * Real-time emoji reactions during live sessions
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ReactionType =
  | 'raise_hand'
  | 'thumbs_up'
  | 'clap'
  | 'confused'
  | 'speed_up'
  | 'slow_down';

interface ReactionCounts {
  [key: string]: number;
}

interface UseLiveReactionsReturn {
  counts: ReactionCounts;
  total: number;
  sendReaction: (type: ReactionType) => Promise<void>;
  isLoading: boolean;
}

export function useLiveReactions(
  sessionId: string
): UseLiveReactionsReturn {
  const [counts, setCounts] = useState<ReactionCounts>({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch initial reactions
  useEffect(() => {
    if (!sessionId) return;

    async function fetchReactions() {
      const { data, error } = await supabase
        .from('session_reactions')
        .select('reaction_type')
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString());

      if (!error && data) {
        const newCounts: ReactionCounts = {};
        data.forEach((r) => {
          newCounts[r.reaction_type] = (newCounts[r.reaction_type] || 0) + 1;
        });
        setCounts(newCounts);
        setTotal(data.length);
      }
      setIsLoading(false);
    }

    fetchReactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`reactions:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_reactions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const reaction = payload.new as { reaction_type: string };
          setCounts((prev) => ({
            ...prev,
            [reaction.reaction_type]: (prev[reaction.reaction_type] || 0) + 1,
          }));
          setTotal((prev) => prev + 1);
        }
      )
      .subscribe();

    // Cleanup expired reactions every 2 seconds
    const cleanupInterval = setInterval(() => {
      fetchReactions();
    }, 2000);

    return () => {
      channel.unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [sessionId]);

  const sendReaction = async (type: ReactionType) => {
    try {
      const response = await fetch(`/api/live-sessions/${sessionId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction_type: type }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reaction');
      }
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  return {
    counts,
    total,
    sendReaction,
    isLoading,
  };
}
