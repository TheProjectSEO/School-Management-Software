import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentStudent,
  getSubjectById,
  getSubjectWithModules,
  getSubjectProgress,
  getLiveSessionsForCourse,
  getRecordingsForCourse,
  studentHasCourseAccess,
} from "@/lib/dal";
import { getClassroomTheme } from "@/lib/utils/classroom/theme";
import { RecentRecordingsSection } from "@/components/student/recordings/RecentRecordingsSection";

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

  // Verify the student has access (enrolled OR section-based assignment)
  const hasAccess = await studentHasCourseAccess(student.id, subjectId);
  if (!hasAccess) {
    redirect("/student/subjects");
  }

  // Fetch subject with modules (includes lessons for progress matching)
  const subjectWithModules = await getSubjectWithModules(subjectId);
  if (!subjectWithModules) {
    redirect("/student/subjects");
  }

  const subject = subjectWithModules;
  const modules = subjectWithModules.modules;

  // Theme
  const theme = getClassroomTheme(student.grade_level || '12');
  const isPlayful = theme.type === 'playful';

  // Build a set of lesson IDs per module for accurate progress matching
  const moduleLessonMap = new Map<string, Set<string>>();
  const allLessonIds = new Set<string>();
  for (const mod of modules) {
    const lessonIds = new Set((mod.lessons || []).map((l) => l.id));
    moduleLessonMap.set(mod.id, lessonIds);
    lessonIds.forEach((id) => allLessonIds.add(id));
  }

  // Fetch progress for this subject
  const progressData = await getSubjectProgress(student.id, subjectId);

  // Fetch live sessions and recordings for this course in parallel
  const [liveSessions, recordings] = await Promise.all([
    getLiveSessionsForCourse(student.id, subjectId),
    getRecordingsForCourse(student.id, subjectId, 4),
  ]);

  // BUG-011: Calculate overall progress using actual lesson counts
  const totalLessons = allLessonIds.size;
  const completedLessons = progressData.filter(
    (p) => p.completed_at && p.lesson_id && allLessonIds.has(p.lesson_id)
  ).length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // BUG-011: Find current/next module by checking which has incomplete lessons
  const currentModule = modules.find((m) => {
    const lessonIds = moduleLessonMap.get(m.id);
    if (!lessonIds || lessonIds.size === 0) return false;
    // Check if any lesson in this module is not completed
    const completedInModule = progressData.filter(
      (p) => p.completed_at && p.lesson_id && lessonIds.has(p.lesson_id)
    ).length;
    return completedInModule < lessonIds.size;
  }) || modules[0];

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex flex-wrap gap-2 items-center text-sm mb-6">
        <Link href="/student" className={`font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
          {isPlayful ? '\u{1F3E0} Home' : 'Home'}
        </Link>
        <span className={`font-medium ${isPlayful ? 'text-pink-300' : 'text-slate-400 dark:text-slate-600'}`}>/</span>
        <Link href="/student/subjects" className={`font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
          {isPlayful ? '\u{1F4DA} Subjects' : 'Subjects'}
        </Link>
        <span className={`font-medium ${isPlayful ? 'text-pink-300' : 'text-slate-400 dark:text-slate-600'}`}>/</span>
        <span className={`font-medium ${isPlayful ? 'text-pink-600' : 'text-primary dark:text-msu-gold'}`}>{subject.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className={`text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] ${isPlayful ? 'text-purple-900' : 'text-[#0d131b] dark:text-white'}`}>
            {isPlayful ? `\u{1F4DA} ${subject.name}` : subject.name}
          </h1>
          <div className={`flex items-center gap-2 ${isPlayful ? 'text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>
            {isPlayful ? <span>{'\u{1F3F7}\uFE0F'}</span> : <span className="material-symbols-outlined text-[20px]">school</span>}
            <p className="text-base font-normal">
              {subject.subject_code ? `${isPlayful ? 'Code' : 'Code'}: ${subject.subject_code}` : (isPlayful ? 'Subject' : 'Course')}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/student/subjects/${subjectId}/recordings`}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors shadow-sm ${isPlayful ? 'rounded-xl border-2 border-pink-200 bg-white text-pink-600 hover:bg-pink-50' : 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            {isPlayful ? <span>{'\u{1F3AC}'}</span> : <span className="material-symbols-outlined text-[20px]">play_circle</span>}
            Recordings
          </Link>
          <button className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors shadow-sm ${isPlayful ? 'rounded-xl border-2 border-purple-200 bg-white text-purple-600 hover:bg-purple-50' : 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            {isPlayful ? <span>{'\u{1F4AC}'}</span> : <span className="material-symbols-outlined text-[20px]">mail</span>}
            Contact
          </button>
        </div>
      </div>

      {/* Live Sessions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
            {isPlayful ? '\u{1F3A5} Live Class' : 'Live Sessions'}
          </h3>
          <Link href="/student/live-sessions" className={`text-sm font-semibold hover:underline ${isPlayful ? 'text-pink-600' : 'text-primary'}`}>
            View all
          </Link>
        </div>
        {liveSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveSessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-white' : 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-semibold ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
                    {session.title}
                  </h4>
                  <span className={`text-xs font-semibold ${session.status === "live" ? "text-green-600" : isPlayful ? "text-purple-400" : session.status === "scheduled" ? "text-blue-600" : "text-slate-500"}`}>
                    {session.status === "live" ? (isPlayful ? '\u{1F534} Live!' : 'live') : session.status}
                  </span>
                </div>
                <p className={`text-xs ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {new Date(session.scheduled_start).toLocaleString()}
                </p>
                <div className="mt-3">
                  {session.status === "live" ? (
                    <Link href={`/student/live-sessions/${session.id}`}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white ${isPlayful ? 'rounded-xl bg-green-500 hover:bg-green-600' : 'rounded-lg bg-green-600 hover:bg-green-700'}`}>
                      {isPlayful ? '🚀 Join now!' : <><span className="material-symbols-outlined text-[16px]">videocam</span>Join Session</>}
                    </Link>
                  ) : (
                    <Link href={`/student/live-sessions/${session.id}`}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold ${isPlayful ? 'rounded-xl border-2 border-pink-200 text-pink-600 hover:bg-pink-50' : 'rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
                      {isPlayful ? '\u{1F440} View Details' : <><span className="material-symbols-outlined text-[16px]">videocam</span>View Details</>}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-8 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700'}`}>
            {isPlayful ? (
              <span className="text-4xl mb-2 block">{'\u{1F3A5}'}</span>
            ) : (
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2 block">videocam</span>
            )}
            <p className={`text-sm ${isPlayful ? 'text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>
              {isPlayful ? 'No live classes right now. Check back soon!' : 'No live sessions scheduled for this course.'}
            </p>
          </div>
        )}
      </div>

      {/* Session Recordings */}
      <RecentRecordingsSection recordings={recordings} subjectId={subjectId} />

      {/* Current Module Card */}
      {currentModule && (
        <div className={`flex flex-col md:flex-row items-stretch overflow-hidden shadow-md mb-8 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-white' : 'rounded-xl bg-white dark:bg-[#1a2634] border-t-4 border-primary'}`}>
          <div className={`w-full md:w-1/3 min-h-[200px] flex items-center justify-center ${isPlayful ? 'bg-gradient-to-br from-pink-400 to-purple-500' : 'bg-gradient-to-br from-primary/60 to-black/80'}`}>
            <div className={`p-3 rounded-full cursor-pointer transition-all group ${isPlayful ? 'bg-white/30 backdrop-blur-md hover:bg-white/50 hover:scale-110' : 'bg-white/20 backdrop-blur-md hover:bg-msu-gold hover:text-primary'}`}>
              {isPlayful ? (
                <span className="text-5xl">{'\u25B6\uFE0F'}</span>
              ) : (
                <span className="material-symbols-outlined text-white group-hover:text-primary text-4xl">play_arrow</span>
              )}
            </div>
          </div>
          <div className="flex w-full grow flex-col justify-center gap-4 p-6 md:p-8">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider ${isPlayful ? 'rounded-lg bg-green-100 text-green-700 border border-green-200' : 'rounded bg-msu-gold/20 text-msu-gold border border-msu-gold/30'}`}>
                {overallProgress === 0 ? (isPlayful ? '\u{1F31F} Start Here!' : 'Start Here') : (isPlayful ? '\u{1F680} Keep Going!' : 'Continue Learning')}
              </span>
              {progressData.length > 0 && (
                <span className={`text-xs font-medium ${isPlayful ? 'text-purple-400' : 'text-slate-400'}`}>
                  {completedLessons} of {totalLessons} lessons completed
                </span>
              )}
            </div>
            <div>
              <h3 className={`text-xl md:text-2xl font-bold leading-tight mb-2 ${isPlayful ? 'text-purple-900' : 'text-primary dark:text-white'}`}>
                {currentModule.title}
              </h3>
              {currentModule.description && (
                <p className={`text-base ${isPlayful ? 'text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {currentModule.description}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full max-w-md">
              <div className={`flex justify-between text-xs font-semibold ${isPlayful ? 'text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>
                <span>{isPlayful ? '\u{1F4CA} Progress' : 'Overall Progress'}</span>
                <span className={isPlayful ? 'text-pink-600' : 'text-msu-green'}>{overallProgress}%</span>
              </div>
              <div className={`h-2.5 w-full rounded-full overflow-hidden ${isPlayful ? 'bg-pink-100' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <div
                  className={`h-full rounded-full ${isPlayful ? 'bg-gradient-to-r from-pink-400 to-purple-500' : 'bg-msu-green'}`}
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href={`/student/subjects/${subjectId}/modules/${currentModule.id}`}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white transition-all ${isPlayful ? 'rounded-xl bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-200 hover:scale-[1.02]' : 'rounded-lg bg-primary hover:bg-[#5a0c0e] shadow-lg shadow-primary/20'}`}
              >
                {overallProgress === 0 ? (isPlayful ? '\u{1F680} Start Learning!' : 'Start Learning') : (isPlayful ? '\u{1F680} Continue!' : 'Continue Learning')}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modules List */}
      <div className="mb-8">
        <h3 className={`text-xl font-bold mb-4 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
          {isPlayful ? '\u{1F4D1} Course Modules' : 'Course Modules'}
        </h3>
        {modules.length === 0 ? (
          <div className={`text-center py-12 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700'}`}>
            {isPlayful ? (
              <span className="text-5xl mb-3 block">{'\u{1F4C2}'}</span>
            ) : (
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">folder_open</span>
            )}
            <h4 className={`text-lg font-bold mb-1 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? 'No Modules Yet!' : 'No Modules Yet'}
            </h4>
            <p className={`text-sm ${isPlayful ? 'text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>
              {isPlayful ? 'Your teacher is preparing something great! Check back soon!' : "This course doesn't have any modules yet. Check back later."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module, index) => {
              const lessonIds = moduleLessonMap.get(module.id);
              const moduleProgress = lessonIds
                ? progressData.filter((p) => p.lesson_id && lessonIds.has(p.lesson_id))
                : [];
              const moduleCompleted = lessonIds != null && lessonIds.size > 0 &&
                moduleProgress.filter((p) => p.completed_at).length >= lessonIds.size;

              return (
                <Link
                  key={module.id}
                  href={`/student/subjects/${subjectId}/modules/${module.id}`}
                  className={`group p-5 transition-all ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-white hover:border-pink-400 hover:shadow-lg hover:scale-[1.02]' : 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:shadow-md'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-none">
                      <div className={`size-12 flex items-center justify-center font-bold text-lg ${isPlayful ? 'rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 text-purple-600' : 'rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-msu-gold'}`}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold mb-1 transition-colors line-clamp-2 ${isPlayful ? 'text-purple-900 group-hover:text-pink-600' : 'text-slate-900 dark:text-white group-hover:text-primary'}`}>
                        {module.title}
                      </h4>
                      {module.description && (
                        <p className={`text-xs line-clamp-2 mb-2 ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {module.description}
                        </p>
                      )}
                      {module.duration_minutes && (
                        <div className={`flex items-center gap-1 text-xs ${isPlayful ? 'text-purple-400' : 'text-slate-400'}`}>
                          {isPlayful ? <span>{'\u23F0'}</span> : <span className="material-symbols-outlined text-[14px]">schedule</span>}
                          <span>{module.duration_minutes} min</span>
                        </div>
                      )}
                    </div>
                    {moduleCompleted && (
                      <div className="flex-none">
                        {isPlayful ? (
                          <span className="text-xl">{'\u2705'}</span>
                        ) : (
                          <span className="material-symbols-outlined text-msu-green text-[20px]">check_circle</span>
                        )}
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
      <div className={`pt-8 ${isPlayful ? 'border-t border-pink-100' : 'border-t border-slate-200 dark:border-slate-800'}`}>
        <Link
          href="/student/subjects"
          className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 hover:text-primary'}`}
        >
          {isPlayful ? <span>{'\u{1F519}'}</span> : <span className="material-symbols-outlined text-[18px]">arrow_back</span>}
          {isPlayful ? 'Back to My Subjects' : 'Back to All Subjects'}
        </Link>
      </div>
    </>
  );
}
