/**
 * Lesson Reactions Hook
 * Fetches and toggles reactions via API route (bypasses RLS)
 */

import { useEffect, useState, useCallback } from 'react';

export type LessonReactionType = 'like' | 'helpful' | 'confused' | 'love' | 'celebrate';

interface ReactionCounts {
  [key: string]: number;
}

interface UseLessonReactionsReturn {
  counts: ReactionCounts;
  myReaction: LessonReactionType | null;
  toggleReaction: (type: LessonReactionType) => Promise<void>;
  isLoading: boolean;
}

export function useLessonReactions(
  lessonId: string,
  studentId?: string
): UseLessonReactionsReturn {
  const [counts, setCounts] = useState<ReactionCounts>({});
  const [myReaction, setMyReaction] = useState<LessonReactionType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReactions = useCallback(async () => {
    if (!lessonId) return;

    try {
      const response = await fetch(`/api/student/lesson-reactions?lessonId=${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setCounts(data.counts || {});
        setMyReaction(data.myReaction || null);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const toggleReaction = async (type: LessonReactionType) => {
    if (!studentId) return;

    // Optimistic update
    const prevCounts = { ...counts };
    const prevReaction = myReaction;

    if (myReaction === type) {
      // Removing reaction
      setCounts(prev => ({
        ...prev,
        [type]: Math.max((prev[type] || 0) - 1, 0),
      }));
      setMyReaction(null);
    } else {
      // Adding/changing reaction — use functional updater to avoid stale closure
      setCounts(prev => {
        const updated = { ...prev };
        if (myReaction) {
          updated[myReaction] = Math.max((updated[myReaction] || 0) - 1, 0);
        }
        updated[type] = (updated[type] || 0) + 1;
        return updated;
      });
      setMyReaction(type);
    }

    try {
      const response = await fetch('/api/student/lesson-reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          reactionType: type,
          remove: myReaction === type,
        }),
      });

      if (!response.ok) {
        // Rollback on failure
        setCounts(prevCounts);
        setMyReaction(prevReaction);
        console.error('Error toggling reaction:', await response.json());
      }
    } catch (error) {
      // Rollback on failure
      setCounts(prevCounts);
      setMyReaction(prevReaction);
      console.error('Error toggling reaction:', error);
    }
  };

  return {
    counts,
    myReaction,
    toggleReaction,
    isLoading,
  };
}
