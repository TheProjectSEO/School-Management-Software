import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/dal/student";
import { getAssessmentForQuiz, getAssessmentSubmission, getQuizResult } from "@/lib/dal";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Get current student
  const student = await getCurrentStudent();
  if (!student) {
    redirect("/login");
  }

  // Get assessment
  const assessment = await getAssessmentForQuiz(id);
  if (!assessment) {
    redirect("/assessments");
  }

  // Get submission
  const submission = await getAssessmentSubmission(id, student.id);
  if (!submission) {
    redirect(`/assessments/${id}`);
  }

  const totalPoints = assessment.total_points;
  const score = submission.score || 0;
  const percentage =
    totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const aiScore = submission.ai_score ?? null;
  const aiPercentage =
    aiScore !== null && totalPoints > 0
      ? Math.round((aiScore / totalPoints) * 100)
      : null;

  // Format timestamps
  const submittedAt = submission.submitted_at
    ? new Date(submission.submitted_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Just now";

  const startedAt = (submission as { started_at?: string }).started_at
    ? new Date((submission as { started_at?: string }).started_at!).getTime()
    : null;
  const endedAt = submission.submitted_at
    ? new Date(submission.submitted_at).getTime()
    : Date.now();
  const timeSpentSeconds = (submission as { time_spent_seconds?: number }).time_spent_seconds
    || (startedAt ? Math.floor((endedAt - startedAt) / 1000) : 0);
  const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);
  const timeSpentRemainder = timeSpentSeconds % 60;

  // Determine status display
  const isGraded = submission.status === "graded";
  const isPending = submission.status === "submitted" || submission.status === "pending";

  // Score color based on percentage
  const getScoreColor = () => {
    if (!isGraded) return "text-msu-gold";
    if (percentage >= 90) return "text-msu-green";
    if (percentage >= 70) return "text-blue-600 dark:text-blue-400";
    if (percentage >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreMessage = () => {
    if (!isGraded) return "Awaiting Results";
    if (percentage >= 90) return "Excellent Work!";
    if (percentage >= 80) return "Great Job!";
    if (percentage >= 70) return "Good Effort!";
    if (percentage >= 50) return "Keep Practicing!";
    return "Review the Material";
  };

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
        <Link
          href={`/assessments/${id}`}
          className="text-slate-500 dark:text-slate-400 hover:text-primary font-medium transition-colors"
        >
          {assessment.title}
        </Link>
        <span className="text-slate-400 dark:text-slate-600 font-medium">/</span>
        <span className="text-primary dark:text-msu-gold font-medium">Submission</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          {isGraded ? "Quiz Results" : "Submission Received"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {assessment.title} - {assessment.course?.name}
        </p>
      </div>

      {/* Score Card */}
      {isGraded ? (
        <div
          className={`rounded-xl p-8 border-2 mb-8 ${
            percentage >= 70
              ? "bg-gradient-to-br from-msu-green/10 to-msu-green/5 dark:from-msu-green/20 dark:to-msu-green/5 border-msu-green/30"
              : percentage >= 50
              ? "bg-gradient-to-br from-yellow-50 to-yellow-50/50 dark:from-yellow-900/20 dark:to-yellow-900/10 border-yellow-300"
              : "bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-900/20 dark:to-red-900/10 border-red-300"
          }`}
        >
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold mb-2">
              Your Score
            </p>
            <p className={`text-6xl font-black mb-2 ${getScoreColor()}`}>
              {score}/{totalPoints}
            </p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`text-3xl font-bold ${getScoreColor()}`}>
                {percentage}%
              </span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {getScoreMessage()}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-msu-gold/30 bg-msu-gold/10 p-6 dark:bg-amber-900/10 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-msu-gold/20">
              <span className="material-symbols-outlined text-msu-gold text-3xl">
                cloud_done
              </span>
            </div>
            <div>
              <h3 className="font-bold text-xl text-yellow-900 dark:text-amber-100">
                Submitted Successfully
              </h3>
              <p className="text-yellow-800/80 dark:text-amber-200/80">
                Your quiz has been submitted and is waiting for teacher review.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isGraded && aiScore !== null && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-[#1a2634] dark:border-slate-700 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Draft AI Review
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This is a draft estimate to help teachers review faster.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Estimated Score
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {aiScore}/{totalPoints}
              </p>
              {aiPercentage !== null && (
                <p className="text-sm text-slate-500">{aiPercentage}%</p>
              )}
            </div>
          </div>
          {submission.ai_feedback && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              {submission.ai_feedback}
            </div>
          )}
        </div>
      )}

      {/* Submission Details */}
      <div className="bg-white dark:bg-[#1a2634] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Submission Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Status
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isGraded
                    ? "bg-msu-green"
                    : isPending
                    ? "bg-msu-gold"
                    : "bg-slate-400"
                }`}
              ></span>
              <p className={`text-lg font-semibold ${isGraded ? "text-msu-green" : "text-msu-gold"}`}>
                {isGraded ? "Graded" : "Pending Review"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Submitted At
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {submittedAt}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Time Taken
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {timeSpentMinutes}:{timeSpentRemainder.toString().padStart(2, "0")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Attempt
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {submission.attempt_number || 1} of {assessment.max_attempts || 1}
            </p>
          </div>
        </div>
      </div>

      {/* Performance Summary for graded quizzes */}
      {isGraded && (
        <div className="bg-white dark:bg-[#1a2634] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Performance Summary
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Overall Score
                </span>
                <span className={`font-bold ${getScoreColor()}`}>
                  {percentage}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentage >= 70
                      ? "bg-msu-green"
                      : percentage >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center p-4 rounded-lg bg-msu-green/10">
                <p className="text-2xl font-bold text-msu-green">{score}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Points Earned</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {totalPoints}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Total Points</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{totalPoints - score}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Points Missed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {isGraded && (
          <Link
            href={`/assessments/${id}/feedback`}
            className="py-3 px-6 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg font-semibold transition-colors text-center flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">rate_review</span>
            View Detailed Feedback
          </Link>
        )}
        <Link
          href={`/assessments/${id}`}
          className="py-3 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
        >
          View Assessment Details
        </Link>
        <Link
          href="/assessments"
          className="py-3 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
        >
          Back to Assessments
        </Link>
      </div>
    </>
  );
}
