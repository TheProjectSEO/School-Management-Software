'use client';

import { useState, useEffect, useRef } from 'react';
import { useLiveSessionChat } from '@/hooks/useLiveSessionChat';
import { useAuth } from '@/hooks/useAuth';
import { getClassroomTheme } from '@/lib/utils/classroom/theme';

interface SessionChatPanelProps {
  sessionId: string;
  gradeLevel: string;
  role: 'student' | 'teacher';
}

export function SessionChatPanel({ sessionId, gradeLevel, role }: SessionChatPanelProps) {
  const { user } = useAuth();
  const theme = getClassroomTheme(gradeLevel);
  const isPlayful = theme.type === 'playful';
  const { messages, isLoading, sendMessage } = useLiveSessionChat({ sessionId, role });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentProfileId = user?.profileId;

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(input);
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 shrink-0 ${isPlayful ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20' : 'bg-slate-50 dark:bg-slate-800/80'}`}>
        <span className="material-symbols-outlined text-[20px] text-slate-400">forum</span>
        <span className={`font-semibold text-sm ${isPlayful ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-white'}`}>
          Session Chat
        </span>
        <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
          {messages.length}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`animate-spin rounded-full h-6 w-6 border-2 border-t-transparent ${isPlayful ? 'border-purple-500' : 'border-[#7B1113]'}`} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-8">
            <span className="material-symbols-outlined text-4xl">chat_bubble_outline</span>
            <p className="text-sm text-center">
              {isPlayful ? '👋 Be the first to say hi!' : 'No messages yet. Start the conversation!'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.profile_id === currentProfileId;
            const isTeacher = msg.sender_role === 'teacher';
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                    isTeacher
                      ? 'bg-[#7B1113] text-white'
                      : isPlayful
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {msg.sender_name.charAt(0).toUpperCase()}
                </div>

                {/* Bubble */}
                <div className={`max-w-[78%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {/* Name + time row */}
                  <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-[11px] font-semibold ${isTeacher ? 'text-[#7B1113] dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {isOwn ? 'You' : msg.sender_name}
                    </span>
                    {isTeacher && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#7B1113] text-white rounded-full font-bold leading-none">
                        Teacher
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`px-3 py-2 text-sm leading-snug break-words ${
                      isOwn
                        ? isPlayful
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl rounded-tr-sm'
                          : 'bg-[#7B1113] text-white rounded-2xl rounded-tr-sm'
                        : isTeacher
                          ? 'bg-red-50 text-red-900 border border-red-200 rounded-2xl rounded-tl-sm dark:bg-red-900/20 dark:text-red-100 dark:border-red-800/50'
                          : 'bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={500}
          className={`flex-1 text-sm px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 ${
            isPlayful
              ? 'border-purple-200 focus:ring-purple-300 focus:border-purple-400'
              : 'border-slate-200 focus:ring-[#7B1113]/30 focus:border-[#7B1113]'
          }`}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className={`flex items-center justify-center w-9 h-9 rounded-xl text-white transition-all disabled:opacity-40 shrink-0 ${
            isPlayful
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90'
              : 'bg-[#7B1113] hover:bg-[#5a0c0e]'
          }`}
        >
          <span className={`material-symbols-outlined text-[17px] ${sending ? 'animate-spin' : ''}`}>
            {sending ? 'autorenew' : 'send'}
          </span>
        </button>
      </form>
    </div>
  );
}
