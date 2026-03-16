import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/lib/dal/auth";
import { getStudentCourseIds } from "@/lib/dal/student";
import { getClassroomTheme } from "@/lib/utils/classroom/theme";
import JoinLiveButton from "@/components/student/live-sessions/JoinLiveButton";

type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled";
  scheduled_start: string;
  scheduled_end: string | null;
  daily_room_url: string | null;
  recording_url: string | null;
  recording_duration_seconds: number | null;
  has_transcript: boolean;
  course: {
    id: string;
    name: string;
    subject_code: string | null;
    section: {
      id: string;
      name: string;
      grade_level: string | null;
    } | null;
  } | null;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "TBD";
  return new Date(value).toLocaleString();
};

const statusStyles: Record<LiveSession["status"], string> = {
  scheduled: "bg-amber-100 text-amber-800",
  live: "bg-green-100 text-green-800",
  ended: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
};

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic';

export default async function LiveSessionsPage() {
  const supabase = createServiceClient();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    redirect("/login");
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, grade_level")
    .eq("profile_id", profile.id)
    .single();

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Live Sessions</h1>
          <p className="mt-2 text-sm text-slate-600">
            We could not find your student profile.
          </p>
        </div>
      </div>
    );
  }

  // Theme: playful for Grade 1-6, professional for Grade 7-12
  const theme = getClassroomTheme(student.grade_level || '12');
  const isPlayful = theme.type === 'playful';

  // Get course IDs via enrollments OR section-based assignments (handles Grade 1-6)
  const courseIds = await getStudentCourseIds(student.id);

  let sessions: LiveSession[] = [];

  if (courseIds.length > 0) {
    // Fetch courses and sections separately (no FK joins)
    const { data: courses } = await supabase
      .from("courses")
      .select("id, name, subject_code, section_id")
      .in("id", courseIds);

    const sectionIds = [...new Set((courses || []).map((c) => c.section_id).filter(Boolean))];
    let sectionsMap = new Map<string, { id: string; name: string; grade_level: string | null }>();
    if (sectionIds.length > 0) {
      const { data: sections } = await supabase
        .from("sections")
        .select("id, name, grade_level")
        .in("id", sectionIds);
      sectionsMap = new Map((sections || []).map((s) => [s.id, s]));
    }

    const coursesMap = new Map(
      (courses || []).map((c) => [
        c.id,
        {
          id: c.id,
          name: c.name,
          subject_code: c.subject_code,
          section: c.section_id ? (sectionsMap.get(c.section_id) || null) : null,
        },
      ])
    );

    // Fetch live sessions (flat select, no FK joins)
    const { data: sessionRows } = await supabase
      .from("live_sessions")
      .select(
        "id, title, description, status, scheduled_start, scheduled_end, daily_room_url, recording_url, recording_duration_seconds, course_id"
      )
      .in("course_id", courseIds)
      .order("scheduled_start", { ascending: false });

    // Get transcript status for all sessions
    const sessionIds = (sessionRows || []).map((s) => s.id);
    const transcriptMap: Record<string, boolean> = {};

    if (sessionIds.length > 0) {
      const { data: transcripts } = await supabase
        .from("session_transcripts")
        .select("session_id")
        .in("session_id", sessionIds);

      if (transcripts) {
        transcripts.forEach((t) => {
          transcriptMap[t.session_id] = true;
        });
      }
    }

    // Transform the data to match the LiveSession type
    sessions = (sessionRows || []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      scheduled_start: row.scheduled_start,
      scheduled_end: row.scheduled_end,
      daily_room_url: row.daily_room_url,
      recording_url: row.recording_url,
      recording_duration_seconds: row.recording_duration_seconds,
      has_transcript: transcriptMap[row.id] || false,
      course: coursesMap.get(row.course_id) || null,
    })) as LiveSession[];
  }

  return (
    <div>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isPlayful ? '\u{1F3A5} Live Classes' : 'Live Sessions'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isPlayful ? 'Watch your classes and join live!' : 'Join upcoming and live classes from your enrolled courses.'}
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className={`${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50/50 to-purple-50/50 p-6' : 'rounded-xl bg-white p-6 shadow-sm'}`}>
            <p className="text-sm text-slate-600">
              {isPlayful ? '\u{1F4FA} No live classes scheduled yet! Check back soon!' : 'No live sessions are scheduled yet.'}
            </p>
            <Link
              href="/student/subjects"
              className="mt-4 inline-flex items-center text-sm font-semibold text-primary hover:underline"
            >
              Browse subjects
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50/50 to-purple-50/50 p-5' : 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {session.title}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {session.course?.name || "Unknown Course"}{" "}
                      {session.course?.subject_code
                        ? `(${session.course.subject_code})`
                        : ""}
                    </p>
                    {session.course?.section && (
                      <p className="text-xs text-slate-500">
                        {session.course.section.name} • Grade{" "}
                        {session.course.section.grade_level || "N/A"}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[session.status]}`}
                  >
                    {isPlayful
                      ? session.status === 'live'
                        ? '\u{1F534} LIVE'
                        : session.status === 'scheduled'
                        ? '\u{1F4C5} SCHEDULED'
                        : session.status === 'ended'
                        ? '\u2705 ENDED'
                        : session.status.toUpperCase()
                      : session.status.toUpperCase()}
                  </span>
                </div>

                {session.description && (
                  <p className="mt-3 text-sm text-slate-600">
                    {session.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-700">
                      Starts:
                    </span>{" "}
                    {formatDateTime(session.scheduled_start)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Ends:</span>{" "}
                    {formatDateTime(session.scheduled_end)}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {session.status === "live" && session.daily_room_url && (
                    <JoinLiveButton sessionId={session.id} isPlayful={isPlayful} />
                  )}
                  {session.status === "ended" && session.recording_url && (
                    <>
                      <a
                        href={session.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${isPlayful ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                      >
                        <span className="material-symbols-outlined text-base">play_circle</span>
                        Watch Recording
                        {session.recording_duration_seconds && (
                          <span className="text-xs opacity-75">
                            ({Math.floor(session.recording_duration_seconds / 60)}m)
                          </span>
                        )}
                      </a>
                      {session.course?.id && session.has_transcript && (
                        <Link
                          href={`/student/subjects/${session.course.id}/recordings`}
                          className="inline-flex items-center gap-2 rounded-lg border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                        >
                          <span className="material-symbols-outlined text-base">smart_toy</span>
                          Ask AI
                        </Link>
                      )}
                      {session.has_transcript && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Transcript Ready
                        </span>
                      )}
                    </>
                  )}
                  {session.status === "ended" && !session.recording_url && (
                    <span className="text-xs text-slate-500">
                      Recording not available yet.
                    </span>
                  )}
                  {session.status === "scheduled" && (
                    <span className="text-xs text-slate-500">
                      Session starts {formatDateTime(session.scheduled_start)}
                    </span>
                  )}
                  {session.status === "cancelled" && (
                    <span className="text-xs text-red-500">
                      This session was cancelled.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
