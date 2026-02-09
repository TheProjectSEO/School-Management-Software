import Link from "next/link";
import type { CourseRecording } from "@/lib/dal/live-sessions";
import { RecordingCard } from "./RecordingCard";

export function RecentRecordingsSection({
  recordings,
  subjectId,
}: {
  recordings: CourseRecording[];
  subjectId: string;
}) {
  if (recordings.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          Session Recordings
        </h3>
        <Link
          href={`/student/subjects/${subjectId}/recordings`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {recordings.map((recording) => (
          <RecordingCard
            key={recording.id}
            recording={recording}
            subjectId={subjectId}
          />
        ))}
      </div>
    </div>
  );
}
