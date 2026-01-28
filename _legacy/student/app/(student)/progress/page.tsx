import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentStudent,
  getStudentProgressStats,
  getStudentSkillMastery,
  getRecentSubjects,
  getUpcomingAssessments,
  getAssessmentStats,
} from "@/lib/dal";

export const revalidate = 60; // 1 minute - progress data

// Helper function to determine mastery level based on progress
function getMasteryLevel(percent: number): {
  level: string;
  levelColor: string;
} {
  if (percent >= 90) {
    return { level: "Mastered", levelColor: "msu-gold" };
  } else if (percent >= 70) {
    return { level: "Proficient", levelColor: "msu-green" };
  } else if (percent >= 40) {
    return { level: "Developing", levelColor: "slate" };
  } else {
    return { level: "Beginning", levelColor: "slate" };
  }
}

// Helper function to get icon for subject
function getSubjectIcon(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("bio") || lowerName.includes("science")) return "biotech";
  if (lowerName.includes("math")) return "calculate";
  if (lowerName.includes("chem")) return "science";
  if (lowerName.includes("physics")) return "speed";
  if (lowerName.includes("english") || lowerName.includes("language")) return "menu_book";
  if (lowerName.includes("history")) return "history_edu";
  return "school";
}

// Helper function to format date for deadlines
function formatDeadlineDate(dateString: string): { month: string; day: string } {
  const date = new Date(dateString);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate().toString();
  return { month, day };
}

// Helper function to format relative time
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default async function ProgressPage() {
  // Get current student
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  const firstName = student.profile.full_name.split(" ")[0];

  // Fetch all data in parallel
  const [progressStats, skillMastery, recentSubjects, upcomingAssessments, assessmentStats] =
    await Promise.all([
      getStudentProgressStats(student.id),
      getStudentSkillMastery(student.id),
      getRecentSubjects(student.id, 3),
      getUpcomingAssessments(student.id, 2),
      getAssessmentStats(student.id),
    ]);

  // Map skill mastery to display format
  const skills = skillMastery.slice(0, 4).map((skill) => {
    const { level, levelColor } = getMasteryLevel(skill.masteryPercent);
    return {
      name: skill.courseName,
      icon: getSubjectIcon(skill.courseName),
      level,
      levelColor,
      progress: skill.masteryPercent,
    };
  });

  // Map recent subjects to active modules format
  const activeModules = recentSubjects.map((subject, idx) => {
    const gradients = [
      "bg-gradient-to-br from-green-400 to-emerald-600",
      "bg-gradient-to-br from-purple-400 to-indigo-600",
      "bg-gradient-to-br from-orange-400 to-red-600",
    ];

    return {
      id: subject.id,
      code: subject.subject_code || "SUB",
      name: subject.name,
      progress: subject.progress_percent,
      lastActive: getRelativeTime(subject.last_accessed),
      image: gradients[idx % gradients.length],
    };
  });

  // Map upcoming assessments to deadlines format
  const upcomingDeadlines = upcomingAssessments
    .filter((assessment) => assessment.due_date)
    .map((assessment) => {
      const { month, day } = formatDeadlineDate(assessment.due_date!);
      const courseData = assessment.course as { name?: string; subject_code?: string };
      return {
        title: assessment.title,
        subtitle: `${courseData?.subject_code || courseData?.name || "Assessment"}`,
        month,
        day,
        assessmentId: assessment.id,
      };
    });

  // Get next priority assessment (first upcoming that's not submitted)
  const nextPriority = upcomingAssessments.find((a) => !a.submission);

  // Calculate semester completion based on overall progress
  const semesterCompletion = progressStats.averageProgress;

  // Calculate current standing (GPA equivalent) - simplified calculation
  const currentStanding =
    assessmentStats.averageScore !== null
      ? (1 + (100 - assessmentStats.averageScore) / 100).toFixed(2)
      : "N/A";

  return (
    <>
      {/* Page Heading */}
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white lg:text-4xl">
          Progress + Mastery
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400">
          Hello, {firstName}. You are {semesterCompletion}% of the way to completing the First Semester.
        </p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
        {/* Overall Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Semester Completion</h3>
            <span className="rounded-full bg-msu-green/10 px-2 py-1 text-xs font-bold text-msu-green dark:bg-green-900/30 dark:text-green-400">
              {semesterCompletion >= 70 ? "On Track" : "In Progress"}
            </span>
          </div>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-4xl font-black text-primary dark:text-white">{semesterCompletion}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${semesterCompletion}%` }}
            ></div>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {progressStats.completedLessons} completed, {progressStats.inProgressLessons} in progress
          </p>
        </div>

        {/* Current GPA/Standing */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Current Standing</h3>
            <span className="material-symbols-outlined text-msu-gold">military_tech</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">{currentStanding}</span>
            {typeof currentStanding === "string" && currentStanding !== "N/A" && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/ 1.00 (Scale)</span>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            {assessmentStats.averageScore !== null && assessmentStats.averageScore >= 90 && (
              <>
                <span className="inline-flex items-center gap-1 rounded bg-msu-gold/10 px-2 py-1 text-xs font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-msu-gold">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> Top Performer
                </span>
                <span className="text-xs self-center text-slate-500 dark:text-slate-400">
                  Dean&apos;s Lister Candidate
                </span>
              </>
            )}
            {assessmentStats.averageScore === null && (
              <span className="text-xs text-slate-500 dark:text-slate-400">No graded assessments yet</span>
            )}
          </div>
        </div>

        {/* Next Priority */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Next Priority</h3>
            <span className="material-symbols-outlined text-primary">priority_high</span>
          </div>
          {nextPriority ? (
            <>
              <h4 className="text-lg font-bold text-slate-900 mb-1 dark:text-white">{nextPriority.title}</h4>
              <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">
                {(nextPriority.course as { subject_code?: string; name?: string })?.subject_code ||
                  (nextPriority.course as { subject_code?: string; name?: string })?.name}
              </p>
              <Link
                href="/assessments"
                className="w-full rounded-lg bg-primary py-2 text-sm font-bold text-white hover:bg-[#5a0c0e] transition-colors flex items-center justify-center gap-2"
              >
                Start Review
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </>
          ) : (
            <>
              <h4 className="text-lg font-bold text-slate-900 mb-1 dark:text-white">All Caught Up!</h4>
              <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">No pending assessments</p>
              <Link
                href="/subjects"
                className="w-full rounded-lg bg-slate-100 py-2 text-sm font-bold text-slate-900 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                Browse Subjects
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Center Panel: Mastery & Modules */}
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Mastery Chart Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Outcome Mastery</h2>
              <Link
                href="/subjects"
                className="text-sm font-bold text-primary hover:text-[#5a0c0e] dark:text-msu-gold dark:hover:text-yellow-400"
              >
                View Full Report
              </Link>
            </div>
            {skills.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {skills.map((skill, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                    <div className="mb-2 flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded text-primary dark:text-white dark:bg-primary/30">
                          <span className="material-symbols-outlined">{skill.icon}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{skill.name}</span>
                      </div>
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${
                          skill.levelColor === "msu-green"
                            ? "bg-msu-green/10 text-msu-green dark:bg-green-900/30 dark:text-green-400"
                            : skill.levelColor === "msu-gold"
                            ? "bg-msu-gold/10 text-yellow-700 dark:bg-yellow-900/30 dark:text-msu-gold"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {skill.level}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full ${
                          skill.levelColor === "msu-green"
                            ? "bg-msu-green"
                            : skill.levelColor === "msu-gold"
                            ? "bg-msu-gold"
                            : "bg-primary/60"
                        }`}
                        style={{ width: `${skill.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
                  school
                </span>
                <p className="text-slate-500 dark:text-slate-400">No mastery data available yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                  Complete some lessons to see your progress
                </p>
              </div>
            )}
          </div>

          {/* Module Completion List */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Modules</h2>
            {activeModules.length > 0 ? (
              <div className="space-y-3">
                {activeModules.map((module) => (
                  <div
                    key={module.id}
                    className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md dark:bg-[#1a2634] dark:border-slate-700 sm:flex-row sm:items-center"
                  >
                    <div
                      className={`h-16 w-16 shrink-0 rounded-lg ${module.image} flex items-center justify-center`}
                    >
                      <span className="material-symbols-outlined text-white text-2xl">
                        {getSubjectIcon(module.name)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="mb-1 flex justify-between">
                        <h4 className="font-bold text-slate-900 dark:text-white">
                          {module.code}: {module.name}
                        </h4>
                        <span className="text-sm font-bold text-primary dark:text-red-400">{module.progress}%</span>
                      </div>
                      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${module.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Last active: {module.lastActive}</p>
                    </div>
                    <Link
                      href={`/subjects/${module.id}`}
                      className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 transition-colors"
                    >
                      Resume
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:bg-[#1a2634] dark:border-slate-700">
                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
                  library_books
                </span>
                <p className="text-slate-500 dark:text-slate-400">No active modules yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                  Start a subject to see your recent activity
                </p>
                <Link
                  href="/subjects"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#5a0c0e] transition-colors"
                >
                  Browse Subjects
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: AI Assistant & Deadlines */}
        <div className="flex flex-col gap-6">
          {/* AI Suggested Plan - Static for now */}
          <div className="rounded-xl bg-gradient-to-b from-slate-900 to-primary/90 p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex items-center gap-3 mb-6">
              <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                <span className="material-symbols-outlined text-msu-gold">auto_awesome</span>
              </div>
              <h3 className="text-lg font-bold">AI Study Assistant</h3>
            </div>
            <div className="relative z-10 flex flex-col gap-4">
              <p className="text-sm text-white/80 leading-relaxed">
                Based on your progress, here&apos;s a suggested plan to improve your performance:
              </p>
              <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                <div className="mt-0.5 rounded-full p-1 bg-primary">
                  <span className="material-symbols-outlined text-[14px] text-white">play_arrow</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Review Recent Lessons</p>
                  <p className="text-xs text-white/60">Recommended • 30 mins</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                <div className="mt-0.5 rounded-full p-1 bg-primary">
                  <span className="material-symbols-outlined text-[14px] text-white">quiz</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Practice Quiz</p>
                  <p className="text-xs text-white/60">Build confidence</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3 backdrop-blur-sm border border-white/10 opacity-70">
                <div className="mt-0.5 rounded-full p-1 bg-white/20">
                  <span className="material-symbols-outlined text-[14px] text-white">lock</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Advanced Topics</p>
                  <p className="text-xs text-white/60">Unlock by completing quiz</p>
                </div>
              </div>
            </div>
            <button className="mt-6 w-full rounded-lg bg-white py-2 text-sm font-bold text-primary hover:bg-slate-100 transition-colors">
              Generate New Plan
            </button>
          </div>

          {/* Upcoming Deadlines */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Upcoming Deadlines</h3>
            {upcomingDeadlines.length > 0 ? (
              <div className="flex flex-col gap-4">
                {upcomingDeadlines.map((deadline, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white">
                      <span className="text-xs font-bold uppercase">{deadline.month}</span>
                      <span className="text-lg font-bold leading-none">{deadline.day}</span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{deadline.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{deadline.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">
                  event_available
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming deadlines</p>
              </div>
            )}
            <Link
              href="/assessments"
              className="mt-4 w-full text-center text-sm font-bold text-primary dark:text-msu-gold hover:underline block"
            >
              View Full Schedule
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
