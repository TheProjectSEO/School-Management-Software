/**
 * Live Session Q&A Hook
 * Real-time questions and answers during live sessions
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { authFetch } from '@/lib/utils/authFetch';

export interface SessionQuestion {
  id: string;
  session_id: string;
  student_id: string;
  question: string;
  is_answered: boolean;
  answered_by: string | null;
  answer: string | null;
  upvotes: number;
  created_at: string;
  student_name?: string | null;
  answered_by_name?: string | null;
}

interface UseLiveSessionQAReturn {
  questions: SessionQuestion[];
  askQuestion: (question: string) => Promise<void>;
  upvoteQuestion: (questionId: string) => Promise<void>;
  isLoading: boolean;
}

export function useLiveSessionQA(
  sessionId: string
): UseLiveSessionQAReturn {
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch initial questions
  useEffect(() => {
    if (!sessionId) return;

    async function fetchQuestions() {
      try {
        const res = await authFetch(`/api/student/live-sessions/${sessionId}/questions`);
        if (res.ok) {
          const data = await res.json();
          setQuestions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuestions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`qa:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_questions',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchQuestions(); // re-fetch full list to get names
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_questions',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchQuestions(); // re-fetch on updates too
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);

  const askQuestion = async (question: string) => {
    try {
      const response = await authFetch(
        `/api/student/live-sessions/${sessionId}/questions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to ask question');
      }
    } catch (error) {
      console.error('Error asking question:', error);
      throw error;
    }
  };

  const upvoteQuestion = async (questionId: string) => {
    try {
      // Create upvote (will trigger auto-update via database trigger)
      const { error } = await supabase
        .from('session_question_upvotes')
        .insert({ question_id: questionId });

      if (error) throw error;
    } catch (error) {
      console.error('Error upvoting question:', error);
    }
  };

  return {
    questions,
    askQuestion,
    upvoteQuestion,
    isLoading,
  };
}
