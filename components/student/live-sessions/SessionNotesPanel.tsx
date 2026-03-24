'use client';

import { useState, useEffect, useRef } from 'react';
import { authFetch } from '@/lib/utils/authFetch';
import { getClassroomTheme } from '@/lib/utils/classroom/theme';

interface SessionNotesPanelProps {
  sessionId: string;
  gradeLevel: string;
  role: 'student' | 'teacher';
}

export function SessionNotesPanel({ sessionId, gradeLevel, role }: SessionNotesPanelProps) {
  const theme = getClassroomTheme(gradeLevel);
  const isPlayful = theme.type === 'playful';
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiBase =
    role === 'teacher'
      ? `/api/teacher/live-sessions/${sessionId}/notes`
      : `/api/student/live-sessions/${sessionId}/notes`;

  // Load existing notes on mount
  useEffect(() => {
    authFetch(apiBase)
      .then((res) => (res.ok ? res.json() : { content: '' }))
      .then((data) => {
        setContent(data.content || '');
        if (data.updated_at) setLastSaved(new Date(data.updated_at));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [apiBase]);

  // Auto-save with 2s debounce
  const handleChange = (value: string) => {
    setContent(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await authFetch(apiBase, {
          method: 'POST',
          body: JSON.stringify({ content: value }),
        });
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    }, 2000);
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 shrink-0 ${isPlayful ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20' : 'bg-slate-50 dark:bg-slate-800/80'}`}>
        <span className="material-symbols-outlined text-[20px] text-slate-400">edit_note</span>
        <span className={`font-semibold text-sm ${isPlayful ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-white'}`}>
          My Notes
        </span>
        <span className="text-xs text-slate-400 ml-1">(private)</span>

        {/* Save status */}
        <div className="ml-auto flex items-center gap-1 text-xs">
          {isSaving ? (
            <span className="flex items-center gap-1 text-slate-400">
              <span className="material-symbols-outlined text-[13px] animate-spin">autorenew</span>
              Saving…
            </span>
          ) : lastSaved ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              Saved
            </span>
          ) : null}
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 p-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`animate-spin rounded-full h-6 w-6 border-2 border-t-transparent ${isPlayful ? 'border-amber-500' : 'border-[#7B1113]'}`} />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={
              isPlayful
                ? '✏️ Jot down your notes here… only you can see these!'
                : 'Take notes here… only you can see these.'
            }
            className="w-full h-full resize-none text-sm leading-relaxed focus:outline-none bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-100 dark:border-slate-700 shrink-0">
        <span className="text-xs text-slate-400">
          {isPlayful ? '🔒 Visible only to you' : 'Visible only to you'}
        </span>
        <span className="text-xs text-slate-400">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
      </div>
    </div>
  );
}
