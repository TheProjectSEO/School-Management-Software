import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudent, getUpcomingAssessments, getAssessmentStats } from "@/lib/dal";

export const revalidate = 60; // 1 minute - deadlines

/**
 * Calculate time until due date in human-readable format
 */
function getTimeUntilDue(dueDate: string): { text: string; urgent: boolean } {
  const now = new Date();
  const due = new Date(dueDate);
  const hoursUntil = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60));
  const daysUntil = Math.floor(hoursUntil / 24);

  if (hoursUntil < 0) {
    return { text: "Overdue", urgent: true };
  } else if (hoursUntil <= 2) {
    return { text: `Due in ${hoursUntil} hours`, urgent: true };
  } else if (hoursUntil <= 24) {
    return { text: `Due in ${hoursUntil} hours (Today)`, urgent: true };
  } else if (daysUntil === 1) {
    return { text: "Due Tomorrow", urgent: true };
  } else if (daysUntil <= 7) {
    return { text: `Due in ${daysUntil} days`, urgent: false };
  } else {
    const formattedDate = due.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return { text: `Due ${formattedDate}`, urgent: false };
  }
}

/**
 * Get icon name for assessment type
 */
function getAssessmentIcon(type: string): string {
  switch (type) {
    case "quiz":
      return "quiz";
    case "exam":
      return "assignment";
    case "assignment":
      return "description";
    case "project":
      return "folder";
    default:
      return "assignment";
  }
}

/**
 * Assessments Page - Displays student's assessments across all courses
 */
export default async function AssessmentsPage() {
  // Get current student
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch all assessments and stats
  const [assessments, stats] = await Promise.all([
    getUpcomingAssessments(student.id, 50),
    getAssessmentStats(student.id),
  ]);

  // Categorize assessments
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const immediateAssessments = assessments.filter((assessment) => {
    if (!assessment.due_date) return false;
    const dueDate = new Date(assessment.due_date);
    const hoursUntil = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    return hoursUntil <= 48 && hoursUntil >= 0; // Due within 48 hours
  });

  const upcomingAssessments = assessments.filter((assessment) => {
    if (!assessment.due_date) return false;
    const dueDate = new Date(assessment.due_date);
    return dueDate > new Date(now.getTime() + 48 * 60 * 60 * 1000) && dueDate <= oneWeekFromNow;
  });

  // Filter submitted assessments for feedback section
  const feedbackAssessments = assessments
    .filter((a) => a.submission?.status === "graded")
    .slice(0, 5);

  // Calculate stats
  const dueThisWeek = assessments.filter((a) => {
    if (!a.due_date) return false;
    const dueDate = new Date(a.due_date);
    return dueDate <= oneWeekFromNow && dueDate >= now && !a.submission;
  }).length;

  const urgentCount = immediateAssessments.filter((a) => !a.submission).length;
  const pendingReview = assessments.filter((a) => a.submission?.status === "submitted").length;

  return (
    <>
      {/* Page Heading & Stats Row */}
      <div className="flex flex-col gap-6 mb-8">
        {/* Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
              Assessments
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal">
              Track your quizzes, assignments, and exams across all enrolled courses.
            </p>
          </div>
          {/* Connectivity indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-msu-green/10 border border-msu-green/20">
            <span className="material-symbols-outlined text-msu-green text-[18px]">wifi</span>
            <span className="text-xs font-medium text-msu-green">Connection Stable</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-[#1a2634] shadow-sm border-l-4 border-primary">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
              Due This Week
            </p>
            <div className="flex items-center gap-2">
              <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
                {dueThisWeek}
              </p>
              {urgentCount > 0 && (
                <span className="text-xs bg-red-50 dark:bg-red-900/30 text-primary dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                  {urgentCount} Urgent
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-[#1a2634] shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
              Pending Review
            </p>
            <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
              {pendingReview}
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-[#1a2634] shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
              Completed
            </p>
            <div className="flex items-center gap-2">
              <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
                {stats.completed}
              </p>
              {stats.averageScore && (
                <span className="text-xs bg-msu-green/10 dark:bg-msu-green/20 text-msu-green px-2 py-0.5 rounded-full font-medium">
                  Avg: {stats.averageScore}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Connectivity indicator */}
        <div className="md:hidden flex items-center gap-3 p-3 rounded-lg bg-msu-green/10 border border-msu-green/20">
          <span className="material-symbols-outlined text-msu-green">wifi</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-msu-green">Connection Stable</span>
            <span className="text-xs text-msu-green/80">
              Autosave is active. Resume tokens available.
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
            <span className="material-symbols-outlined">search</span>
          </span>
          <input
            className="w-full pl-10 pr-4 py-3 rounded-lg border-none bg-white dark:bg-[#1a2634] shadow-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary"
            placeholder="Search assessments by course or title..."
            type="text"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button className="whitespace-nowrap px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium shadow-sm hover:bg-[#5a0c0e] transition-colors">
            All Active
          </button>
          <button className="whitespace-nowrap px-4 py-2.5 rounded-lg bg-white dark:bg-[#1a2634] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Quizzes
          </button>
          <button className="whitespace-nowrap px-4 py-2.5 rounded-lg bg-white dark:bg-[#1a2634] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Assignments
          </button>
          <button className="whitespace-nowrap px-4 py-2.5 rounded-lg bg-white dark:bg-[#1a2634] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Exams
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-8">
        {/* Immediate Action Section */}
        {immediateAssessments.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">priority_high</span>
              Immediate Action Required
            </h3>

            {immediateAssessments.map((assessment) => {
              const timeInfo = assessment.due_date ? getTimeUntilDue(assessment.due_date) : null;
              const hasSubmission = !!assessment.submission;
              const isGraded = assessment.submission?.status === "graded";

              return (
                <div
                  key={assessment.id}
                  className={`group relative flex flex-col md:flex-row gap-5 p-5 rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all ${
                    hasSubmission && !isGraded ? "border-l-4 border-l-msu-gold" : "hover:border-primary/30"
                  }`}
                >
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          assessment.type === "quiz"
                            ? "bg-red-50 dark:bg-red-900/20 text-primary dark:text-red-400"
                            : assessment.type === "exam"
                              ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                              : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                        }`}
                      >
                        {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
                      </span>
                      <span>•</span>
                      <span>{assessment.course.name}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {assessment.title}
                    </h4>
                    {assessment.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {assessment.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {timeInfo && (
                        <div
                          className={`flex items-center gap-1.5 font-medium ${timeInfo.urgent ? "text-primary" : ""}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {timeInfo.urgent ? "schedule" : "event"}
                          </span>
                          <span>{timeInfo.text}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">grade</span>
                        <span>{assessment.total_points} points</span>
                      </div>
                      {hasSubmission && !isGraded && (
                        <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded text-xs font-bold">
                          <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                          <span>Submitted</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 pt-4 md:pt-0 md:pl-6 md:w-64 shrink-0">
                    <div className="flex-1 w-full">
                      {!hasSubmission && (
                        <Link
                          href={`/assessments/${assessment.id}`}
                          className={`w-full font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 ${
                            timeInfo?.urgent
                              ? "bg-primary hover:bg-[#5a0c0e] text-white"
                              : "bg-white dark:bg-transparent border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          Start {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
                          {timeInfo?.urgent && (
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          )}
                        </Link>
                      )}
                      {hasSubmission && !isGraded && (
                        <Link
                          href={`/assessments/${assessment.id}/submission`}
                          className="w-full font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 bg-white dark:bg-transparent border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          View Submission
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">priority_high</span>
              Immediate Action Required
            </h3>
            <div className="p-8 rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-2">
                check_circle
              </span>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No urgent assessments at the moment
              </p>
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {upcomingAssessments.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-4">
              Upcoming
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAssessments.map((assessment) => {
                const timeInfo = assessment.due_date ? getTimeUntilDue(assessment.due_date) : null;
                const hasSubmission = !!assessment.submission;

                return (
                  <div
                    key={assessment.id}
                    className="flex flex-col justify-between p-5 rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                            {getAssessmentIcon(assessment.type)}
                          </span>
                        </div>
                        {timeInfo && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                            {timeInfo.text}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">
                          {assessment.course.name}
                        </p>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                          {assessment.title}
                        </h4>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-sm text-slate-500">
                        {hasSubmission ? "Submitted" : "Not Started"}
                      </span>
                      <Link
                        href={`/assessments/${assessment.id}`}
                        className="text-primary hover:text-[#5a0c0e]"
                      >
                        <span className="material-symbols-outlined">
                          {hasSubmission ? "visibility" : "arrow_forward"}
                        </span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-4">
              Upcoming
            </h3>
            <div className="p-8 rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-2">
                event
              </span>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No upcoming assessments
              </p>
            </div>
          </div>
        )}

        {/* Recent Feedback Section */}
        {feedbackAssessments.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-4">
              Recent Feedback
            </h3>
            <div className="bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800">
                {feedbackAssessments.map((assessment) => {
                  const submission = assessment.submission!;
                  const submittedDate = new Date(submission.submitted_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  const gradedDate = submission.graded_at
                    ? new Date(submission.graded_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A";
                  const score = submission.score || 0;
                  const percentage = Math.round((score / assessment.total_points) * 100);

                  return (
                    <div
                      key={assessment.id}
                      className="p-5 flex flex-col md:flex-row items-start md:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-center size-10 rounded-full bg-msu-green/10 dark:bg-msu-green/20 text-msu-green shrink-0">
                        <span className="material-symbols-outlined">check_circle</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {assessment.title}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Submitted on {submittedDate} • Graded on {gradedDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                          <p className="text-sm text-slate-500 font-medium">Score</p>
                          <p
                            className={`text-lg font-bold ${
                              percentage >= 90 ? "text-msu-green" : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {score}/{assessment.total_points}
                          </p>
                        </div>
                        <Link
                          href={`/assessments/${assessment.id}/feedback`}
                          className="text-primary hover:text-[#5a0c0e] font-medium text-sm flex items-center gap-1"
                        >
                          Review
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-4">
              Recent Feedback
            </h3>
            <div className="p-8 rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-2">
                rate_review
              </span>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No graded assessments yet
              </p>
            </div>
          </div>
        )}

        {/* Resume Token Banner */}
        <div className="mt-4 p-4 rounded-lg bg-msu-gold/10 dark:bg-msu-gold/5 border border-msu-gold/30 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-4">
            <div className="text-msu-gold shrink-0">
              <span className="material-symbols-outlined text-3xl">token</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-slate-900 dark:text-white text-base font-bold leading-tight">
                Resume tokens available
              </p>
              <p className="text-yellow-800 dark:text-yellow-200/70 text-sm font-normal leading-normal">
                Your account has 3 resume tokens left for unstable connections during exams.
              </p>
            </div>
          </div>
          <Link
            href="/help"
            className="text-sm font-bold leading-normal tracking-wide flex gap-2 text-yellow-900 dark:text-yellow-100 whitespace-nowrap hover:underline"
          >
            Learn about proctoring
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </>
  );
}
