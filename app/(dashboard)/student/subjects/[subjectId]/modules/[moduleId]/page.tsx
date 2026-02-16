import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentStudent,
  getModuleById,
  getLessonsByModule,
  getSubjectById,
  getLessonWithProgress,
  studentHasCourseAccess,
} from "@/lib/dal";
import { resolveVideoSource } from "@/lib/utils/video";
import { getClassroomTheme } from "@/lib/utils/classroom/theme";
import VideoPlayer from "./VideoPlayer";
import LessonNavigation from "./LessonNavigation";
import NotesPanel from "./NotesPanel";
import AskAIPanel from "./AskAIPanel";
import { LessonReactions } from "@/components/student/lesson/LessonReactions";
import LessonAttachments from "@/components/student/lesson/LessonAttachments";
import PDFViewer from "./PDFViewer";

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

  // Verify student has access (enrolled OR section-based assignment)
  const hasAccess = await studentHasCourseAccess(student.id, subjectId);
  if (!hasAccess) {
    redirect("/student/subjects");
  }

  // Fetch module data
  const module = await getModuleById(moduleId);
  if (!module) {
    redirect(`/student/subjects/${subjectId}`);
  }

  // Verify module belongs to this course (prevent URL manipulation)
  if (module.course_id !== subjectId) {
    redirect(`/student/subjects/${subjectId}`);
  }

  // Fetch subject data
  const subject = await getSubjectById(subjectId);
  if (!subject) {
    redirect("/student/subjects");
  }

  // Get grade level from student record
  const gradeLevel = student.grade_level || '10';
  const theme = getClassroomTheme(gradeLevel);
  const isPlayful = theme.type === 'playful';

  // Fetch lessons for this module
  const lessons = await getLessonsByModule(moduleId);

  // Determine which lesson to display
  const currentLessonIndex = lessonParam
    ? lessons.findIndex((l) => l.id === lessonParam)
    : 0;
  const currentLesson = lessons[currentLessonIndex] || lessons[0];

  if (!currentLesson) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <Link href="/student" className={`font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>{isPlayful ? '\u{1F3E0} Home' : 'Home'}</Link>
          <span className={`font-medium ${isPlayful ? 'text-pink-300' : 'text-slate-400 dark:text-slate-600'}`}>/</span>
          <Link href="/student/subjects" className={`font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>{isPlayful ? '\u{1F4DA} Subjects' : 'Subjects'}</Link>
          <span className={`font-medium ${isPlayful ? 'text-pink-300' : 'text-slate-400 dark:text-slate-600'}`}>/</span>
          <Link href={`/student/subjects/${subjectId}`} className={`font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>{subject.name}</Link>
          <span className={`font-medium ${isPlayful ? 'text-pink-300' : 'text-slate-400 dark:text-slate-600'}`}>/</span>
          <span className={`font-medium ${isPlayful ? 'text-pink-600' : 'text-primary dark:text-msu-gold'}`}>{module.title}</span>
        </div>
        <div className={`text-center py-16 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50' : 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700'}`}>
          {isPlayful ? (
            <span className="text-6xl mb-3 block">{'\u{1F4D6}'}</span>
          ) : (
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3 block">menu_book</span>
          )}
          <h3 className={`text-xl font-bold mb-2 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>{isPlayful ? 'No Lessons Yet!' : 'No Lessons Available Yet'}</h3>
          <p className={`text-sm mb-6 ${isPlayful ? 'text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>{isPlayful ? 'Your teacher is still preparing this module. Check back soon!' : 'This module doesn\'t have any published lessons yet. Check back later.'}</p>
          <Link href={`/student/subjects/${subjectId}`} className={`inline-flex items-center gap-2 text-sm font-medium hover:underline ${isPlayful ? 'text-pink-600' : 'text-primary'}`}>
            {isPlayful ? '\u{1F519}' : <span className="material-symbols-outlined text-[18px]">arrow_back</span>}
            Back to {subject.name}
          </Link>
        </div>
      </div>
    );
  }

  // Get lesson progress
  const lessonWithProgress = await getLessonWithProgress(currentLesson.id, student.id);

  // Resolve video source for all types (YouTube, Vimeo, uploaded, recorded sessions)
  const videoSource = currentLesson.video_url
    ? resolveVideoSource(currentLesson.video_url, currentLesson.video_type)
    : null;

  // Calculate progress
  const nextLesson = lessons[currentLessonIndex + 1] || null;
  const prevLesson = lessons[currentLessonIndex - 1] || null;

  return (
    <div className="flex flex-col gap-6 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Breadcrumb */}
      <div className="mx-4 sm:mx-6 lg:mx-8 flex flex-wrap gap-2 items-center text-sm">
        <Link href="/student" className={`font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
          {isPlayful ? '\u{1F3E0} Home' : 'Home'}
        </Link>
        <span className={`font-medium ${isPlayful ? 'text-pink-300' : 'text-slate-400 dark:text-slate-600'}`}>/</span>
        <Link href="/student/subjects" className={`font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
          {isPlayful ? '\u{1F4DA} Subjects' : 'Subjects'}
        </Link>
        <span className={`font-medium ${isPlayful ? 'text-pink-300' : 'text-slate-400 dark:text-slate-600'}`}>/</span>
        <Link href={`/student/subjects/${subjectId}`} className={`font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
          {subject.name}
        </Link>
        <span className={`font-medium ${isPlayful ? 'text-pink-300' : 'text-slate-400 dark:text-slate-600'}`}>/</span>
        <span className={`font-medium ${isPlayful ? 'text-pink-600' : 'text-primary dark:text-msu-gold'}`}>{module.title}</span>
      </div>

      {/* Video Player or Content */}
      <div className="mx-4 sm:mx-6 lg:mx-8">
        {currentLesson.content_type === "video" && videoSource ? (
          <VideoPlayer
            videoUrl={videoSource.url}
            playerType={videoSource.type}
            lessonId={currentLesson.id}
            studentId={student.id}
            courseId={subjectId}
            initialProgress={lessonWithProgress?.progress_percent || 0}
            nextLessonUrl={nextLesson ? `/student/subjects/${subjectId}/modules/${moduleId}?lesson=${nextLesson.id}` : null}
            isCompleted={lessonWithProgress?.completed || false}
          />
        ) : currentLesson.attachments?.find(a => a.file_type?.includes('pdf') || a.file_type?.includes('presentation') || a.file_type?.includes('powerpoint')) ? (
          // Show PDF/Presentation preview for lessons with document attachments
          (() => {
            const docAttachment = currentLesson.attachments.find(a => a.file_type?.includes('pdf') || a.file_type?.includes('presentation') || a.file_type?.includes('powerpoint'))
            if (!docAttachment) return null
            return (
              <PDFViewer
                fileUrl={docAttachment.file_url}
                fileTitle={docAttachment.title}
                fileType={docAttachment.file_type || ''}
                fileId={docAttachment.id}
                isPlayful={isPlayful}
              />
            )
          })()
        ) : (
          <div className="w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <div className="text-center p-8">
              <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-600 mb-4 block">
                {currentLesson.content_type === "video" && "videocam_off"}
                {currentLesson.content_type === "reading" && "menu_book"}
                {currentLesson.content_type === "quiz" && "quiz"}
                {currentLesson.content_type === "activity" && "assignment"}
                {!["reading", "quiz", "activity", "video"].includes(currentLesson.content_type) &&
                  "description"}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {currentLesson.content_type === "video" && "Video Not Available"}
                {currentLesson.content_type === "reading" && "Reading Material"}
                {currentLesson.content_type === "quiz" && "Quiz"}
                {currentLesson.content_type === "activity" && "Activity"}
                {!["reading", "quiz", "activity", "video"].includes(currentLesson.content_type) &&
                  "Content"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentLesson.content_type === "video"
                  ? "The video for this lesson is still being processed. Please check back later."
                  : "Scroll down to view the lesson content."}
              </p>
            </div>
          </div>
        )}

        {/* Lesson Info */}
        <div className="flex items-start justify-between mt-4">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
              {isPlayful ? `\u{1F4D6} ${currentLesson.title}` : currentLesson.title}
            </h1>
            <div className={`flex items-center gap-4 text-sm ${isPlayful ? 'text-purple-500' : 'text-slate-500 dark:text-slate-400'}`}>
              {currentLesson.duration_minutes && (
                <div className="flex items-center gap-1">
                  {isPlayful ? <span>{'\u23F0'}</span> : <span className="material-symbols-outlined text-[16px]">schedule</span>}
                  <span>{currentLesson.duration_minutes} min</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                {!isPlayful && (
                  <span className="material-symbols-outlined text-[16px]">
                    {currentLesson.content_type === "video" && "play_circle"}
                    {currentLesson.content_type === "reading" && "menu_book"}
                    {currentLesson.content_type === "quiz" && "quiz"}
                    {currentLesson.content_type === "activity" && "assignment"}
                  </span>
                )}
                {isPlayful ? (
                  <span>
                    {currentLesson.content_type === "video" && "\u{1F3AC} Video"}
                    {currentLesson.content_type === "reading" && "\u{1F4D6} Reading"}
                    {currentLesson.content_type === "quiz" && "\u{1F4DD} Quiz"}
                    {currentLesson.content_type === "activity" && "\u270F\uFE0F Activity"}
                    {!["video", "reading", "quiz", "activity"].includes(currentLesson.content_type) && "\u{1F4CB} Content"}
                  </span>
                ) : (
                  <span className="capitalize">{currentLesson.content_type}</span>
                )}
              </div>
              {lessonWithProgress?.completed && (
                <div className={`flex items-center gap-1 ${isPlayful ? 'text-green-600' : 'text-msu-green'}`}>
                  {isPlayful ? <span>{'\u2705'}</span> : <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                  <span>{isPlayful ? 'Done!' : 'Completed'}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button className={`p-2 transition-all shadow-sm ${isPlayful ? 'rounded-xl bg-pink-50 border-2 border-pink-200 text-pink-400 hover:text-pink-600 hover:border-pink-400' : 'rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary'}`}>
              {isPlayful ? <span className="text-xl">{'\u{1F516}'}</span> : <span className="material-symbols-outlined">bookmark_border</span>}
            </button>
            <button className={`p-2 transition-all shadow-sm ${isPlayful ? 'rounded-xl bg-purple-50 border-2 border-purple-200 text-purple-400 hover:text-purple-600 hover:border-purple-400' : 'rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary'}`}>
              {isPlayful ? <span className="text-xl">{'\u{1F517}'}</span> : <span className="material-symbols-outlined">share</span>}
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
        <div className={`mx-4 sm:mx-6 lg:mx-8 p-6 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-white' : 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700'}`}>
          <h3 className={`text-lg font-bold mb-4 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
            {isPlayful ? '\u{1F4DD} Lesson Description' : 'Lesson Description'}
          </h3>
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: currentLesson.content }}
          />
        </div>
      )}

      {/* Lesson Attachments */}
      {currentLesson.attachments && currentLesson.attachments.length > 0 && (
        <div className="mx-4 sm:mx-6 lg:mx-8">
          <LessonAttachments
            attachments={
              // Filter out the first PDF/Presentation (already shown in Reading Material section above)
              (currentLesson.attachments || []).filter((a, i) => {
                if (a.file_type?.includes('pdf') || a.file_type?.includes('presentation') || a.file_type?.includes('powerpoint')) {
                  // Skip the first PDF or presentation only
                  const docIndex = (currentLesson.attachments || []).findIndex(att =>
                    att.file_type?.includes('pdf') ||
                    att.file_type?.includes('presentation') ||
                    att.file_type?.includes('powerpoint')
                  )
                  return (currentLesson.attachments || []).indexOf(a) !== docIndex
                }
                return true
              })
            }
            isPlayful={isPlayful}
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
      <div className={`mx-4 sm:mx-6 lg:mx-8 p-6 ${isPlayful ? 'rounded-2xl border-2 border-pink-200 bg-white' : 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isPlayful ? 'text-purple-900' : 'text-slate-900 dark:text-white'}`}>
          {isPlayful ? `\u{1F4CB} Lessons in ${module.title}` : `Lessons in ${module.title}`}
        </h3>
        <div className="space-y-2">
          {lessons.map((lesson, index) => {
            const isCurrent = lesson.id === currentLesson.id;
            return (
              <Link
                key={lesson.id}
                href={`/student/subjects/${subjectId}/modules/${moduleId}?lesson=${lesson.id}`}
                className={`flex items-center gap-4 p-3 transition-all ${
                  isPlayful
                    ? isCurrent
                      ? "rounded-xl bg-pink-100 border-2 border-pink-400"
                      : "rounded-xl bg-purple-50/50 border-2 border-purple-100 hover:border-pink-300"
                    : isCurrent
                      ? "rounded-lg bg-primary/10 border-2 border-primary"
                      : "rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary"
                }`}
              >
                <div
                  className={`flex-none size-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                    isPlayful
                      ? isCurrent
                        ? "bg-pink-500 text-white rounded-xl"
                        : "bg-purple-100 text-purple-600 rounded-xl"
                      : isCurrent
                        ? "bg-primary text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-semibold line-clamp-1 ${
                      isPlayful
                        ? isCurrent ? "text-pink-700" : "text-purple-900"
                        : isCurrent ? "text-primary dark:text-msu-gold" : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {lesson.title}
                  </h4>
                  <div className={`flex items-center gap-3 text-xs mt-1 ${isPlayful ? 'text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {isPlayful ? (
                      <>
                        <span>
                          {lesson.content_type === "video" && "\u{1F3AC} Video"}
                          {lesson.content_type === "reading" && "\u{1F4D6} Reading"}
                          {lesson.content_type === "quiz" && "\u{1F4DD} Quiz"}
                          {lesson.content_type === "activity" && "\u270F\uFE0F Activity"}
                          {!["video", "reading", "quiz", "activity"].includes(lesson.content_type) && "\u{1F4CB} Content"}
                        </span>
                        {lesson.duration_minutes && <span>{'\u23F0'} {lesson.duration_minutes} min</span>}
                      </>
                    ) : (
                      <>
                        <span className="capitalize">{lesson.content_type}</span>
                        {lesson.duration_minutes && <span>{lesson.duration_minutes} min</span>}
                      </>
                    )}
                  </div>
                </div>
                {isCurrent && (
                  <div className="flex-none">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${isPlayful ? 'bg-pink-500 text-white rounded-lg' : 'bg-primary text-white'}`}>
                      {isPlayful ? '\u{1F449} Now' : 'Current'}
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
          href={`/student/subjects/${subjectId}`}
          className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isPlayful ? 'text-purple-400 hover:text-pink-500' : 'text-slate-500 hover:text-primary'}`}
        >
          {isPlayful ? <span>{'\u{1F519}'}</span> : <span className="material-symbols-outlined text-[18px]">arrow_back</span>}
          Back to {subject.name}
        </Link>
      </div>
    </div>
  );
}
