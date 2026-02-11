import Link from "next/link";
import { getCurrentStudent, getStudentSubjects } from "@/lib/dal";
import { redirect } from "next/navigation";
import { SubjectSearchFilter } from "./SubjectSearchFilter";

export const revalidate = 180; // 3 minutes - enrollment list

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

// Subject icon/color mapping by keyword
const SUBJECT_THEMES: { keywords: string[]; icon: string; bg: string; text: string; border: string; bar: string }[] = [
  { keywords: ["math", "calculus", "algebra", "geometry", "statistics", "trigonometry"], icon: "calculate", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", border: "border-l-blue-500", bar: "bg-blue-500" },
  { keywords: ["english", "literature", "writing", "reading", "language arts"], icon: "menu_book", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", border: "border-l-purple-500", bar: "bg-purple-500" },
  { keywords: ["science", "biology", "chemistry", "physics", "earth"], icon: "science", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", border: "border-l-emerald-500", bar: "bg-emerald-500" },
  { keywords: ["history", "social", "economics", "political", "civics", "araling panlipunan"], icon: "public", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", border: "border-l-amber-500", bar: "bg-amber-500" },
  { keywords: ["pe", "physical", "health", "mapeh", "sports"], icon: "fitness_center", bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400", border: "border-l-rose-500", bar: "bg-rose-500" },
  { keywords: ["computer", "ict", "tech", "code", "programming", "tle"], icon: "terminal", bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", border: "border-l-cyan-500", bar: "bg-cyan-500" },
  { keywords: ["art", "music", "creative", "drawing"], icon: "palette", bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-600 dark:text-pink-400", border: "border-l-pink-500", bar: "bg-pink-500" },
  { keywords: ["filipino", "tagalog", "edukasyon sa pagpapakatao", "esp"], icon: "translate", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", border: "border-l-orange-500", bar: "bg-orange-500" },
];

const FALLBACK_THEMES = [
  { icon: "school", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", border: "border-l-blue-500", bar: "bg-blue-500" },
  { icon: "school", bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", border: "border-l-purple-500", bar: "bg-purple-500" },
  { icon: "school", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", border: "border-l-emerald-500", bar: "bg-emerald-500" },
  { icon: "school", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", border: "border-l-amber-500", bar: "bg-amber-500" },
  { icon: "school", bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400", border: "border-l-rose-500", bar: "bg-rose-500" },
  { icon: "school", bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", border: "border-l-cyan-500", bar: "bg-cyan-500" },
];

function getSubjectTheme(name: string, index: number) {
  const lower = name.toLowerCase();
  for (const theme of SUBJECT_THEMES) {
    if (theme.keywords.some((kw) => lower.includes(kw))) {
      return theme;
    }
  }
  const fallback = FALLBACK_THEMES[index % FALLBACK_THEMES.length];
  return fallback;
}

export default async function SubjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const searchQuery = params.q?.toLowerCase() || "";
  const statusFilter = params.status || "all";

  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  const enrollments = await getStudentSubjects(student.id);

  // Map enrollments to subjects with calculated data
  const allSubjects = enrollments.map((enrollment, index) => {
    const course = enrollment.course;
    const theme = getSubjectTheme(course?.name || "", index);
    return {
      id: course?.id || enrollment.course_id,
      name: course?.name || "Unknown Course",
      code: course?.subject_code || "",
      progress: enrollment.progress_percent || 0,
      totalLessons: enrollment.total_lessons || 0,
      completedLessons: enrollment.completed_lessons || 0,
      totalModules: enrollment.total_modules || 0,
      teacherName: enrollment.teacher_name || "",
      theme,
    };
  });

  // Apply search filter
  let subjects = allSubjects;
  if (searchQuery) {
    subjects = subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery) ||
        s.code.toLowerCase().includes(searchQuery) ||
        s.teacherName.toLowerCase().includes(searchQuery)
    );
  }

  // Apply status filter
  if (statusFilter === "in-progress") {
    subjects = subjects.filter((s) => s.progress > 0 && s.progress < 100);
  } else if (statusFilter === "completed") {
    subjects = subjects.filter((s) => s.progress >= 100);
  } else if (statusFilter === "not-started") {
    subjects = subjects.filter((s) => s.progress === 0);
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
            My Subjects
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base mt-2">
            Track your progress, join live classes, and manage pending work.
          </p>
        </div>
        <button className="size-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary transition-colors shadow-sm relative">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-msu-gold rounded-full border border-white dark:border-slate-800"></span>
        </button>
      </div>

      {/* Search and Filters */}
      <SubjectSearchFilter currentQuery={searchQuery} currentStatus={statusFilter} />

      {/* Subject Cards */}
      {subjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
            school
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Subjects Yet
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            You are not enrolled in any subjects. Contact your administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/student/subjects/${subject.id}`}
              className={`group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 ${subject.theme.border} overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 flex flex-col p-5`}
            >
              {/* Top row: Icon + Name + Status badge */}
              <div className="flex items-start gap-3.5 mb-4">
                {/* Subject Icon */}
                <div className={`size-12 rounded-xl ${subject.theme.bg} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined text-[24px] ${subject.theme.text}`}>
                    {subject.theme.icon}
                  </span>
                </div>

                {/* Name, code, teacher */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                      {subject.name}
                    </h3>
                    {/* Status pill */}
                    {subject.progress >= 100 ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Completed
                      </span>
                    ) : subject.progress > 0 ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        In Progress
                      </span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        Not Started
                      </span>
                    )}
                  </div>
                  {subject.code && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subject.code}</p>
                  )}
                  {subject.teacherName && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {subject.teacherName}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${subject.theme.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${subject.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {subject.completedLessons}/{subject.totalLessons} lessons completed
                    {subject.totalModules > 0 && (
                      <span className="text-slate-300 dark:text-slate-600"> &middot; </span>
                    )}
                    {subject.totalModules > 0 && `${subject.totalModules} module${subject.totalModules !== 1 ? "s" : ""}`}
                  </p>
                  <span className={`text-xs font-bold ${subject.theme.text}`}>
                    {subject.progress}%
                  </span>
                </div>
              </div>

              {/* Action row */}
              <div className="mt-auto pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  {subject.progress > 0 ? "Continue Module" : "Start Learning"}
                </span>
                <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
