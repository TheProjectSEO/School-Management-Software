import Link from "next/link";
import { getCurrentStudent, getStudentSubjects } from "@/lib/dal";
import { redirect } from "next/navigation";
import { SubjectSearchFilter } from "./SubjectSearchFilter";
import { getClassroomTheme } from "@/lib/utils/classroom/theme";

export const revalidate = 180; // 3 minutes - enrollment list

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

const SUBJECT_THEMES: {
  keywords: string[];
  icon: string;
  gradient: string;
  bar: string;
  text: string;
  bg: string;
}[] = [
  {
    keywords: ["math", "calculus", "algebra", "geometry", "statistics", "trigonometry"],
    icon: "calculate",
    gradient: "from-blue-500 to-blue-700",
    bar: "bg-blue-500",
    text: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    keywords: ["english", "literature", "writing", "reading", "language arts"],
    icon: "menu_book",
    gradient: "from-purple-500 to-purple-700",
    bar: "bg-purple-500",
    text: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    keywords: ["science", "biology", "chemistry", "physics", "earth"],
    icon: "science",
    gradient: "from-emerald-500 to-emerald-700",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    keywords: ["history", "social", "economics", "political", "civics", "araling panlipunan"],
    icon: "public",
    gradient: "from-amber-500 to-amber-700",
    bar: "bg-amber-500",
    text: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    keywords: ["pe", "physical", "health", "mapeh", "sports"],
    icon: "fitness_center",
    gradient: "from-rose-500 to-rose-700",
    bar: "bg-rose-500",
    text: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    keywords: ["computer", "ict", "tech", "code", "programming", "tle"],
    icon: "terminal",
    gradient: "from-cyan-500 to-cyan-700",
    bar: "bg-cyan-500",
    text: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    keywords: ["art", "music", "creative", "drawing"],
    icon: "palette",
    gradient: "from-pink-500 to-pink-700",
    bar: "bg-pink-500",
    text: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    keywords: ["filipino", "tagalog", "edukasyon sa pagpapakatao", "esp"],
    icon: "translate",
    gradient: "from-orange-500 to-orange-700",
    bar: "bg-orange-500",
    text: "text-orange-600",
    bg: "bg-orange-50",
  },
];

const FALLBACK_GRADIENTS = [
  { gradient: "from-blue-500 to-blue-700", icon: "school", bar: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  { gradient: "from-purple-500 to-purple-700", icon: "school", bar: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50" },
  { gradient: "from-emerald-500 to-emerald-700", icon: "school", bar: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
  { gradient: "from-amber-500 to-amber-700", icon: "school", bar: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" },
  { gradient: "from-rose-500 to-rose-700", icon: "school", bar: "bg-rose-500", text: "text-rose-600", bg: "bg-rose-50" },
  { gradient: "from-cyan-500 to-cyan-700", icon: "school", bar: "bg-cyan-500", text: "text-cyan-600", bg: "bg-cyan-50" },
];

function getSubjectTheme(name: string, index: number) {
  const lower = name.toLowerCase();
  for (const theme of SUBJECT_THEMES) {
    if (theme.keywords.some((kw) => lower.includes(kw))) return theme;
  }
  return FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

export default async function SubjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const searchQuery = params.q?.toLowerCase() || "";
  const statusFilter = params.status || "all";

  const student = await getCurrentStudent();
  if (!student) redirect("/login");

  const theme = getClassroomTheme(student.grade_level || "12");
  const isPlayful = theme.type === "playful";

  const enrollments = await getStudentSubjects(student.id);

  const allSubjects = enrollments.map((enrollment, index) => {
    const course = enrollment.course;
    const subjectTheme = getSubjectTheme(course?.name || "", index);
    return {
      id: course?.id || enrollment.course_id,
      name: course?.name || "Unknown Course",
      code: course?.subject_code || "",
      progress: enrollment.progress_percent || 0,
      totalLessons: enrollment.total_lessons || 0,
      completedLessons: enrollment.completed_lessons || 0,
      totalModules: enrollment.total_modules || 0,
      teacherName: enrollment.teacher_name || "",
      theme: subjectTheme,
    };
  });

  let subjects = allSubjects;
  if (searchQuery) {
    subjects = subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery) ||
        s.code.toLowerCase().includes(searchQuery) ||
        s.teacherName.toLowerCase().includes(searchQuery)
    );
  }
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
          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
            {isPlayful ? "📚 My Subjects" : "My Subjects"}
          </h1>
          <p className={`text-base mt-2 ${isPlayful ? "text-purple-600" : "text-slate-500 dark:text-slate-400"}`}>
            {isPlayful
              ? "Let's see what we're learning today!"
              : "Track your progress, join live classes, and manage pending work."}
          </p>
        </div>
        {!isPlayful && (
          <button className="size-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary transition-colors shadow-sm relative">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-msu-gold rounded-full border border-white dark:border-slate-800"></span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <SubjectSearchFilter currentQuery={searchQuery} currentStatus={statusFilter} />

      {/* Flashcard Grid */}
      {subjects.length === 0 ? (
        <div
          className={`text-center py-16 ${
            isPlayful
              ? "rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50"
              : "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
          }`}
        >
          {isPlayful ? (
            <span className="text-6xl mb-4 block">📚</span>
          ) : (
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">school</span>
          )}
          <h3 className={`text-xl font-bold mb-2 ${isPlayful ? "text-purple-900" : "text-slate-900 dark:text-white"}`}>
            {isPlayful ? "No Subjects Yet!" : "No Subjects Yet"}
          </h3>
          <p className={isPlayful ? "text-purple-600" : "text-slate-500 dark:text-slate-400"}>
            {isPlayful
              ? "You don't have any subjects yet. Ask your teacher!"
              : "You are not enrolled in any subjects. Contact your administrator."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {subjects.map((subject) => {
            const statusLabel =
              subject.progress >= 100
                ? isPlayful ? "✅ Done!" : "Completed"
                : subject.progress > 0
                ? isPlayful ? "🔄 Going!" : "In Progress"
                : isPlayful ? "🆕 New!" : "Not Started";

            const statusClass =
              subject.progress >= 100
                ? "bg-emerald-100 text-emerald-700"
                : subject.progress > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-white/20 text-white";

            return (
              <Link
                key={subject.id}
                href={`/student/subjects/${subject.id}`}
                className="group block"
              >
                <div
                  className={`flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                    isPlayful
                      ? "rounded-3xl border-2 border-pink-200"
                      : "rounded-2xl border border-slate-200 dark:border-slate-700"
                  } bg-white dark:bg-slate-800 h-full`}
                >
                  {/* ── Flashcard Top (colored) ── */}
                  <div
                    className={`relative bg-gradient-to-br ${subject.theme.gradient} px-5 pt-6 pb-8 flex flex-col items-center text-center`}
                  >
                    {/* Status badge */}
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        subject.progress >= 100 || subject.progress > 0
                          ? statusClass
                          : "bg-white/20 text-white"
                      }`}
                    >
                      {statusLabel}
                    </span>

                    {/* Icon */}
                    <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-inner">
                      <span className="material-symbols-outlined text-white text-4xl">
                        {subject.theme.icon}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-sm">
                      {subject.name}
                    </h3>
                    {subject.code && (
                      <p className="text-white/60 text-xs mt-1">{subject.code}</p>
                    )}
                  </div>

                  {/* ── Flashcard Bottom (white) ── */}
                  <div className="flex flex-col flex-1 px-5 pt-4 pb-5 -mt-3 bg-white dark:bg-slate-800 rounded-t-2xl relative z-10">
                    {/* Teacher */}
                    {subject.teacherName && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                        <span className="material-symbols-outlined text-base">person</span>
                        <span className="truncate">{subject.teacherName}</span>
                      </div>
                    )}

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400">
                          {subject.completedLessons}/{subject.totalLessons} lessons
                          {subject.totalModules > 0 && ` · ${subject.totalModules} module${subject.totalModules !== 1 ? "s" : ""}`}
                        </span>
                        <span className={`font-bold ${subject.theme.text}`}>
                          {subject.progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${subject.theme.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="mt-auto flex items-center justify-between">
                      <span className={`text-sm font-semibold ${subject.theme.text}`}>
                        {isPlayful
                          ? subject.progress > 0
                            ? "Keep Going! 🚀"
                            : "Let's Start! 🌟"
                          : subject.progress > 0
                          ? "Continue"
                          : "Start Learning"}
                      </span>
                      <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 group-hover:text-slate-600 transition-all text-[20px]">
                        arrow_forward
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
