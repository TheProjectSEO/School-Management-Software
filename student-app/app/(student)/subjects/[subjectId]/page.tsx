import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentStudent,
  getSubjectById,
  getModulesBySubject,
  getSubjectProgress,
} from "@/lib/dal";

export const revalidate = 300; // 5 minutes - course content

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch subject data
  const subject = await getSubjectById(subjectId);
  if (!subject) {
    redirect("/subjects");
  }

  // Fetch modules for this subject
  const modules = await getModulesBySubject(subjectId);

  // Fetch progress for this subject
  const progressData = await getSubjectProgress(student.id, subjectId);

  // Calculate overall progress
  const totalLessons = progressData.length;
  const completedLessons = progressData.filter((p) => p.completed_at).length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Find the current/next module to continue
  const currentModule = modules.find((m) => {
    // Check if this module has incomplete lessons
    const moduleProgress = progressData.filter((p) =>
      modules.some((mod) => mod.id === p.lesson_id || p.course_id === subjectId)
    );
    return moduleProgress.some((p) => !p.completed_at);
  }) || modules[0];

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex flex-wrap gap-2 items-center text-sm mb-6">
        <Link href="/" className="text-slate-500 dark:text-slate-400 hover:text-primary font-medium transition-colors">
          Home
        </Link>
        <span className="text-slate-400 dark:text-slate-600 font-medium">/</span>
        <Link href="/subjects" className="text-slate-500 dark:text-slate-400 hover:text-primary font-medium transition-colors">
          Courses
        </Link>
        <span className="text-slate-400 dark:text-slate-600 font-medium">/</span>
        <span className="text-primary dark:text-msu-gold font-medium">{subject.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[#0d131b] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
            {subject.name}
          </h1>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-[20px]">school</span>
            <p className="text-base font-normal">
              {subject.subject_code ? `Code: ${subject.subject_code}` : "Course"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">mail</span>
            Contact
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">share</span>
            Share
          </button>
        </div>
      </div>

      {/* Current Module Card */}
      {currentModule && (
        <div className="flex flex-col md:flex-row items-stretch rounded-xl overflow-hidden bg-white dark:bg-[#1a2634] shadow-md border-t-4 border-primary mb-8">
          <div className="w-full md:w-1/3 min-h-[200px] bg-gradient-to-br from-primary/60 to-black/80 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-full cursor-pointer hover:bg-msu-gold hover:text-primary transition-all group">
              <span className="material-symbols-outlined text-white group-hover:text-primary text-4xl">
                play_arrow
              </span>
            </div>
          </div>
          <div className="flex w-full grow flex-col justify-center gap-4 p-6 md:p-8">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-msu-gold/20 text-msu-gold text-xs font-bold uppercase tracking-wider border border-msu-gold/30">
                {overallProgress === 0 ? "Start Here" : "Continue Learning"}
              </span>
              {progressData.length > 0 && (
                <span className="text-slate-400 text-xs font-medium">
                  {completedLessons} of {totalLessons} lessons completed
                </span>
              )}
            </div>
            <div>
              <h3 className="text-primary dark:text-white text-xl md:text-2xl font-bold leading-tight mb-2">
                {currentModule.title}
              </h3>
              {currentModule.description && (
                <p className="text-slate-500 dark:text-slate-400 text-base">
                  {currentModule.description}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full max-w-md">
              <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Overall Progress</span>
                <span className="text-msu-green">{overallProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-msu-green rounded-full"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
              {overallProgress < 100 && (
                <p className="text-xs text-slate-500 mt-1">
                  Complete all modules to finish this course.
                </p>
              )}
            </div>
            <div className="pt-2">
              <Link
                href={`/subjects/${subjectId}/modules/${currentModule.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 bg-primary hover:bg-[#5a0c0e] text-white text-sm font-semibold transition-colors shadow-lg shadow-primary/20"
              >
                {overallProgress === 0 ? "Start Learning" : "Continue Learning"}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modules List */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Course Modules</h3>
        {modules.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">
              folder_open
            </span>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              No Modules Yet
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              This course doesn't have any modules yet. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module, index) => {
              const moduleProgress = progressData.filter((p) =>
                p.lesson_id && p.lesson_id.startsWith(module.id)
              );
              const moduleCompleted = moduleProgress.length > 0 &&
                moduleProgress.every((p) => p.completed_at);

              return (
                <Link
                  key={module.id}
                  href={`/subjects/${subjectId}/modules/${module.id}`}
                  className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-none">
                      <div className="size-12 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-msu-gold font-bold text-lg">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors line-clamp-2">
                        {module.title}
                      </h4>
                      {module.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                          {module.description}
                        </p>
                      )}
                      {module.duration_minutes && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>{module.duration_minutes} min</span>
                        </div>
                      )}
                    </div>
                    {moduleCompleted && (
                      <div className="flex-none">
                        <span className="material-symbols-outlined text-msu-green text-[20px]">
                          check_circle
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Back Link */}
      <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to All Subjects
        </Link>
      </div>
    </>
  );
}
