import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/dal/student";
import {
  getAssessmentForQuiz,
  getAssessmentSubmission,
  canTakeAssessment,
  getQuestionsForQuiz,
} from "@/lib/dal";

export default async function AssessmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  // Get current student
  const student = await getCurrentStudent();
  if (!student) {
    redirect("/login");
  }

  // Get assessment data
  const assessment = await getAssessmentForQuiz(id);
  if (!assessment) {
    redirect("/assessments");
  }

  // Get existing submission if any
  const submission = await getAssessmentSubmission(id, student.id);

  // Check if student can take the assessment
  const { canTake, reason, attemptCount } = await canTakeAssessment(id, student.id);

  // Get question count
  const questions = await getQuestionsForQuiz(id);
  const questionCount = questions.length;

  // Calculate due date info
  const dueDate = assessment.due_date ? new Date(assessment.due_date) : null;
  const now = new Date();
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isPastDue = dueDate && dueDate < now;
  const isUrgent = daysUntilDue !== null && daysUntilDue <= 2 && !isPastDue;

  // Format due date
  const formattedDueDate = dueDate
    ? dueDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex flex-wrap gap-2 items-center text-sm mb-6">
        <Link
          href="/"
          className="text-slate-500 dark:text-slate-400 hover:text-primary font-medium transition-colors"
        >
          Home
        </Link>
        <span className="text-slate-400 dark:text-slate-600 font-medium">/</span>
        <Link
          href="/assessments"
          className="text-slate-500 dark:text-slate-400 hover:text-primary font-medium transition-colors"
        >
          Assessments
        </Link>
        <span className="text-slate-400 dark:text-slate-600 font-medium">/</span>
        <span className="text-primary dark:text-msu-gold font-medium">
          {assessment.title}
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 dark:border-red-800 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 mt-0.5">
              error
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                Cannot Start Assessment
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {decodeURIComponent(error)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            {assessment.type}
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-sm">|</span>
          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {assessment.course?.name || "Course"}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          {assessment.title}
        </h1>
        {assessment.description && (
          <p className="text-slate-600 dark:text-slate-400">
            {assessment.description}
          </p>
        )}
      </div>

      {/* Status Banner */}
      {submission?.status === "graded" ? (
        <div className="rounded-xl border border-msu-green/30 bg-msu-green/10 p-4 dark:bg-green-900/10 mb-8">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-msu-green mt-0.5">
              check_circle
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-msu-green dark:text-green-300">
                Assessment Completed
              </h3>
              <p className="text-sm text-green-700 dark:text-green-200/80">
                You scored {submission.score}/{assessment.total_points} (
                {Math.round(((submission.score || 0) / assessment.total_points) * 100)}%)
              </p>
            </div>
            <Link
              href={`/assessments/${id}/feedback`}
              className="px-4 py-2 bg-msu-green text-white rounded-lg font-semibold text-sm hover:bg-msu-green/90 transition-colors"
            >
              View Feedback
            </Link>
          </div>
        </div>
      ) : submission?.status === "submitted" ? (
        <div className="rounded-xl border border-msu-gold/30 bg-msu-gold/10 p-4 dark:bg-amber-900/10 mb-8">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-yellow-700 dark:text-amber-500 mt-0.5">
              hourglass_top
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-amber-100">
                Pending Review
              </h3>
              <p className="text-sm text-yellow-800/80 dark:text-amber-200/80">
                Your submission is being reviewed by the instructor.
              </p>
            </div>
            <Link
              href={`/assessments/${id}/submission`}
              className="px-4 py-2 bg-msu-gold text-white rounded-lg font-semibold text-sm hover:bg-msu-gold/90 transition-colors"
            >
              View Submission
            </Link>
          </div>
        </div>
      ) : isPastDue ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:bg-red-900/10 dark:border-red-800 mb-8">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 mt-0.5">
              event_busy
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                Past Due Date
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                This assessment was due on {formattedDueDate}
              </p>
            </div>
          </div>
        </div>
      ) : isUrgent ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 dark:bg-red-900/10 mb-8">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary dark:text-red-400 mt-0.5">
              schedule
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-primary dark:text-red-300">
                Due {daysUntilDue === 0 ? "Today" : daysUntilDue === 1 ? "Tomorrow" : `in ${daysUntilDue} days`}
              </h3>
              <p className="text-sm text-primary/80 dark:text-red-200/80">
                This assessment is due on {formattedDueDate}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assessment Info Card */}
          <div className="bg-white dark:bg-[#1a2634] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Instructions
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              {assessment.instructions ? (
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {assessment.instructions}
                </p>
              ) : (
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {assessment.type === "quiz" || assessment.type === "exam"
                    ? `This ${assessment.type} contains ${questionCount} questions. You will have ${assessment.time_limit_minutes || 60} minutes to complete it.`
                    : `Complete this ${assessment.type} according to the requirements.`}
                </p>
              )}
              <ul className="text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                <li>Read each question carefully before selecting your answer</li>
                <li>You can navigate back and forth between questions</li>
                <li>Your progress is automatically saved</li>
                {formattedDueDate && (
                  <li>You must submit before the deadline to receive credit</li>
                )}
                <li>Once submitted, you cannot modify your answers</li>
              </ul>
            </div>
          </div>

          {/* Materials Section */}
          <div className="bg-white dark:bg-[#1a2634] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Study Materials
            </h2>
            <div className="space-y-3">
              <Link
                href="/downloads"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Study Guide
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">PDF materials</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">
                  download
                </span>
              </Link>
              <Link
                href={`/subjects/${assessment.course_id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-msu-green/10 text-msu-green">
                  <span className="material-symbols-outlined">video_library</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Course Materials
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Lessons and videos</p>
                </div>
                <span className="material-symbols-outlined text-slate-400">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Assessment Details */}
          <div className="bg-white dark:bg-[#1a2634] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Assessment Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Total Points
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {assessment.total_points}
                </p>
              </div>
              {assessment.time_limit_minutes && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Time Limit
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {assessment.time_limit_minutes} minutes
                  </p>
                </div>
              )}
              {questionCount > 0 && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Questions
                  </p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {questionCount}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Attempts
                </p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {attemptCount} / {assessment.max_attempts || 1}
                </p>
              </div>
              {formattedDueDate && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Due Date
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formattedDueDate}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {submission?.status === "graded" ? (
              <>
                <Link
                  href={`/assessments/${id}/feedback`}
                  className="w-full py-3 px-4 bg-msu-green hover:bg-msu-green/90 text-white rounded-lg font-bold transition-colors shadow-lg shadow-msu-green/20 flex items-center justify-center gap-2"
                >
                  View Results
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                </Link>
                {canTake && (
                  <Link
                    href={`/assessments/${id}/quiz`}
                    className="w-full py-3 px-4 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    Retake Assessment
                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                  </Link>
                )}
              </>
            ) : canTake ? (
              <Link
                href={`/assessments/${id}/quiz`}
                className="w-full py-3 px-4 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg font-bold transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {submission?.status === "pending" ? "Continue Assessment" : "Start Assessment"}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            ) : (
              <button
                disabled
                className="w-full py-3 px-4 bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg font-bold cursor-not-allowed flex items-center justify-center gap-2"
              >
                {reason || "Cannot Take Assessment"}
                <span className="material-symbols-outlined text-[20px]">block</span>
              </button>
            )}
            <Link
              href="/assessments"
              className="block w-full py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
            >
              Back to Assessments
            </Link>
          </div>

          {/* Help Card */}
          <div className="bg-msu-gold/10 dark:bg-msu-gold/5 rounded-xl p-4 border border-msu-gold/30">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-msu-gold">
                help
              </span>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                  Need Help?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  Contact your instructor if you have questions about this assessment.
                </p>
                <Link
                  href="/help"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Visit Help Center
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
