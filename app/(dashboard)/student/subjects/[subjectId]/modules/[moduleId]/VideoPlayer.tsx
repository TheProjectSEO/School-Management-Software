"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface VideoPlayerProps {
  videoUrl: string;
  playerType: 'iframe' | 'video';
  lessonId: string;
  studentId: string;
  courseId: string;
  initialProgress: number;
  nextLessonUrl: string | null;
  isCompleted: boolean;
}

export default function VideoPlayer({
  videoUrl,
  playerType,
  lessonId,
  studentId,
  courseId,
  initialProgress,
  nextLessonUrl,
  isCompleted,
}: VideoPlayerProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [completed, setCompleted] = useState(isCompleted);
  const [showAutoNav, setShowAutoNav] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(isCompleted);

  // Keep ref in sync
  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  // Auto-mark as watched after 80% progress
  useEffect(() => {
    if (progress >= 80 && progress < 100) {
      updateProgress(100);
    }
  }, [progress]);

  const markComplete = useCallback(async () => {
    if (completedRef.current) return;
    try {
      const response = await authFetch("/api/student/progress/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, courseId, lessonId }),
      });
      if (response.ok) {
        setCompleted(true);
        completedRef.current = true;
      }
    } catch (error) {
      console.error("Error marking lesson complete:", error);
    }
  }, [studentId, courseId, lessonId]);

  const updateProgress = async (newProgress: number) => {
    try {
      const response = await authFetch("/api/student/progress/update", {
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

  const handleVideoEnded = async () => {
    await updateProgress(100);
    await markComplete();
    // Show auto-navigation countdown if there's a next lesson
    if (nextLessonUrl) {
      setShowAutoNav(true);
    }
  };

  // Countdown timer for auto-navigation
  useEffect(() => {
    if (!showAutoNav || !nextLessonUrl) return;
    if (countdown <= 0) {
      router.push(nextLessonUrl);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showAutoNav, countdown, nextLessonUrl, router]);

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
            onEnded={handleVideoEnded}
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

      {/* Progress bar for native video */}
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

      {/* Auto-navigation overlay */}
      {showAutoNav && nextLessonUrl && (
        <div className="mt-4 flex items-center justify-between p-4 bg-primary/10 border border-primary/30 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Lesson Complete!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Next lesson in {countdown} seconds...
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAutoNav(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Stay Here
            </button>
            <button
              onClick={() => router.push(nextLessonUrl)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-[#5a0c0e] transition-colors"
            >
              Next Lesson
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
