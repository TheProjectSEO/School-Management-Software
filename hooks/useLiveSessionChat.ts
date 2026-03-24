import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { authFetch } from '@/lib/utils/authFetch';

export interface ChatMessage {
  id: string;
  session_id: string;
  profile_id: string;
  sender_name: string;
  sender_role: 'teacher' | 'student';
  content: string;
  created_at: string;
}

interface UseLiveSessionChatOptions {
  sessionId: string;
  role: 'student' | 'teacher';
}

export function useLiveSessionChat({ sessionId, role }: UseLiveSessionChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const apiBase =
    role === 'teacher'
      ? `/api/teacher/live-sessions/${sessionId}/messages`
      : `/api/student/live-sessions/${sessionId}/messages`;

  useEffect(() => {
    const supabase = createClient();

    // Load initial messages
    authFetch(apiBase)
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => {
        setMessages(data.messages || []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    // Subscribe to new messages via Supabase Realtime
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates if optimistic update was added
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as ChatMessage];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, apiBase]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    await authFetch(apiBase, {
      method: 'POST',
      body: JSON.stringify({ content: content.trim() }),
    });
    // Realtime INSERT will add the message to state
  };

  return { messages, isLoading, sendMessage };
}
