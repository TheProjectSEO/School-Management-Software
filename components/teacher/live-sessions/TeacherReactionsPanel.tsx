'use client';

import { useLiveReactions } from '@/hooks/useLiveReactions';

interface TeacherReactionsPanelProps {
  sessionId: string;
}

const REACTIONS = [
  { type: 'raise_hand',  emoji: '✋', label: 'Raise Hand',  alert: false },
  { type: 'thumbs_up',   emoji: '👍', label: 'Got It',      alert: false },
  { type: 'clap',        emoji: '👏', label: 'Great',       alert: false },
  { type: 'confused',    emoji: '🤔', label: 'Confused',    alert: true  },
  { type: 'speed_up',    emoji: '⚡', label: 'Speed Up',    alert: true  },
  { type: 'slow_down',   emoji: '🐢', label: 'Slow Down',   alert: true  },
] as const;

export function TeacherReactionsPanel({ sessionId }: TeacherReactionsPanelProps) {
  const { counts, total } = useLiveReactions(sessionId);

  // Attention signals — confused / speed_up / slow_down with any count
  const alertCount = REACTIONS.filter(r => r.alert).reduce((sum, r) => sum + (counts[r.type] || 0), 0);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-slate-50 dark:bg-slate-800/80">
        <span className="material-symbols-outlined text-[20px] text-slate-400">mood</span>
        <span className="font-semibold text-sm text-slate-700 dark:text-white">Student Reactions</span>
        <div className="ml-auto flex items-center gap-1.5">
          {alertCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Needs attention
            </span>
          )}
          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
            {total}
          </span>
        </div>
      </div>

      {/* Reactions grid */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-8">
            <span className="material-symbols-outlined text-4xl">sentiment_satisfied</span>
            <p className="text-sm text-center">No active reactions</p>
            <p className="text-xs text-slate-300 text-center">Students can react during the session</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {REACTIONS.map(({ type, emoji, label, alert }) => {
              const count = counts[type] || 0;
              const isActive = count > 0;
              return (
                <div
                  key={type}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
                    isActive
                      ? alert
                        ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50'
                        : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700/50'
                      : 'bg-slate-50 border-slate-100 dark:bg-slate-700/30 dark:border-slate-600/30 opacity-40'
                  }`}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  <span className={`flex-1 text-xs font-medium truncate ${
                    isActive
                      ? 'text-slate-700 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {label}
                  </span>
                  {count > 0 && (
                    <span className={`text-sm font-bold shrink-0 tabular-nums ${
                      alert ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 border-t border-slate-100 dark:border-slate-700 shrink-0">
        <p className="text-xs text-slate-400 text-center">
          {total > 0 ? 'Reactions expire after 10 seconds' : 'Live — updates automatically'}
        </p>
      </div>
    </div>
  );
}
