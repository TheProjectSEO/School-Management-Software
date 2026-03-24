'use client';

/**
 * Live Session Room Component
 * Embeds Daily.co video conferencing via iframe
 * Supports: normal, fullscreen, and floating (PiP) modes
 */

import { useState, useRef, useCallback } from 'react';

interface LiveSessionRoomProps {
  roomUrl: string;
  token: string;
  onLeave?: () => void;
  onJoined?: () => void;
  className?: string;
}

type VideoMode = 'normal' | 'fullscreen' | 'floating';

export function LiveSessionRoom({
  roomUrl,
  token,
  className = '',
}: LiveSessionRoomProps) {
  const [mode, setMode] = useState<VideoMode>('normal');
  const [floatPos, setFloatPos] = useState({ x: 24, y: 24 }); // distance from bottom-right
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const handleFullscreen = useCallback(async () => {
    if (mode === 'fullscreen') {
      await document.exitFullscreen().catch(() => {});
      setMode('normal');
    } else {
      try {
        await containerRef.current?.requestFullscreen();
        setMode('fullscreen');
      } catch {
        // Fallback: CSS-level fullscreen overlay
        setMode('fullscreen');
      }
    }
  }, [mode]);

  const handleFloat = useCallback(() => {
    setMode(prev => prev === 'floating' ? 'normal' : 'floating');
  }, []);

  // Drag-to-reposition for floating window
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: floatPos.x,
      startPosY: floatPos.y,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = dragRef.current.startX - ev.clientX;
      const dy = dragRef.current.startY - ev.clientY;
      setFloatPos({
        x: Math.max(8, dragRef.current.startPosX + dx),
        y: Math.max(8, dragRef.current.startPosY + dy),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [floatPos]);

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
        title={mode === 'floating' ? 'Expand video' : 'Float video (PiP)'}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">
          {mode === 'floating' ? 'open_in_full' : 'picture_in_picture_alt'}
        </span>
      </button>
      <button
        onClick={handleFullscreen}
        title={mode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">
          {mode === 'fullscreen' ? 'fullscreen_exit' : 'fullscreen'}
        </span>
      </button>
    </div>
  );

  // Floating (PiP) mode — fixed draggable window
  if (mode === 'floating') {
    return (
      <>
        {/* Placeholder in original position */}
        <div className={`relative w-full h-full ${className} flex items-center justify-center bg-slate-900 rounded-xl`}>
          <div className="text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-2 block">picture_in_picture_alt</span>
            <p className="text-sm">Video is floating</p>
            <button
              onClick={handleFloat}
              className="mt-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
            >
              Bring back
            </button>
          </div>
        </div>

        {/* Floating window */}
        <div
          className="fixed z-[9999] rounded-xl overflow-hidden shadow-2xl border border-white/20"
          style={{
            width: 400,
            height: 280,
            right: floatPos.x,
            bottom: floatPos.y,
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onDragStart}
            className="absolute top-0 left-0 right-0 h-8 z-10 flex items-center justify-between px-2 bg-black/70 cursor-grab active:cursor-grabbing"
          >
            <span className="text-white text-xs font-medium select-none truncate">Live Session</span>
            <div className="flex gap-1">
              <button
                onClick={handleFloat}
                title="Expand"
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/20 text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_full</span>
              </button>
              <button
                onClick={handleFullscreen}
                title="Fullscreen"
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/20 text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">fullscreen</span>
              </button>
            </div>
          </div>
          <iframe
            src={iframeSrc}
            allow="camera; microphone; display-capture; fullscreen; autoplay"
            className="w-full h-full border-0"
            title="Live Session (floating)"
          />
        </div>
      </>
    );
  }

  // Fullscreen mode — CSS overlay (covers entire viewport)
  if (mode === 'fullscreen') {
    return (
      <>
        {/* Placeholder */}
        <div className={`relative w-full h-full ${className} bg-black rounded-xl`} />

        {/* Fullscreen overlay */}
        <div className="fixed inset-0 z-[9998] bg-black" ref={containerRef}>
          {controlBar}
          <iframe
            src={iframeSrc}
            allow="camera; microphone; display-capture; fullscreen; autoplay"
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
        allow="camera; microphone; display-capture; fullscreen; autoplay"
        className="w-full h-full border-0 rounded-xl"
        title="Live Session"
      />
    </div>
  );
}
