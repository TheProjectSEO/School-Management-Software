'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/utils/authFetch';
import { LiveSessionRoom } from '@/components/live-sessions/LiveSessionRoom';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { SessionChatPanel } from '@/components/live-sessions/SessionChatPanel';
import { SessionNotesPanel } from '@/components/live-sessions/SessionNotesPanel';

interface TeacherLiveSessionClientProps {
  sessionId: string;
  sessionData: {
    title: string;
    courseName: string;
    recording_enabled: boolean;
  };
}

export function TeacherLiveSessionClient({
  sessionId,
  sessionData,
}: TeacherLiveSessionClientProps) {
  const router = useRouter();
  const { session: ctxSession, setSession, clearSession, isFloating, setFloating } = useLiveSession();
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');

  // Fetch owner token on mount — skip if context already has this session active
  // (happens when returning to the page while floating, or after client-side navigation)
  useEffect(() => {
    if (ctxSession?.sessionId === sessionId) {
      setRoomUrl(ctxSession.roomUrl);
      setToken(ctxSession.token);
      setIsLoading(false);
      return;
    }

    async function fetchToken() {
      try {
        const res = await authFetch(`/api/teacher/live-sessions/${sessionId}/join-token`);
        if (!res.ok) {
          let message = `Server error ${res.status}`;
          try { const e = await res.json(); message = e.error || message; } catch {}
          throw new Error(message);
        }
        const data = await res.json();
        setRoomUrl(data.roomUrl);
        setToken(data.token);
        setSession({ sessionId, roomUrl: data.roomUrl, token: data.token, title: sessionData.title });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to session');
      } finally {
        setIsLoading(false);
      }
    }
    fetchToken();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndSession = async () => {
    if (!confirm('End this session? Recording will be saved.')) return;
    setIsEnding(true);
    try {
      await authFetch(`/api/teacher/live-sessions/${sessionId}/end`, { method: 'POST' });
      clearSession();
      router.push('/teacher/live-sessions');
    } catch {
      setIsEnding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#7B1113] border-t-transparent mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Connecting to session...</p>
        </div>
      </div>
    );
  }

  if (error || !roomUrl || !token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Unable to Join</h1>
          <p className="text-slate-600 mb-4">{error || 'Could not connect to session room'}</p>
          <button
            onClick={() => router.push('/teacher/live-sessions')}
            className="px-4 py-2 bg-[#7B1113] text-white rounded-lg text-sm font-medium hover:bg-[#5a0c0e] transition-colors"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-xl border border-slate-200 p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
              LIVE
            </span>
            {sessionData.recording_enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                <span className="material-symbols-outlined text-[14px]">radio_button_checked</span>
                Recording
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-slate-900">{sessionData.title}</h1>
          <p className="text-sm text-slate-500">{sessionData.courseName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 font-mono">{formatTime(elapsedTime)}</span>
          <button
            onClick={handleEndSession}
            disabled={isEnding}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">call_end</span>
            {isEnding ? 'Ending...' : 'End Session'}
          </button>
        </div>
      </div>

      {/* Video + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 180px)', minHeight: '520px' }}>
        {/* Video — 2/3 width on desktop */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden border border-slate-200 bg-black h-full">
          {isFloating ? (
            <div className="flex flex-col items-center justify-center h-full bg-slate-900 gap-3">
              <span className="material-symbols-outlined text-5xl text-slate-400">picture_in_picture_alt</span>
              <p className="text-slate-400 text-sm">Video is floating</p>
              <button
                onClick={() => setFloating(false)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
              >
                Bring back
              </button>
            </div>
          ) : (
            <LiveSessionRoom roomUrl={roomUrl} token={token} className="h-full" />
          )}
        </div>

        {/* Side panel — 1/3 width on desktop */}
        <div className="flex flex-col h-full min-h-[400px] lg:min-h-0">
          {/* Tab bar */}
          <div className="flex gap-1 mb-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
            {(['chat', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-700 text-[#7B1113] shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab === 'chat' ? 'Chat' : 'Notes'}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="flex-1 min-h-0">
            {activeTab === 'chat' && <SessionChatPanel sessionId={sessionId} gradeLevel="10" role="teacher" />}
            {activeTab === 'notes' && <SessionNotesPanel sessionId={sessionId} gradeLevel="10" role="teacher" />}
          </div>
        </div>
      </div>
    </div>
  );
}
