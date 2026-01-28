'use client';

/**
 * Live Session Client Component
 * Manages all real-time features and interactions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LiveSessionRoom } from '@/components/live-sessions/LiveSessionRoom';
import { ReactionsBar } from '@/components/live-sessions/ReactionsBar';
import { QAPanel } from '@/components/live-sessions/QAPanel';
import { ParticipantsList } from '@/components/live-sessions/ParticipantsList';
import { RecordingIndicator } from '@/components/live-sessions/RecordingIndicator';
import { getClassroomTheme } from '@/lib/utils/classroom/theme';

interface LiveSessionClientProps {
  sessionId: string;
  gradeLevel: string;
  currentUser: {
    id: string;
    name: string;
  };
  sessionData: {
    title: string;
    description: string;
    courseName: string;
    courseCode: string;
    recording_enabled: boolean;
  };
}

export function LiveSessionClient({
  sessionId,
  gradeLevel,
  currentUser,
  sessionData,
}: LiveSessionClientProps) {
  const router = useRouter();
  const theme = getClassroomTheme(gradeLevel);
  const isPlayful = theme.type === 'playful';

  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Join session on mount
  useEffect(() => {
    async function joinSession() {
      try {
        const response = await fetch(`/api/live-sessions/${sessionId}/join`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to join session');
        }

        const data = await response.json();
        setRoomUrl(data.roomUrl);
        setToken(data.token);
        setIsJoining(false);
      } catch (err) {
        console.error('Error joining session:', err);
        setError(err instanceof Error ? err.message : 'Failed to join session');
        setIsJoining(false);
      }
    }

    joinSession();
  }, [sessionId]);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleLeave = () => {
    router.push('/subjects');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isJoining) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isPlayful ? 'bg-gradient-to-br from-purple-100 to-pink-100' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full ${isPlayful ? 'h-20 w-20 border-8 border-purple-500 border-t-pink-500' : 'h-16 w-16 border-4 border-blue-600 border-t-transparent'} mx-auto mb-4`}></div>
          <div className={`${theme.typography.headingSize} ${theme.typography.fontWeight} text-gray-800`}>
            {isPlayful ? '🚀 Joining the fun...' : 'Joining session...'}
          </div>
        </div>
      </div>
    );
  }

  if (error || !roomUrl || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">{isPlayful ? '😢' : '❌'}</div>
          <h1 className={`${theme.typography.headingSize} ${theme.typography.fontWeight} text-gray-800 mb-2`}>
            {isPlayful ? 'Oops! Something went wrong' : 'Unable to Join'}
          </h1>
          <p className="text-gray-600 mb-4">{error || 'Could not connect to session'}</p>
          <button
            onClick={() => router.push('/subjects')}
            className={`
              ${theme.spacing.buttonPadding}
              ${theme.spacing.borderRadius}
              ${isPlayful ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-blue-600'}
              text-white
              ${theme.typography.buttonSize}
              ${theme.typography.fontWeight}
              hover:opacity-90
              transition-opacity
            `}
          >
            {theme.language.leave}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isPlayful ? 'bg-gradient-to-br from-purple-50 to-pink-50' : 'bg-gray-50'} p-4`}>
      {/* Recording Indicator */}
      <RecordingIndicator
        isRecording={sessionData.recording_enabled}
        gradeLevel={gradeLevel}
      />

      {/* Header */}
      <div className={`${theme.spacing.borderRadius} ${theme.effects.shadows ? 'shadow-lg' : 'border border-gray-200'} bg-white p-4 mb-4`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className={`${theme.typography.headingSize} ${theme.typography.fontWeight} text-gray-800`}>
              {isPlayful ? '🎓 ' : ''}{sessionData.title}
            </h1>
            <p className="text-sm text-gray-600">
              {sessionData.courseName} ({sessionData.courseCode})
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`${theme.typography.bodySize} text-gray-600`}>
              {isPlayful ? '⏱️ ' : ''}
              {formatTime(elapsedTime)}
            </div>
            <button
              onClick={handleLeave}
              className={`
                ${theme.spacing.buttonPadding}
                ${theme.spacing.borderRadius}
                ${isPlayful ? 'bg-gradient-to-r from-red-400 to-pink-400 hover:from-red-500 hover:to-pink-500' : 'bg-red-600 hover:bg-red-700'}
                text-white
                ${theme.typography.buttonSize}
                ${theme.typography.fontWeight}
                ${theme.effects.shadows ? 'shadow-md hover:shadow-lg' : ''}
                transition-all
              `}
            >
              {theme.language.leave}
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Video Room - Full width on mobile, 2/3 on desktop */}
        <div className="lg:col-span-2">
          <div className={`${theme.spacing.borderRadius} overflow-hidden ${theme.effects.shadows ? 'shadow-xl' : 'border border-gray-200'}`} style={{ height: '500px' }}>
            <LiveSessionRoom
              roomUrl={roomUrl}
              token={token}
              onLeave={handleLeave}
              className="h-full"
            />
          </div>
        </div>

        {/* Participants */}
        <div>
          <ParticipantsList
            sessionId={sessionId}
            gradeLevel={gradeLevel}
            currentUser={currentUser}
          />
        </div>
      </div>

      {/* Reactions Bar */}
      <div className="mb-4">
        <ReactionsBar sessionId={sessionId} gradeLevel={gradeLevel} />
      </div>

      {/* Q&A Panel */}
      <div style={{ height: '400px' }}>
        <QAPanel sessionId={sessionId} gradeLevel={gradeLevel} />
      </div>
    </div>
  );
}
