'use client';

/**
 * Live Session Room Component
 * Embeds Daily.co video conferencing via iframe
 */

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
  className = '',
}: LiveSessionRoomProps) {
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

  return (
    <div className={`relative w-full h-full ${className}`}>
      <iframe
        src={iframeSrc}
        allow="camera; microphone; display-capture; fullscreen; autoplay"
        className="w-full h-full border-0 rounded-xl"
        title="Live Session"
      />
    </div>
  );
}
