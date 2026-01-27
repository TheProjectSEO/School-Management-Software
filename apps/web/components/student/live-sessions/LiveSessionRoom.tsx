'use client';

/**
 * Live Session Room Component
 * Embeds Daily.co video conferencing
 */

import { useEffect, useRef, useState } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

interface LiveSessionRoomProps {
  roomUrl: string;
  token: string;
  onLeave?: () => void;
  onJoined?: () => void;
  className?: string;
}

export function LiveSessionRoom({
  roomUrl,
  token,
  onLeave,
  onJoined,
  className = '',
}: LiveSessionRoomProps) {
  const callFrameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isJoining, setIsJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !roomUrl || !token) return;

    // Create Daily call frame
    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '12px',
      },
      showLeaveButton: true,
      showFullscreenButton: true,
    });

    callFrameRef.current = callFrame;

    // Event handlers
    callFrame
      .on('joined-meeting', () => {
        setIsJoining(false);
        onJoined?.();
      })
      .on('left-meeting', () => {
        onLeave?.();
      })
      .on('error', (error) => {
        console.error('Daily.co error:', error);
        setError('Failed to join session. Please try again.');
        setIsJoining(false);
      });

    // Join the call
    callFrame
      .join({ url: roomUrl, token })
      .catch((error) => {
        console.error('Failed to join call:', error);
        setError('Failed to join session. Please check your connection.');
        setIsJoining(false);
      });

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [roomUrl, token, onJoined, onLeave]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-lg p-8">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">❌ Connection Error</div>
          <div className="text-red-800">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {isJoining && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-600 text-lg">Joining session...</div>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
