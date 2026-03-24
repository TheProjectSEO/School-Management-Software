'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/utils/authFetch';
import { LiveSessionRoom } from '@/components/live-sessions/LiveSessionRoom';

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
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Fetch owner token on mount
  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await authFetch(`/api/teacher/live-sessions/${sessionId}/join-token`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to get session token');
        }
        const data = await res.json();
        setRoomUrl(data.roomUrl);
        setToken(data.token);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to session');
      } finally {
        setIsLoading(false);
      }
    }
    fetchToken();
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

      {/* Video iframe */}
      <div className="rounded-xl overflow-hidden border border-slate-200 bg-black" style={{ height: 'calc(100vh - 220px)', minHeight: '480px' }}>
        <LiveSessionRoom roomUrl={roomUrl} token={token} className="h-full" />
      </div>
    </div>
  );
}
