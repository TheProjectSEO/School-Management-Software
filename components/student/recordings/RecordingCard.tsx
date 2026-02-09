import Link from "next/link";
import type { CourseRecording } from "@/lib/dal/live-sessions";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RecordingCard({
  recording,
  subjectId,
}: {
  recording: CourseRecording;
  subjectId: string;
}) {
  const date = new Date(recording.actual_start);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/student/subjects/${subjectId}/recordings?session=${recording.id}`}
      className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-primary hover:shadow-md transition-all"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
        <span className="material-symbols-outlined text-white/70 text-5xl group-hover:text-white group-hover:scale-110 transition-all">
          play_circle
        </span>
        {recording.recording_duration_seconds && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
            {formatDuration(recording.recording_duration_seconds)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
          {recording.title}
        </h4>
        {recording.module && (
          <span className="inline-block text-xs font-medium text-primary dark:text-msu-gold bg-primary/10 dark:bg-msu-gold/10 px-2 py-0.5 rounded mb-1.5">
            {recording.module.title}
          </span>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formattedDate}
        </p>
      </div>
    </Link>
  );
}
