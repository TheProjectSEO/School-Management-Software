import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentStudent,
  getRecentSubjects,
  getUpcomingAssessments,
  getUpcomingRoomSessions,
  getUnreadNotificationCount,
  getStudentProgressStats,
} from "@/lib/dal";
import { DataLoadingError } from "@/components/dashboard";
import { getClassroomTheme } from "@/lib/utils/classroom/theme";

// Type definitions for dashboard data
interface RecentSubject {
  id: string;
  name: string;
  subject_code?: string;
  progress_percent: number;
  last_accessed: string;
}

interface UpcomingAssessment {
  id: string;
  type: string;
  title: string;
  description?: string;
  due_date?: string;
  total_points?: number;
  submission?: unknown;
  course?: {
    name: string;
  };
}

interface RoomSession {
  id: string;
  title: string;
  status: string;
  scheduled_start: string;
  daily_room_url?: string | null;
  course?: {
    name: string;
    subject_code?: string | null;
    section?: { grade_level: string | null } | null;
  } | null;
}

export const revalidate = 30; // 30 seconds - progress updates

export default async function DashboardPage() {
  // Get current student - redirect if not authenticated
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Get theme based on grade level
  const theme = getClassroomTheme(student.grade_level || '12');
  const isPlayful = theme.type === 'playful';

  // Fetch all dashboard data in parallel for better performance
  let recentSubjects: RecentSubject[] = [];
  let upcomingAssessments: UpcomingAssessment[] = [];
  let unreadCount = 0;
  let UpcomingRoomSessions: RoomSession[] = [];
  let progressStats = {
    totalCourses: 0,
    averageProgress: 0,
    completedLessons: 0,
    inProgressLessons: 0,
  };
  let hasError = false;

  try {
    const results = await Promise.allSettled([
      getRecentSubjects(student.id, 1),
      getUpcomingAssessments(student.id, 2),
      getUnreadNotificationCount(student.id),
      getStudentProgressStats(student.id),
      getUpcomingRoomSessions(student.id, 3),
    ]);

    recentSubjects = results[0].status === 'fulfilled' ? results[0].value : [];
    upcomingAssessments = results[1].status === 'fulfilled' ? results[1].value : [];
    unreadCount = results[2].status === 'fulfilled' ? results[2].value : 0;
    progressStats = results[3].status === 'fulfilled' ? results[3].value : progressStats;
    UpcomingRoomSessions = results[4].status === 'fulfilled' ? results[4].value : [];

    // Flag error if any call failed
    hasError = results.some((r) => r.status === 'rejected');
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Dashboard data fetch [${i}] failed:`, r.reason);
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    hasError = true;
  }

  // Get first name from profile
  const firstName = student.profile.full_name?.split(" ")[0] || "Student";

  // Get current date
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Get the most recent subject for "Continue Learning"
  const continueSubject = recentSubjects[0];

  // Calculate time since last access
  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  // Format due date
  const formatDueDate = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if due today
    if (due.toDateString() === now.toDateString()) {
      return "Due Today";
    }

    // Check if due tomorrow
    if (due.toDateString() === tomorrow.toDateString()) {
      return "Due Tomorrow";
    }

    // Check if overdue
    if (due < now) {
      return "Overdue";
    }

    // Otherwise show formatted date
    return `Opens ${due.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })}`;
  };

  // Get icon for assessment type
  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case "quiz":
        return isPlayful ? "\u{1F4DD}" : "quiz";
      case "exam":
        return isPlayful ? "\u{1F4D6}" : "school";
      case "assignment":
        return isPlayful ? "\u270F\uFE0F" : "history_edu";
      case "project":
        return isPlayful ? "\u{1F3A8}" : "folder_open";
      default:
        return isPlayful ? "\u{1F4CB}" : "task";
    }
  };

  // Get color for assessment type
  const getAssessmentColor = (type: string) => {
    if (isPlayful) {
      switch (type) {
        case "quiz":
          return "bg-green-100 text-green-700";
        case "exam":
          return "bg-purple-100 text-purple-700";
        case "assignment":
          return "bg-pink-100 text-pink-700";
        case "project":
          return "bg-blue-100 text-blue-700";
        default:
          return "bg-yellow-100 text-yellow-700";
      }
    }
    switch (type) {
      case "quiz":
        return "bg-msu-green/10 text-msu-green dark:bg-emerald-900/30 dark:text-emerald-400";
      case "exam":
        return "bg-primary/10 text-primary dark:bg-red-900/30 dark:text-red-400";
      case "assignment":
        return "bg-primary/10 text-primary dark:bg-red-900/30 dark:text-red-400";
      case "project":
        return "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  // Count tasks due soon (within 3 days)
  const tasksDueSoon = upcomingAssessments.filter((a) => {
    if (!a.due_date) return false;
    const dueDate = new Date(a.due_date);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return dueDate <= threeDaysFromNow && !a.submission;
  }).length;

  return (
    <>
      {/* Error Banner - Show if data loading failed */}
      {hasError && (
        <div className="mb-6">
          <DataLoadingError />
        </div>
      )}

      {/* Header */}
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`font-display text-3xl font-bold tracking-tight ${theme.layout.headingColor}`}>
            {isPlayful
              ? `Hi ${firstName}! Ready to learn? \u{1F680}`
              : `Welcome back, ${firstName}`}
          </h1>
          <p className={`mt-1 ${isPlayful ? 'text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>
            {tasksDueSoon > 0
              ? isPlayful
                ? `You have ${tasksDueSoon} thing${tasksDueSoon > 1 ? "s" : ""} to do! Let's go! \u{1F4AA}`
                : `Let's make today productive. You have ${tasksDueSoon} task${tasksDueSoon > 1 ? "s" : ""} due soon.`
              : isPlayful
                ? "You're doing awesome! Keep it up! \u{1F31F}"
                : "Great job! You're all caught up."}
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <p className={`text-sm font-semibold ${isPlayful ? 'text-pink-600' : 'text-primary dark:text-white'}`}>
            {currentDate}
          </p>
          <p className={`text-sm ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
            Fall Semester 2024
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Content */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Alert Banner - Only show if there are unread notifications */}
          {unreadCount > 0 && (
            <div className={`p-4 ${isPlayful ? 'rounded-2xl border-2 border-yellow-300 bg-yellow-50' : 'rounded-xl border border-msu-gold/30 bg-msu-gold/10 dark:bg-amber-900/10'}`}>
              <div className="flex items-start gap-3">
                {isPlayful ? (
                  <span className="text-2xl mt-0.5">{'\u{1F514}'}</span>
                ) : (
                  <span className="material-symbols-outlined text-yellow-700 dark:text-amber-500 mt-0.5">
                    notifications_active
                  </span>
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold ${isPlayful ? 'text-yellow-800' : 'text-yellow-900 dark:text-amber-100'}`}>
                    {isPlayful
                      ? `${unreadCount} new alert${unreadCount > 1 ? "s" : ""}! Check it out!`
                      : `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`}
                  </h3>
                  <p className={`text-sm ${isPlayful ? 'text-yellow-700' : 'text-yellow-800/80 dark:text-amber-200/80'}`}>
                    {isPlayful
                      ? "Tap to see what's new!"
                      : "Check your notifications to stay updated on announcements and assignments."}
                  </p>
                </div>
                <Link
                  href="/student/notifications"
                  className={isPlayful ? 'text-yellow-700 hover:text-yellow-900' : 'text-yellow-800 hover:text-yellow-900 dark:text-amber-200 dark:hover:text-amber-100'}
                >
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          )}

          {/* Continue Learning Card */}
          <section className="@container">
            {continueSubject ? (
              <div className={`flex flex-col overflow-hidden ${isPlayful ? 'rounded-2xl border-2 border-pink-200' : 'rounded-xl border border-slate-200 dark:border-slate-700'} ${theme.layout.cardBg} shadow-sm @xl:flex-row`}>
                <div className={`h-48 w-full shrink-0 @xl:h-auto @xl:w-72 relative overflow-hidden ${isPlayful ? 'bg-gradient-to-br from-pink-400 to-purple-500' : 'bg-gradient-to-br from-primary to-[#5a0c0e]'}`}>
                  {/* Decorative elements */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 left-4 w-32 h-32 border border-white/30 rounded-full" />
                    <div className="absolute bottom-4 right-4 w-24 h-24 border border-white/30 rounded-full" />
                  </div>
                  <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center relative z-10">
                    <span className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">
                      {isPlayful ? '\u{1F4DA} Keep Going!' : 'Continue Learning'}
                    </span>
                    <div className={`rounded-full bg-white/20 p-4 backdrop-blur-md border border-white/30 mb-3 hover:scale-105 transition-transform cursor-pointer ${isPlayful ? 'shadow-lg' : ''}`}>
                      {isPlayful ? (
                        <span className="text-4xl">{'\u25B6\uFE0F'}</span>
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-white">
                          play_circle
                        </span>
                      )}
                    </div>
                    <span className="text-white font-bold text-lg">
                      {continueSubject.subject_code || "Course"}
                    </span>
                    <span className="text-white/70 text-sm">
                      {Math.round(continueSubject.progress_percent)}% Complete
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-center p-6">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${isPlayful ? 'bg-green-100 text-green-700' : 'bg-msu-green/10 text-msu-green dark:bg-green-900/30 dark:text-green-300'}`}>
                      {isPlayful ? '\u{1F3C3} In Progress' : 'In Progress'}
                    </span>
                    <span className={`text-xs font-medium ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      Last accessed {getTimeSince(continueSubject.last_accessed)}
                    </span>
                  </div>
                  <h2 className={`font-display text-xl font-bold ${theme.layout.headingColor}`}>
                    {continueSubject.name}
                  </h2>
                  <p className={`mb-4 text-base ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {continueSubject.subject_code || "Continue where you left off"}
                  </p>
                  <div className="mb-4 flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className={`font-medium ${isPlayful ? 'text-purple-700' : 'text-slate-700 dark:text-slate-300'}`}>
                        Progress
                      </span>
                      <span className={`font-bold ${theme.layout.headingColor}`}>
                        {Math.round(continueSubject.progress_percent)}%
                      </span>
                    </div>
                    <div className={`h-2 w-full overflow-hidden rounded-full ${isPlayful ? 'bg-pink-100' : 'bg-slate-100 dark:bg-slate-700'}`}>
                      <div
                        className={`h-full rounded-full ${isPlayful ? 'bg-gradient-to-r from-pink-400 to-purple-500' : 'bg-primary'}`}
                        style={{ width: `${continueSubject.progress_percent}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/student/subjects/${continueSubject.id}`}
                      className={`inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-bold text-white transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 ${isPlayful ? 'bg-pink-500 hover:bg-pink-600 focus:ring-pink-400' : 'bg-primary hover:bg-[#5d0016] focus:ring-primary dark:focus:ring-offset-slate-900'}`}
                    >
                      {isPlayful ? '\u{1F680} Resume Lesson' : 'Resume Lesson'}
                    </Link>
                    <Link
                      href="/student/subjects"
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${isPlayful ? 'border-pink-200 text-pink-400 hover:bg-pink-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                      <span className="material-symbols-outlined">more_horiz</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : progressStats.totalCourses > 0 ? (
              <div className={`flex flex-col items-center justify-center p-12 text-center ${isPlayful ? 'rounded-2xl border-2 border-pink-200' : 'rounded-xl border border-slate-200 dark:border-slate-700'} ${theme.layout.cardBg}`}>
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isPlayful ? 'bg-pink-100' : 'bg-primary/10 dark:bg-primary/20'}`}>
                  {isPlayful ? (
                    <span className="text-3xl">{'\u{1F4DA}'}</span>
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-primary">
                      play_circle
                    </span>
                  )}
                </div>
                <h3 className={`mb-2 font-display text-xl font-bold ${theme.layout.headingColor}`}>
                  {isPlayful ? "Let's Start Learning!" : 'Start Learning'}
                </h3>
                <p className={`mb-4 ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isPlayful
                    ? `You have ${progressStats.totalCourses} subject${progressStats.totalCourses > 1 ? "s" : ""} waiting! \u{1F389}`
                    : `You're enrolled in ${progressStats.totalCourses} course${progressStats.totalCourses > 1 ? "s" : ""}. Open a subject to begin.`}
                </p>
                <Link
                  href="/student/subjects"
                  className={`inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-bold text-white transition-transform hover:scale-[1.02] ${isPlayful ? 'bg-pink-500 hover:bg-pink-600' : 'bg-primary hover:bg-[#5d0016]'}`}
                >
                  {isPlayful ? '\u{1F4DA} Go to My Subjects' : 'Go to My Subjects'}
                </Link>
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center p-12 text-center ${isPlayful ? 'rounded-2xl border-2 border-pink-200' : 'rounded-xl border border-slate-200 dark:border-slate-700'} ${theme.layout.cardBg}`}>
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${isPlayful ? 'bg-purple-100' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {isPlayful ? (
                    <span className="text-3xl">{'\u{1F393}'}</span>
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-slate-400">
                      school
                    </span>
                  )}
                </div>
                <h3 className={`mb-2 font-display text-xl font-bold ${theme.layout.headingColor}`}>
                  {isPlayful ? 'No subjects yet!' : 'No courses yet'}
                </h3>
                <p className={`mb-4 ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isPlayful
                    ? "Your subjects will show up here soon!"
                    : "Start exploring your subjects to begin learning"}
                </p>
                <Link
                  href="/student/subjects"
                  className={`inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-bold text-white transition-transform hover:scale-[1.02] ${isPlayful ? 'bg-pink-500 hover:bg-pink-600' : 'bg-primary hover:bg-[#5d0016]'}`}
                >
                  {isPlayful ? '\u{1F50D} Browse Subjects' : 'Browse Subjects'}
                </Link>
              </div>
            )}
          </section>

          {/* Upcoming Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-lg font-bold ${theme.layout.headingColor}`}>
                {isPlayful ? '\u{1F4C5} Coming Up' : 'Upcoming'}
              </h2>
              <Link
                href="/student/assessments"
                className={`text-sm font-medium hover:underline ${isPlayful ? 'text-pink-600 hover:text-pink-700' : 'text-primary hover:text-[#5d0016]'}`}
              >
                {isPlayful ? 'See All' : 'View Calendar'}
              </Link>
            </div>

            {upcomingAssessments.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {upcomingAssessments.map((assessment) => {
                  const courseName = assessment.course?.name || "Unknown Course";
                  const isSubmitted = !!assessment.submission;
                  const isDueSoon =
                    assessment.due_date &&
                    new Date(assessment.due_date) < new Date(Date.now() + 86400000); // 1 day

                  return (
                    <div
                      key={assessment.id}
                      className={`group relative flex flex-col justify-between p-5 shadow-sm transition-all ${isPlayful ? `rounded-2xl border-2 border-pink-200 ${theme.layout.cardBg} hover:border-pink-400 hover:shadow-md` : `rounded-xl border border-slate-200 ${theme.layout.cardBg} hover:border-primary/50 hover:shadow-md dark:border-slate-700`}`}
                    >
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${getAssessmentColor(assessment.type)}`}
                            >
                              {isPlayful ? (
                                <span className="text-lg">{getAssessmentIcon(assessment.type)}</span>
                              ) : (
                                <span className="material-symbols-outlined text-lg">
                                  {getAssessmentIcon(assessment.type)}
                                </span>
                              )}
                            </div>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              {courseName}
                            </span>
                          </div>
                          {assessment.due_date && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                                isDueSoon && !isSubmitted
                                  ? isPlayful
                                    ? "bg-red-100 text-red-600 border-red-200"
                                    : "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400"
                                  : isPlayful
                                    ? "bg-purple-100 text-purple-600 border-purple-200"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {formatDueDate(assessment.due_date.toString())}
                            </span>
                          )}
                        </div>
                        <h3 className={`mb-1 text-base font-bold ${theme.layout.headingColor}`}>
                          {assessment.title}
                        </h3>
                        <p className={`text-sm ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {assessment.description || `${assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)} - ${assessment.total_points} points`}
                        </p>
                      </div>
                      <div className={`mt-4 flex items-center justify-between pt-3 ${isPlayful ? 'border-t border-pink-100' : 'border-t border-slate-100 dark:border-slate-700'}`}>
                        <span className={`text-xs font-medium ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {assessment.due_date
                            ? `Due at ${new Date(assessment.due_date).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}`
                            : "No due date"}
                        </span>
                        <Link
                          href={`/student/assessments/${assessment.id}`}
                          className={`text-sm font-semibold group-hover:underline ${
                            isSubmitted
                              ? "text-slate-400 cursor-not-allowed"
                              : isPlayful ? "text-pink-600" : "text-primary"
                          }`}
                        >
                          {isSubmitted ? (isPlayful ? '\u2705 Done!' : 'Submitted') : (isPlayful ? 'Open' : 'View Details')}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center p-8 text-center ${isPlayful ? `rounded-2xl border-2 border-pink-200 ${theme.layout.cardBg}` : `rounded-xl border border-slate-200 ${theme.layout.cardBg} dark:border-slate-700`}`}>
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${isPlayful ? 'bg-green-100' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {isPlayful ? (
                    <span className="text-2xl">{'\u{1F389}'}</span>
                  ) : (
                    <span className="material-symbols-outlined text-2xl text-slate-400">
                      task_alt
                    </span>
                  )}
                </div>
                <h3 className={`mb-1 font-semibold ${theme.layout.headingColor}`}>
                  {isPlayful ? 'All done!' : 'No upcoming assessments'}
                </h3>
                <p className={`text-sm ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isPlayful
                    ? "No tests or homework right now. Yay! \u{1F389}"
                    : "You're all caught up! Check back later for new assignments."}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Content */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Live Sessions Card */}
          <div className={`p-5 ${isPlayful ? `rounded-2xl border-2 border-pink-200 ${theme.layout.cardBg}` : `rounded-xl border border-slate-200 ${theme.layout.cardBg} dark:border-slate-700`}`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-base font-bold ${theme.layout.headingColor}`}>
                {isPlayful ? '\u{1F3A5} Live Class' : 'Live Sessions'}
              </h3>
              <Link
                href="/student/live-sessions"
                className={`text-xs font-semibold hover:underline ${isPlayful ? 'text-pink-600' : 'text-primary'}`}
              >
                View all
              </Link>
            </div>
            {UpcomingRoomSessions.length > 0 ? (
              <div className="space-y-3">
                {UpcomingRoomSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 ${isPlayful ? 'rounded-xl border border-pink-100' : 'rounded-lg border border-slate-100 dark:border-slate-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${theme.layout.headingColor}`}>
                        {session.title}
                      </p>
                      <span
                        className={`text-xs font-semibold ${
                          session.status === "live"
                            ? "text-green-600"
                            : isPlayful ? "text-purple-400" : "text-slate-500"
                        }`}
                      >
                        {session.status === "live" ? (isPlayful ? '\u{1F534} Live!' : 'Live') : 'Scheduled'}
                      </span>
                    </div>
                    <p className={`text-xs ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {session.course?.name || "Course"}
                    </p>
                    <p className={`text-xs ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {new Date(session.scheduled_start).toLocaleString()}
                    </p>
                    {session.status === "live" ? (
                      <Link
                        href={`/student/live-sessions/${session.id}`}
                        className={`mt-2 inline-flex text-xs font-semibold hover:underline ${isPlayful ? 'text-pink-600' : 'text-green-600'}`}
                      >
                        {isPlayful ? '🚀 Join now!' : 'Join now'}
                      </Link>
                    ) : (
                      <Link
                        href={`/student/live-sessions/${session.id}`}
                        className={`mt-2 inline-flex text-xs font-semibold hover:underline ${isPlayful ? 'text-pink-600' : 'text-primary'}`}
                      >
                        View details
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-4 text-center ${isPlayful ? 'rounded-xl border border-pink-100' : 'rounded-lg border border-slate-100 dark:border-slate-700'}`}>
                <p className={`text-sm ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isPlayful ? 'No live classes right now.' : 'No upcoming live sessions.'}
                </p>
              </div>
            )}
          </div>
          {/* Progress Stats Card */}
          <div className={`p-6 text-white shadow-lg ${isPlayful ? 'rounded-2xl bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400' : 'rounded-xl bg-gradient-to-br from-primary to-[#420a0b] dark:from-[#7B1113] dark:to-[#1a0505]'}`}>
            <div className="mb-4 flex items-center gap-2">
              {isPlayful ? (
                <span className="text-xl">{'\u{1F4CA}'}</span>
              ) : (
                <span className="material-symbols-outlined text-white/90">
                  trending_up
                </span>
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                {isPlayful ? 'My Progress' : 'Your Progress'}
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-white/80">Average Progress</span>
                  <span className="text-2xl font-bold">{progressStats.averageProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className={`h-full rounded-full ${isPlayful ? 'bg-yellow-300' : 'bg-msu-gold'}`}
                    style={{ width: `${progressStats.averageProgress}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20">
                <div className="text-center">
                  <p className="text-2xl font-bold">{progressStats.totalCourses}</p>
                  <p className="text-xs text-white/70">{isPlayful ? 'Subjects' : 'Courses'}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{progressStats.completedLessons}</p>
                  <p className="text-xs text-white/70">{isPlayful ? 'Done' : 'Completed'}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{progressStats.inProgressLessons}</p>
                  <p className="text-xs text-white/70">{isPlayful ? 'Going' : 'In Progress'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Score Card */}
          <div className={`p-5 ${isPlayful ? `rounded-2xl border-2 border-pink-200 ${theme.layout.cardBg}` : `rounded-xl border border-slate-200 ${theme.layout.cardBg} dark:border-slate-700`}`}>
            <h3 className={`mb-4 text-base font-bold ${theme.layout.headingColor}`}>
              {isPlayful ? '\u2B50 Latest Score' : 'Latest Score'}
            </h3>
            <div className={`mb-4 flex items-center justify-center p-8 ${isPlayful ? 'rounded-xl bg-pink-50' : 'rounded-lg bg-slate-50 dark:bg-slate-800/50'}`}>
              <div className="text-center">
                {isPlayful ? (
                  <span className="text-3xl mb-2 block">{'\u{1F3C6}'}</span>
                ) : (
                  <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">
                    grade
                  </span>
                )}
                <p className={`text-sm ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isPlayful ? 'No scores yet - keep going!' : 'No graded assessments yet'}
                </p>
              </div>
            </div>
            <Link
              href="/student/progress"
              className={`flex items-center justify-center gap-2 text-sm font-medium ${isPlayful ? 'text-pink-600 hover:text-pink-700' : 'text-primary hover:text-[#5d0016] dark:hover:text-red-400'}`}
            >
              {isPlayful ? '\u{1F4CA} View All Grades' : 'View All Grades'}
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className={`p-5 ${isPlayful ? `rounded-2xl border-2 border-pink-200 ${theme.layout.cardBg}` : `rounded-xl border border-slate-200 ${theme.layout.cardBg} dark:border-slate-700`}`}>
            <h3 className={`mb-4 text-base font-bold ${theme.layout.headingColor}`}>
              {isPlayful ? '\u26A1 Quick Actions' : 'Quick Actions'}
            </h3>
            <div className="space-y-2">
              <Link
                href="/student/subjects"
                className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${isPlayful ? 'hover:bg-pink-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPlayful ? 'bg-pink-100' : 'bg-primary/10'}`}>
                  {isPlayful ? (
                    <span className="text-xl">{'\u{1F4DA}'}</span>
                  ) : (
                    <span className="material-symbols-outlined text-primary">book</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${theme.layout.headingColor}`}>
                    {isPlayful ? 'My Subjects' : 'My Subjects'}
                  </p>
                  <p className={`text-xs ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {progressStats.totalCourses} enrolled
                  </p>
                </div>
                <span className={`material-symbols-outlined ${isPlayful ? 'text-pink-300' : 'text-slate-400'}`}>
                  chevron_right
                </span>
              </Link>
              <Link
                href="/student/assessments"
                className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${isPlayful ? 'hover:bg-pink-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPlayful ? 'bg-purple-100' : 'bg-msu-green/10'}`}>
                  {isPlayful ? (
                    <span className="text-xl">{'\u{1F4DD}'}</span>
                  ) : (
                    <span className="material-symbols-outlined text-msu-green">assignment</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${theme.layout.headingColor}`}>
                    {isPlayful ? 'My Tests' : 'Assessments'}
                  </p>
                  <p className={`text-xs ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {tasksDueSoon} due soon
                  </p>
                </div>
                <span className={`material-symbols-outlined ${isPlayful ? 'text-pink-300' : 'text-slate-400'}`}>
                  chevron_right
                </span>
              </Link>
              <Link
                href="/student/progress"
                className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${isPlayful ? 'hover:bg-pink-50' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPlayful ? 'bg-yellow-100' : 'bg-blue-50'}`}>
                  {isPlayful ? (
                    <span className="text-xl">{'\u{1F4CA}'}</span>
                  ) : (
                    <span className="material-symbols-outlined text-blue-600">insights</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${theme.layout.headingColor}`}>
                    {isPlayful ? 'My Progress' : 'Progress & Mastery'}
                  </p>
                  <p className={`text-xs ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {progressStats.averageProgress}% average
                  </p>
                </div>
                <span className={`material-symbols-outlined ${isPlayful ? 'text-pink-300' : 'text-slate-400'}`}>
                  chevron_right
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
