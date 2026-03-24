'use client';

/**
 * FloatingVideoPanel
 * Persistent draggable floating window for live session video.
 * Rendered at the shell (layout) level so it survives page navigation.
 */

import { useState, useRef, useCallback } from 'react';

interface FloatingVideoPanelProps {
  roomUrl: string;
  token: string;
  title: string;
  onExpand: () => void;
  onClose: () => void;
}

export function FloatingVideoPanel({ roomUrl, token, title, onExpand, onClose }: FloatingVideoPanelProps) {
  // Position: distance from bottom-right corner
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = dragRef.current.startX - ev.clientX;
      const dy = dragRef.current.startY - ev.clientY;
      setPos({
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
  }, [pos]);

  const iframeSrc = `${roomUrl}?t=${token}`;

  return (
    <div
      className="fixed z-[9999] rounded-xl overflow-hidden shadow-2xl border border-white/20 flex flex-col"
      style={{ width: 400, height: 300, right: pos.x, bottom: pos.y }}
    >
      {/* Drag handle / toolbar */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-3 h-9 bg-[#7B1113] cursor-grab active:cursor-grabbing shrink-0 select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse shrink-0" />
          <span className="text-white text-xs font-medium truncate">{title || 'Live Session'}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onExpand}
            title="Return to session page"
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/20 text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">open_in_full</span>
          </button>
          <button
            onClick={onClose}
            title="Leave session"
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/20 text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>
      </div>

      {/* Video iframe */}
      <iframe
        src={iframeSrc}
        allow="camera *; microphone *; display-capture *; fullscreen *; autoplay *"
        allowFullScreen
        className="flex-1 border-0 bg-black"
        title="Live Session (floating)"
      />
    </div>
  );
}
