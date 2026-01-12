import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentStudent,
  getRecentSubjects,
  getUpcomingAssessments,
  getUnreadNotificationCount,
  getStudentProgressStats,
} from "@/lib/dal";
import { DataLoadingError } from "@/components/dashboard";

export const revalidate = 30; // 30 seconds - progress updates

export default async function DashboardPage() {
  // Get current student - redirect if not authenticated
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch all dashboard data in parallel for better performance
  let recentSubjects = [];
  let upcomingAssessments = [];
  let unreadCount = 0;
  let progressStats = {
    totalCourses: 0,
    averageProgress: 0,
    completedLessons: 0,
    inProgressLessons: 0,
  };
  let hasError = false;

  try {
    [recentSubjects, upcomingAssessments, unreadCount, progressStats] = await Promise.all([
      getRecentSubjects(student.id, 1),
      getUpcomingAssessments(student.id, 2),
      getUnreadNotificationCount(student.id),
      getStudentProgressStats(student.id),
    ]);
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
        return "quiz";
      case "exam":
        return "school";
      case "assignment":
        return "history_edu";
      case "project":
        return "folder_open";
      default:
        return "task";
    }
  };

  // Get color for assessment type
  const getAssessmentColor = (type: string) => {
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
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {tasksDueSoon > 0
              ? `Let's make today productive. You have ${tasksDueSoon} task${tasksDueSoon > 1 ? "s" : ""} due soon.`
              : "Great job! You're all caught up."}
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-primary dark:text-white">
            {currentDate}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Fall Semester 2024
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Content */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Alert Banner - Only show if there are unread notifications */}
          {unreadCount > 0 && (
            <div className="rounded-xl border border-msu-gold/30 bg-msu-gold/10 p-4 dark:bg-amber-900/10">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-yellow-700 dark:text-amber-500 mt-0.5">
                  notifications_active
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 dark:text-amber-100">
                    You have {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
                  </h3>
                  <p className="text-sm text-yellow-800/80 dark:text-amber-200/80">
                    Check your notifications to stay updated on announcements and assignments.
                  </p>
                </div>
                <Link
                  href="/notifications"
                  className="text-yellow-800 hover:text-yellow-900 dark:text-amber-200 dark:hover:text-amber-100"
                >
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          )}

          {/* Continue Learning Card */}
          <section className="@container">
            {continueSubject ? (
              <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-[#1a2634] dark:border-slate-700 @xl:flex-row">
                <div className="h-48 w-full shrink-0 @xl:h-auto @xl:w-72 bg-gradient-to-br from-primary to-[#5a0c0e] relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 left-4 w-32 h-32 border border-white/30 rounded-full" />
                    <div className="absolute bottom-4 right-4 w-24 h-24 border border-white/30 rounded-full" />
                  </div>
                  <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center relative z-10">
                    <span className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">
                      Continue Learning
                    </span>
                    <div className="rounded-full bg-white/20 p-4 backdrop-blur-md border border-white/30 mb-3 hover:scale-105 transition-transform cursor-pointer">
                      <span className="material-symbols-outlined text-4xl text-white">
                        play_circle
                      </span>
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
                    <span className="rounded bg-msu-green/10 px-2 py-0.5 text-xs font-semibold text-msu-green dark:bg-green-900/30 dark:text-green-300">
                      In Progress
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Last accessed {getTimeSince(continueSubject.last_accessed)}
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    {continueSubject.name}
                  </h2>
                  <p className="mb-4 text-base text-slate-500 dark:text-slate-400">
                    {continueSubject.subject_code || "Continue where you left off"}
                  </p>
                  <div className="mb-4 flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        Progress
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {Math.round(continueSubject.progress_percent)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${continueSubject.progress_percent}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/subjects/${continueSubject.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-white transition-transform hover:scale-[1.02] hover:bg-[#5d0016] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                      Resume Lesson
                    </Link>
                    <Link
                      href="/subjects"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <span className="material-symbols-outlined">more_horiz</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center dark:bg-[#1a2634] dark:border-slate-700">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="material-symbols-outlined text-3xl text-slate-400">
                    school
                  </span>
                </div>
                <h3 className="mb-2 font-display text-xl font-bold text-slate-900 dark:text-white">
                  No courses yet
                </h3>
                <p className="mb-4 text-slate-500 dark:text-slate-400">
                  Start exploring your subjects to begin learning
                </p>
                <Link
                  href="/subjects"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-white transition-transform hover:scale-[1.02] hover:bg-[#5d0016]"
                >
                  Browse Subjects
                </Link>
              </div>
            )}
          </section>

          {/* Upcoming Section */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Upcoming
              </h2>
              <Link
                href="/assessments"
                className="text-sm font-medium text-primary hover:underline hover:text-[#5d0016]"
              >
                View Calendar
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
                      className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md dark:bg-[#1a2634] dark:border-slate-700"
                    >
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${getAssessmentColor(assessment.type)}`}
                            >
                              <span className="material-symbols-outlined text-lg">
                                {getAssessmentIcon(assessment.type)}
                              </span>
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {courseName}
                            </span>
                          </div>
                          {assessment.due_date && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                                isDueSoon && !isSubmitted
                                  ? "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {formatDueDate(assessment.due_date)}
                            </span>
                          )}
                        </div>
                        <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white">
                          {assessment.title}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {assessment.description || `${assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)} - ${assessment.total_points} points`}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {assessment.due_date
                            ? `Due at ${new Date(assessment.due_date).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}`
                            : "No due date"}
                        </span>
                        <Link
                          href={`/assessments/${assessment.id}`}
                          className={`text-sm font-semibold group-hover:underline ${
                            isSubmitted
                              ? "text-slate-400 cursor-not-allowed"
                              : "text-primary"
                          }`}
                        >
                          {isSubmitted ? "Submitted" : "View Details"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center dark:bg-[#1a2634] dark:border-slate-700">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="material-symbols-outlined text-2xl text-slate-400">
                    task_alt
                  </span>
                </div>
                <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
                  No upcoming assessments
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You're all caught up! Check back later for new assignments.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Content */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Progress Stats Card */}
          <div className="rounded-xl bg-gradient-to-br from-primary to-[#420a0b] p-6 text-white shadow-lg dark:from-[#7B1113] dark:to-[#1a0505]">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-white/90">
                trending_up
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                Your Progress
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
                    className="h-full rounded-full bg-msu-gold"
                    style={{ width: `${progressStats.averageProgress}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20">
                <div className="text-center">
                  <p className="text-2xl font-bold">{progressStats.totalCourses}</p>
                  <p className="text-xs text-white/70">Courses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{progressStats.completedLessons}</p>
                  <p className="text-xs text-white/70">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{progressStats.inProgressLessons}</p>
                  <p className="text-xs text-white/70">In Progress</p>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Score Card - Only show if there are graded assessments */}
          {/* This would require another DAL function - keeping placeholder for now */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-[#1a2634] dark:border-slate-700">
            <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
              Latest Score
            </h3>
            <div className="mb-4 flex items-center justify-center rounded-lg bg-slate-50 p-8 dark:bg-slate-800/50">
              <div className="text-center">
                <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">
                  grade
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No graded assessments yet
                </p>
              </div>
            </div>
            <Link
              href="/progress"
              className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-[#5d0016] dark:hover:text-red-400"
            >
              View All Grades
              <span className="material-symbols-outlined text-sm">
                arrow_forward
              </span>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-[#1a2634] dark:border-slate-700">
            <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                href="/subjects"
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined">book</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    My Subjects
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {progressStats.totalCourses} enrolled
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-400">
                  chevron_right
                </span>
              </Link>
              <Link
                href="/assessments"
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-msu-green/10 text-msu-green">
                  <span className="material-symbols-outlined">assignment</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Assessments
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tasksDueSoon} due soon
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-400">
                  chevron_right
                </span>
              </Link>
              <Link
                href="/progress"
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <span className="material-symbols-outlined">insights</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Progress & Mastery
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {progressStats.averageProgress}% average
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-400">
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
