'use client';

/**
 * Live Session Room Component
 * Embeds Daily.co video via a single persistent iframe.
 *
 * IMPORTANT: We render exactly ONE <iframe> — never conditionally swap it.
 * Mounting a new iframe element (even with the same src) creates a new
 * Daily.co connection, causing a black screen / rejoin prompt.
 * Fullscreen is achieved by changing the container's CSS class only.
 */

import { useState, useRef } from 'react';
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

  // Fullscreen: expand container to cover viewport via CSS (no new iframe element)
  const containerClass = isFullscreen
    ? 'fixed inset-0 z-[9998] bg-black'
    : `relative w-full h-full ${className}`;

  return (
    <div ref={containerRef} className={containerClass}>
      {/* Control overlay — always on top */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={() => setFloating(true)}
          title="Float video — keep watching while you browse"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">picture_in_picture_alt</span>
        </button>
        <button
          onClick={() => setIsFullscreen(f => !f)}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>
      </div>

      {/* Single persistent iframe — never unmounted or swapped */}
      <iframe
        src={iframeSrc}
        allow="camera *; microphone *; display-capture *; fullscreen *; autoplay *; speaker *"
        allowFullScreen
        className="w-full h-full border-0 rounded-xl"
        title="Live Session"
      />
    </div>
  );
}
