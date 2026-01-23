/**
 * Lesson Reactions Hook
 * Real-time reactions for individual lessons
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  const supabase = createClient();

  // Fetch initial reactions
  useEffect(() => {
    if (!lessonId) return;

    async function fetchReactions() {
      // Get all reactions for this lesson
      const { data: allReactions } = await supabase
        .from('lesson_reactions')
        .select('reaction_type, student_id')
        .eq('lesson_id', lessonId);

      if (allReactions) {
        const newCounts: ReactionCounts = {};
        allReactions.forEach((r) => {
          newCounts[r.reaction_type] = (newCounts[r.reaction_type] || 0) + 1;

          // Check if this is the current student's reaction
          if (studentId && r.student_id === studentId) {
            setMyReaction(r.reaction_type as LessonReactionType);
          }
        });
        setCounts(newCounts);
      }
      setIsLoading(false);
    }

    fetchReactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`lesson-reactions:${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_reactions',
          filter: `lesson_id=eq.${lessonId}`,
        },
        () => {
          // Refetch on any change
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [lessonId, studentId]);

  const toggleReaction = async (type: LessonReactionType) => {
    if (!studentId) return;

    try {
      // If same reaction, remove it
      if (myReaction === type) {
        const { error } = await supabase
          .from('lesson_reactions')
          .delete()
          .eq('lesson_id', lessonId)
          .eq('student_id', studentId);

        if (error) throw error;
        setMyReaction(null);
      } else {
        // Upsert new reaction (will replace existing due to UNIQUE constraint)
        const { error } = await supabase
          .from('lesson_reactions')
          .upsert(
            {
              lesson_id: lessonId,
              student_id: studentId,
              reaction_type: type,
            },
            {
              onConflict: 'lesson_id,student_id',
            }
          );

        if (error) throw error;
        setMyReaction(type);
      }
    } catch (error) {
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
