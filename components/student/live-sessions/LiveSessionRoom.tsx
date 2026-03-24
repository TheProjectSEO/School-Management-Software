'use client';

/**
 * Live Session Room Component
 * Embeds Daily.co video conferencing via iframe.
 * Floating mode is handled by the shell-level FloatingVideoPanel (persists across navigation).
 * Fullscreen mode is handled locally via CSS overlay.
 */

import { useState, useRef, useCallback } from 'react';
import { useLiveSession } from '@/contexts/LiveSessionContext';

interface LiveSessionRoomProps {
  roomUrl: string;
  token: string;
  onLeave?: () => void;
  onJoined?: () => void;
  className?: string;
}

export function LiveSessionRoom({ roomUrl, token, className = '' }: LiveSessionRoomProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setFloating } = useLiveSession();

  const handleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    } else {
      try {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        setIsFullscreen(true);
      }
    }
  }, [isFullscreen]);

  const handleFloat = useCallback(() => {
    setFloating(true);
  }, [setFloating]);

  if (!roomUrl || !token) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-lg p-8">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">Connection Error</div>
          <div className="text-red-800">Session room is not available.</div>
        </div>
      </div>
    );
  }

  const iframeSrc = `${roomUrl}?t=${token}`;

  const controlBar = (
    <div className="absolute top-3 right-3 z-10 flex gap-2">
      <button
        onClick={handleFloat}
        title="Float video (continue while browsing)"
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">picture_in_picture_alt</span>
      </button>
      <button
        onClick={handleFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">
          {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
        </span>
      </button>
    </div>
  );

  // Fullscreen mode — CSS overlay covering entire viewport
  if (isFullscreen) {
    return (
      <>
        {/* Placeholder in original slot */}
        <div className={`relative w-full h-full ${className} bg-black rounded-xl`} />
        {/* Fullscreen overlay */}
        <div ref={containerRef} className="fixed inset-0 z-[9998] bg-black">
          {controlBar}
          <iframe
            src={iframeSrc}
            allow="camera *; microphone *; display-capture *; fullscreen *; autoplay *"
            allowFullScreen
            className="w-full h-full border-0"
            title="Live Session (fullscreen)"
          />
        </div>
      </>
    );
  }

  // Normal mode
  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      {controlBar}
      <iframe
        src={iframeSrc}
        allow="camera *; microphone *; display-capture *; fullscreen *; autoplay *"
        allowFullScreen
        className="w-full h-full border-0 rounded-xl"
        title="Live Session"
      />
    </div>
  );
}
