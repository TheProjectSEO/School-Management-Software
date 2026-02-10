"use client";

import { useState, useEffect, useRef } from "react";

interface VideoPlayerProps {
  videoUrl: string;
  playerType: 'iframe' | 'video';
  lessonId: string;
  studentId: string;
  courseId: string;
  initialProgress: number;
}

export default function VideoPlayer({
  videoUrl,
  playerType,
  lessonId,
  studentId,
  courseId,
  initialProgress,
}: VideoPlayerProps) {
  const [progress, setProgress] = useState(initialProgress);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-mark as watched after 80% progress
  useEffect(() => {
    if (progress >= 80 && progress < 100) {
      updateProgress(100);
    }
  }, [progress]);

  const updateProgress = async (newProgress: number) => {
    try {
      const response = await fetch("/api/student/progress/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          courseId,
          lessonId,
          progress: newProgress,
        }),
      });

      if (response.ok) {
        setProgress(newProgress);
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error("Progress update failed:", response.status, errData);
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration > 0) {
      const percent = Math.round((video.currentTime / video.duration) * 100);
      if (percent > progress) {
        setProgress(percent);
      }
    }
  };

  return (
    <div className="relative">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
        {playerType === 'video' ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => updateProgress(100)}
            playsInline
          />
        ) : (
          <iframe
            src={videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Lesson Video"
          />
        )}
      </div>
      {playerType === 'video' && progress < 100 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            <span>Video Progress</span>
            <span className="text-primary font-bold">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-msu-gold rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
