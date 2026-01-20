import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal/auth";

type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled";
  scheduled_start: string;
  scheduled_end: string | null;
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

export default async function LiveSessionsPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    redirect("/login");
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Live Sessions</h1>
          <p className="mt-2 text-sm text-slate-600">
            We could not find your student profile.
          </p>
        </div>
      </div>
    );
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `
        course_id,
        course:courses(id, name, subject_code, section:sections(id, name, grade_level))
      `
    )
    .eq("student_id", student.id);

  const courseIds = (enrollments || [])
    .map((enrollment) => enrollment.course_id)
    .filter(Boolean) as string[];

  let sessions: LiveSession[] = [];

  if (courseIds.length > 0) {
    const { data: sessionRows } = await supabase
      .from("live_sessions")
      .select(
        `
          id,
          title,
          description,
          status,
          scheduled_start,
          scheduled_end,
          course:courses(id, name, subject_code, section:sections(id, name, grade_level))
        `
      )
      .in("course_id", courseIds)
      .order("scheduled_start", { ascending: true });

    sessions = (sessionRows || []) as LiveSession[];
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Live Sessions</h1>
          <p className="mt-1 text-sm text-slate-600">
            Join upcoming and live classes from your enrolled courses.
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              No live sessions are scheduled yet.
            </p>
            <Link
              href="/subjects"
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
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
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
                    {session.status.toUpperCase()}
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

                <div className="mt-4 flex items-center gap-3">
                  {session.status === "live" ? (
                    <Link
                      href={`/live-sessions/${session.id}`}
                      className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                      Join Live
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Join button appears when the session is live.
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
