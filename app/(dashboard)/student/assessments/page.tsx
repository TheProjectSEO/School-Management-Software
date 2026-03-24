import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudent, getUpcomingAssessments, getAssessmentStats } from "@/lib/dal";
import { getClassroomTheme } from "@/lib/utils/classroom/theme";
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher';

export const dynamic = 'force-dynamic';

import { AssessmentSearch } from './AssessmentSearch';

interface PageProps {
  searchParams: Promise<{ type?: string; q?: string }>
}

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

// Filter tab configuration
const filterTabs = [
  { label: 'All Active', value: undefined, href: '/student/assessments' },
  { label: 'Quizzes', value: 'quiz', href: '/student/assessments?type=quiz' },
  { label: 'Assignments', value: 'assignment', href: '/student/assessments?type=assignment' },
  { label: 'Exams', value: 'exam', href: '/student/assessments?type=exam' },
]

/**
 * Assessments Page - Displays student's assessments across all courses
 */
export default async function AssessmentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const currentType = params.type
  const searchQuery = params.q?.toLowerCase() || ''

  // Get current student
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  const classroomTheme = getClassroomTheme(student.grade_level || '12');
  const isPlayful = classroomTheme.type === 'playful';

  // Fetch all assessments and stats
  const [assessments, stats] = await Promise.all([
    getUpcomingAssessments(student.id, 50),
    getAssessmentStats(student.id),
  ]);

  // Filter by type and search query
  let filteredAssessments = currentType
    ? assessments.filter(a => a.type === currentType)
    : assessments;

  if (searchQuery) {
    filteredAssessments = filteredAssessments.filter(
      (a) =>
        a.title.toLowerCase().includes(searchQuery) ||
        a.course?.name?.toLowerCase().includes(searchQuery) ||
        a.description?.toLowerCase().includes(searchQuery)
    );
  }

  // Categorize assessments
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const immediateAssessments = filteredAssessments.filter((assessment) => {
    if (!assessment.due_date) return false;
    const dueDate = new Date(assessment.due_date);
    const hoursUntil = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    return hoursUntil <= 48 && hoursUntil >= 0; // Due within 48 hours
  });

  const upcomingAssessments = filteredAssessments.filter((assessment) => {
    if (!assessment.due_date) return false;
    const dueDate = new Date(assessment.due_date);
    return dueDate > new Date(now.getTime() + 48 * 60 * 60 * 1000) && dueDate <= oneWeekFromNow;
  });

  // Assessments with no due date — always visible
  const noDueDateAssessments = filteredAssessments.filter((assessment) => !assessment.due_date);

  // Past-due assessments (overdue or submitted/graded after deadline)
  const pastAssessments = filteredAssessments.filter((assessment) => {
    if (!assessment.due_date) return false;
    return new Date(assessment.due_date) < now;
  });

  // Filter submitted assessments for feedback section (from ALL assessments, not just upcoming)
  const feedbackAssessments = filteredAssessments
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
      <RealtimeRefresher tables={['assessments', 'submissions']} debounceMs={1500} />
      {/* Page Heading & Stats Row */}
      <div className="flex flex-col gap-6 mb-8">
        {/* Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? '\u{1F4DD} My Tests' : 'Assessments'}
            </h1>
            <p className={`text-base font-normal ${isPlayful ? 'text-purple-600' : 'text-slate-500 dark:text-slate-400'}`}>
              {isPlayful ? 'Let\u2019s check your quizzes and homework!' : 'Track your quizzes, assignments, and exams across all enrolled courses.'}
            </p>
          </div>
          {/* Connectivity indicator */}
          {!isPlayful && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-msu-green/10 border border-msu-green/20">
              <span className="material-symbols-outlined text-msu-green text-[18px]">wifi</span>
              <span className="text-xs font-medium text-msu-green">Connection Stable</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`flex flex-col gap-1 p-5 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : 'rounded-xl bg-white dark:bg-[#1a2634] shadow-sm border-l-4 border-primary'}`}>
            <p className={`text-sm font-medium uppercase tracking-wider ${isPlayful ? 'text-purple-600' : 'text-slate-500 dark:text-slate-400'}`}>
              {isPlayful ? '\u{26A1} Due This Week' : 'Due This Week'}
            </p>
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-bold leading-tight ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
                {dueThisWeek}
              </p>
              {urgentCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPlayful ? 'bg-pink-100 text-pink-700' : 'bg-red-50 dark:bg-red-900/30 text-primary dark:text-red-400'}`}>
                  {isPlayful ? `${urgentCount} Now!` : `${urgentCount} Urgent`}
                </span>
              )}
            </div>
          </div>
          <div className={`flex flex-col gap-1 p-5 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : 'rounded-xl bg-white dark:bg-[#1a2634] shadow-sm border border-slate-100 dark:border-slate-800'}`}>
            <p className={`text-sm font-medium uppercase tracking-wider ${isPlayful ? 'text-purple-600' : 'text-slate-500 dark:text-slate-400'}`}>
              {isPlayful ? '\u{23F3} Pending Review' : 'Pending Review'}
            </p>
            <p className={`text-3xl font-bold leading-tight ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {pendingReview}
            </p>
          </div>
          <div className={`flex flex-col gap-1 p-5 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : 'rounded-xl bg-white dark:bg-[#1a2634] shadow-sm border border-slate-100 dark:border-slate-800'}`}>
            <p className={`text-sm font-medium uppercase tracking-wider ${isPlayful ? 'text-purple-600' : 'text-slate-500 dark:text-slate-400'}`}>
              {isPlayful ? '\u{1F3C6} Completed' : 'Completed'}
            </p>
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-bold leading-tight ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
                {stats.completed}
              </p>
              {stats.averageScore && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPlayful ? 'bg-pink-100 text-pink-700' : 'bg-msu-green/10 dark:bg-msu-green/20 text-msu-green'}`}>
                  Avg: {stats.averageScore}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Connectivity indicator */}
        {!isPlayful && (
          <div className="md:hidden flex items-center gap-3 p-3 rounded-lg bg-msu-green/10 border border-msu-green/20">
            <span className="material-symbols-outlined text-msu-green">wifi</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-msu-green">Connection Stable</span>
              <span className="text-xs text-msu-green/80">
                Autosave is active. Resume tokens available.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <AssessmentSearch />
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {filterTabs.map((tab) => {
            const isActive = currentType === tab.value
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? (isPlayful ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm' : 'bg-primary text-white shadow-sm hover:bg-[#5a0c0e]')
                    : 'bg-white dark:bg-[#1a2634] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
        {/* Immediate Action Section */}
        {immediateAssessments.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h3 className={`text-xl font-bold flex items-center gap-2 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? (
                <span>{'\u26A1'} Do These Now!</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-primary">priority_high</span>
                  Immediate Action Required
                </>
              )}
            </h3>

            {immediateAssessments.map((assessment) => {
              const timeInfo = assessment.due_date ? getTimeUntilDue(assessment.due_date) : null;
              const hasSubmission = !!assessment.submission;
              const isGraded = assessment.submission?.status === "graded";
              const isLocked = assessment.isLocked;

              return (
                <div
                  key={assessment.id}
                  className={`group relative flex flex-col md:flex-row gap-5 p-5 shadow-sm hover:shadow-md transition-all ${
                    isPlayful
                      ? `rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50/50 to-purple-50/50 ${hasSubmission && !isGraded ? 'border-l-4 border-l-msu-gold' : ''}`
                      : `rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700 ${isLocked ? 'opacity-70' : ''} ${hasSubmission && !isGraded ? 'border-l-4 border-l-msu-gold' : 'hover:border-primary/30'}`
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
                      {isLocked && (
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-bold">
                          <span className="material-symbols-outlined text-[16px]">lock</span>
                          <span>Complete module to unlock</span>
                        </div>
                      )}
                      {isGraded && (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded text-xs font-bold">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Completed</span>
                        </div>
                      )}
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
                          href={`/student/assessments/${assessment.id}`}
                          className={`w-full font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 ${
                            timeInfo?.urgent
                              ? (isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white" : "bg-primary hover:bg-[#5a0c0e] text-white")
                              : "bg-white dark:bg-transparent border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          {isPlayful ? `Go! \u{1F680}` : `Start ${assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}`}
                          {timeInfo?.urgent && !isPlayful && (
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          )}
                        </Link>
                      )}
                      {isGraded && (
                        <Link
                          href={`/student/assessments/${assessment.id}`}
                          className="w-full font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                        >
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          View Results
                        </Link>
                      )}
                      {hasSubmission && !isGraded && (
                        <Link
                          href={`/student/assessments/${assessment.id}/submission`}
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
            <h3 className={`text-xl font-bold flex items-center gap-2 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? (
                <span>{'\u26A1'} Do These Now!</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-primary">priority_high</span>
                  Immediate Action Required
                </>
              )}
            </h3>
            <div className={`p-5 sm:p-8 text-center ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : 'rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700'}`}>
              {isPlayful ? (
                <span className="text-4xl sm:text-5xl mb-2 block">{'\u2705'}</span>
              ) : (
                <span className="material-symbols-outlined text-4xl sm:text-5xl text-slate-300 dark:text-slate-700 mb-2">
                  check_circle
                </span>
              )}
              <p className={`font-medium ${isPlayful ? 'text-purple-600' : 'text-slate-500 dark:text-slate-400'}`}>
                {isPlayful ? 'All done for now! Great job! \u{1F389}' : 'No urgent assessments at the moment'}
              </p>
            </div>
          </div>
        )}

        {/* Upcoming Section */}
        {upcomingAssessments.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h3 className={`text-xl font-bold flex items-center gap-2 mt-4 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? '\u{1F4C5} Coming Up!' : 'Upcoming'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAssessments.map((assessment) => {
                const timeInfo = assessment.due_date ? getTimeUntilDue(assessment.due_date) : null;
                const hasSubmission = !!assessment.submission;
                const isGradedUpcoming = assessment.submission?.status === "graded";
                const isLocked = assessment.isLocked;

                return (
                  <div
                    key={assessment.id}
                    className={`flex flex-col justify-between p-5 shadow-sm ${isLocked ? 'opacity-70' : ''} ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50/50 to-purple-50/50' : 'rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700'}`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className={`p-2 rounded-lg ${isLocked ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
                          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                            {isLocked ? "lock" : getAssessmentIcon(assessment.type)}
                          </span>
                        </div>
                        {timeInfo && !isLocked && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                            {timeInfo.text}
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            Locked
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
                        {isLocked && assessment.lockReason && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {assessment.lockReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className={`text-sm font-medium ${
                        isGradedUpcoming
                          ? "text-emerald-600 dark:text-emerald-400"
                          : hasSubmission
                            ? "text-yellow-600 dark:text-yellow-500"
                            : "text-slate-500"
                      }`}>
                        {isLocked ? "Locked" : isGradedUpcoming ? "Completed" : hasSubmission ? "Submitted" : "Not Started"}
                      </span>
                      <Link
                        href={`/student/assessments/${assessment.id}`}
                        className={isGradedUpcoming ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" : "text-primary hover:text-[#5a0c0e]"}
                      >
                        <span className="material-symbols-outlined">
                          {isGradedUpcoming ? "check_circle" : hasSubmission ? "visibility" : "arrow_forward"}
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
            <h3 className={`text-xl font-bold flex items-center gap-2 mt-4 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? '\u{1F4C5} Coming Up!' : 'Upcoming'}
            </h3>
            <div className={`p-5 sm:p-8 text-center ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : 'rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700'}`}>
              {isPlayful ? (
                <span className="text-4xl sm:text-5xl mb-2 block">{'\u{1F4C5}'}</span>
              ) : (
                <span className="material-symbols-outlined text-4xl sm:text-5xl text-slate-300 dark:text-slate-700 mb-2">
                  event
                </span>
              )}
              <p className={`font-medium ${isPlayful ? 'text-purple-600' : 'text-slate-500 dark:text-slate-400'}`}>
                {isPlayful ? 'Nothing coming up! Enjoy your free time! \u{1F60A}' : 'No upcoming assessments'}
              </p>
            </div>
          </div>
        )}

        {/* Previous / Past-Due Assessments */}
        {pastAssessments.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className={`text-xl font-bold flex items-center gap-2 mt-4 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? '📋 Previous!' : 'Previous Assessments'}
            </h3>
            <div className={`shadow-sm overflow-hidden ${isPlayful ? 'bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200' : 'bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700'}`}>
              <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800">
                {pastAssessments.map((assessment) => {
                  const submission = assessment.submission;
                  const isGraded = submission?.status === 'graded';
                  const isSubmitted = submission?.status === 'submitted';
                  const score = submission?.score ?? null;
                  const percentage = isGraded && score !== null ? Math.round((score / assessment.total_points) * 100) : null;
                  const dueDate = new Date(assessment.due_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                  return (
                    <div key={assessment.id} className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className={`flex items-center justify-center size-10 rounded-full shrink-0 ${
                        isGraded ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : isSubmitted ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                      }`}>
                        <span className="material-symbols-outlined text-xl">
                          {isGraded ? 'check_circle' : isSubmitted ? 'hourglass_bottom' : 'assignment_late'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">{assessment.title}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {assessment.course?.name} • Due {dueDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isGraded ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : isSubmitted ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                          {isGraded ? (percentage !== null ? `${percentage}%` : 'Graded') : isSubmitted ? 'Under Review' : 'Not Submitted'}
                        </span>
                        <Link
                          href={`/student/assessments/${assessment.id}${isGraded ? '/feedback' : ''}`}
                          className="text-primary hover:text-[#5a0c0e] font-medium text-sm flex items-center gap-1"
                        >
                          {isGraded ? 'Review' : isSubmitted ? 'View' : 'Open'}
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Recent Feedback Section */}
        {feedbackAssessments.length > 0 ? (
          <div className="flex flex-col gap-4">
            <h3 className={`text-xl font-bold flex items-center gap-2 mt-4 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? '\u2B50 Your Results!' : 'Recent Feedback'}
            </h3>
            <div className={`shadow-sm overflow-hidden ${isPlayful ? 'bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200' : 'bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700'}`}>
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
                          href={`/student/assessments/${assessment.id}/feedback`}
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
            <h3 className={`text-xl font-bold flex items-center gap-2 mt-4 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? '\u2B50 Your Results!' : 'Recent Feedback'}
            </h3>
            <div className={`p-5 sm:p-8 text-center ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : 'rounded-xl bg-white dark:bg-[#1a2634] border border-slate-200 dark:border-slate-700'}`}>
              {isPlayful ? (
                <span className="text-4xl sm:text-5xl mb-2 block">{'\u2B50'}</span>
              ) : (
                <span className="material-symbols-outlined text-4xl sm:text-5xl text-slate-300 dark:text-slate-700 mb-2">
                  rate_review
                </span>
              )}
              <p className={`font-medium ${isPlayful ? 'text-purple-600' : 'text-slate-500 dark:text-slate-400'}`}>
                {isPlayful ? 'No results yet! Keep working hard! \u{1F4AA}' : 'No graded assessments yet'}
              </p>
            </div>
          </div>
        )}

        {/* Resume Token Banner */}
        <div className={`mt-4 p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${isPlayful ? 'rounded-2xl bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-200' : 'rounded-lg bg-msu-gold/10 dark:bg-msu-gold/5 border border-msu-gold/30'}`}>
          <div className="flex gap-4">
            <div className={`shrink-0 ${isPlayful ? 'text-pink-500' : 'text-msu-gold'}`}>
              {isPlayful ? (
                <span className="text-3xl">{'\u{1F3AE}'}</span>
              ) : (
                <span className="material-symbols-outlined text-3xl">token</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <p className={`text-base font-bold leading-tight ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
                {isPlayful ? 'Extra lives available!' : 'Resume tokens available'}
              </p>
              <p className={`text-sm font-normal leading-normal ${isPlayful ? 'text-purple-700' : 'text-yellow-800 dark:text-yellow-200/70'}`}>
                {isPlayful ? 'You have 3 extra chances if your internet gets wobbly during a test!' : 'Your account has 3 resume tokens left for unstable connections during exams.'}
              </p>
            </div>
          </div>
          <Link
            href="/student/help"
            className={`text-sm font-bold leading-normal tracking-wide flex gap-2 whitespace-nowrap hover:underline ${isPlayful ? 'text-pink-700' : 'text-yellow-900 dark:text-yellow-100'}`}
          >
            {isPlayful ? 'Learn more \u{1F4A1}' : 'Learn about proctoring'}
            {!isPlayful && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
          </Link>
        </div>
      </div>
    </>
  );
}
