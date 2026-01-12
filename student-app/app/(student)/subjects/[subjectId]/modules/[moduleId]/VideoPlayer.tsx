"use client";

import { useState, useEffect } from "react";

interface VideoPlayerProps {
  embedUrl: string;
  lessonId: string;
  studentId: string;
  courseId: string;
  initialProgress: number;
}

export default function VideoPlayer({
  embedUrl,
  lessonId,
  studentId,
  courseId,
  initialProgress,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(initialProgress);

  // Auto-mark as watched after playing 80% of video
  useEffect(() => {
    if (progress >= 80 && progress < 100) {
      // Update progress to 100%
      updateProgress(100);
    }
  }, [progress]);

  const updateProgress = async (newProgress: number) => {
    try {
      const response = await fetch("/api/progress/update", {
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
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  return (
    <div className="relative">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Lesson Video"
          onLoad={() => setIsPlaying(true)}
        />
      </div>
      {progress < 100 && (
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
