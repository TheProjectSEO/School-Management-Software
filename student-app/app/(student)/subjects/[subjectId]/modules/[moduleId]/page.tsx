import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentStudent,
  getModuleById,
  getLessonsByModule,
  getSubjectById,
  getLessonWithProgress,
} from "@/lib/dal";
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from "@/lib/utils/video";
import VideoPlayer from "./VideoPlayer";
import LessonNavigation from "./LessonNavigation";
import NotesPanel from "./NotesPanel";
import AskAIPanel from "./AskAIPanel";
import { LessonReactions } from "@/components/student/lesson/LessonReactions";

export const revalidate = 600; // 10 minutes - lesson content

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string; moduleId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { subjectId, moduleId } = await params;
  const { lesson: lessonParam } = await searchParams;

  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch module data
  const module = await getModuleById(moduleId);
  if (!module) {
    redirect(`/subjects/${subjectId}`);
  }

  // Fetch subject data with section info
  const subject = await getSubjectById(subjectId);
  if (!subject) {
    redirect("/subjects");
  }

  // Fetch section to get grade level
  const supabase = await createClient();
  const { data: courseWithSection } = await supabase
    .from('courses')
    .select('section:sections(grade_level)')
    .eq('id', subjectId)
    .single();

  const gradeLevel = courseWithSection?.section?.grade_level || '10';

  // Fetch lessons for this module
  const lessons = await getLessonsByModule(moduleId);

  // Determine which lesson to display
  const currentLessonIndex = lessonParam
    ? lessons.findIndex((l) => l.id === lessonParam)
    : 0;
  const currentLesson = lessons[currentLessonIndex] || lessons[0];

  if (!currentLesson) {
    redirect(`/subjects/${subjectId}`);
  }

  // Get lesson progress
  const lessonWithProgress = await getLessonWithProgress(currentLesson.id, student.id);

  // Extract video ID if this is a video lesson
  const videoId = currentLesson.video_url
    ? extractYouTubeVideoId(currentLesson.video_url)
    : null;
  const embedUrl = videoId ? getYouTubeEmbedUrl(videoId) : null;

  // Calculate progress
  const nextLesson = lessons[currentLessonIndex + 1] || null;
  const prevLesson = lessons[currentLessonIndex - 1] || null;

  return (
    <div className="flex flex-col gap-6 -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
      {/* Breadcrumb */}
      <div className="mx-4 sm:mx-6 lg:mx-8 mt-8 flex flex-wrap gap-2 items-center text-sm">
        <Link
          href="/"
          className="text-slate-500 dark:text-slate-400 hover:text-primary font-medium transition-colors"
        >
          Home
        </Link>
        <span className="text-slate-400 dark:text-slate-600 font-medium">/</span>
        <Link
          href="/subjects"
          className="text-slate-500 dark:text-slate-400 hover:text-primary font-medium transition-colors"
        >
          Subjects
        </Link>
        <span className="text-slate-400 dark:text-slate-600 font-medium">/</span>
        <Link
          href={`/subjects/${subjectId}`}
          className="text-slate-500 dark:text-slate-400 hover:text-primary font-medium transition-colors"
        >
          {subject.name}
        </Link>
        <span className="text-slate-400 dark:text-slate-600 font-medium">/</span>
        <span className="text-primary dark:text-msu-gold font-medium">{module.title}</span>
      </div>

      {/* Video Player or Content */}
      <div className="mx-4 sm:mx-6 lg:mx-8">
        {currentLesson.content_type === "video" && embedUrl ? (
          <VideoPlayer
            embedUrl={embedUrl}
            lessonId={currentLesson.id}
            studentId={student.id}
            courseId={subjectId}
            initialProgress={lessonWithProgress?.progress_percent || 0}
          />
        ) : (
          <div className="w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <div className="text-center p-8">
              <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-600 mb-4 block">
                {currentLesson.content_type === "reading" && "menu_book"}
                {currentLesson.content_type === "quiz" && "quiz"}
                {currentLesson.content_type === "activity" && "assignment"}
                {!["reading", "quiz", "activity", "video"].includes(currentLesson.content_type) &&
                  "description"}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {currentLesson.content_type === "reading" && "Reading Material"}
                {currentLesson.content_type === "quiz" && "Quiz"}
                {currentLesson.content_type === "activity" && "Activity"}
                {!["reading", "quiz", "activity", "video"].includes(currentLesson.content_type) &&
                  "Content"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This lesson type is not yet supported with preview.
              </p>
            </div>
          </div>
        )}

        {/* Lesson Info */}
        <div className="flex items-start justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {currentLesson.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              {currentLesson.duration_minutes && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  <span>{currentLesson.duration_minutes} min</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">
                  {currentLesson.content_type === "video" && "play_circle"}
                  {currentLesson.content_type === "reading" && "menu_book"}
                  {currentLesson.content_type === "quiz" && "quiz"}
                  {currentLesson.content_type === "activity" && "assignment"}
                </span>
                <span className="capitalize">{currentLesson.content_type}</span>
              </div>
              {lessonWithProgress?.completed && (
                <div className="flex items-center gap-1 text-msu-green">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Completed</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary transition-all shadow-sm">
              <span className="material-symbols-outlined">bookmark_border</span>
            </button>
            <button className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary transition-all shadow-sm">
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>
        </div>

        {/* Lesson Reactions */}
        <div className="mt-4">
          <LessonReactions
            lessonId={currentLesson.id}
            studentId={student.id}
            gradeLevel={gradeLevel}
          />
        </div>
      </div>

      {/* Lesson Content */}
      {currentLesson.content && (
        <div className="mx-4 sm:mx-6 lg:mx-8 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Lesson Description
          </h3>
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: currentLesson.content }}
          />
        </div>
      )}

      {/* Lesson Navigation */}
      <LessonNavigation
        currentLesson={currentLesson}
        nextLesson={nextLesson}
        prevLesson={prevLesson}
        subjectId={subjectId}
        moduleId={moduleId}
        studentId={student.id}
        courseId={subjectId}
        isCompleted={lessonWithProgress?.completed || false}
      />

      {/* Ask AI Panel */}
      <AskAIPanel
        lessonId={currentLesson.id}
        courseId={subjectId}
        lessonTitle={currentLesson.title}
        courseName={subject.name}
        videoUrl={currentLesson.video_url || undefined}
      />

      {/* Notes Panel - Fixed sidebar */}
      <NotesPanel
        studentId={student.id}
        courseId={subjectId}
        lessonId={currentLesson.id}
        lessonTitle={currentLesson.title}
      />

      {/* All Lessons in Module */}
      <div className="mx-4 sm:mx-6 lg:mx-8 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Lessons in {module.title}
        </h3>
        <div className="space-y-2">
          {lessons.map((lesson, index) => {
            const isCurrent = lesson.id === currentLesson.id;
            return (
              <Link
                key={lesson.id}
                href={`/subjects/${subjectId}/modules/${moduleId}?lesson=${lesson.id}`}
                className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                  isCurrent
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary"
                }`}
              >
                <div
                  className={`flex-none size-10 rounded-lg flex items-center justify-center font-bold ${
                    isCurrent
                      ? "bg-primary text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-semibold line-clamp-1 ${
                      isCurrent
                        ? "text-primary dark:text-msu-gold"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {lesson.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="capitalize">{lesson.content_type}</span>
                    {lesson.duration_minutes && <span>{lesson.duration_minutes} min</span>}
                  </div>
                </div>
                {isCurrent && (
                  <div className="flex-none">
                    <span className="px-2 py-1 rounded bg-primary text-white text-xs font-bold">
                      Current
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Back Link */}
      <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <Link
          href={`/subjects/${subjectId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to {subject.name}
        </Link>
      </div>
    </div>
  );
}
