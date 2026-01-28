import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/dal/student";
import {
  getAssessmentForQuiz,
  getAssessmentSubmission,
  getQuizResult,
} from "@/lib/dal";

export default async function FeedbackPage({
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

  // Get quiz result with all answers
  const quizResult = await getQuizResult(submission.id);

  const score = submission.score || 0;
  const totalPoints = assessment.total_points;
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

  // Calculate statistics
  const correctCount = quizResult?.answers.filter((a) => a.is_correct).length || 0;
  const incorrectCount = quizResult?.answers.filter((a) => !a.is_correct).length || 0;
  const totalQuestions = quizResult?.answers.length || 0;

  // Score color based on percentage
  const getScoreColor = () => {
    if (percentage >= 90) return "text-msu-green";
    if (percentage >= 70) return "text-blue-600 dark:text-blue-400";
    if (percentage >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreMessage = () => {
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
        <span className="text-primary dark:text-msu-gold font-medium">Feedback</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Assessment Feedback
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {assessment.title} - {assessment.course?.name}
        </p>
      </div>

      {/* Score Card */}
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
          <p className={`text-3xl font-bold mb-2 ${getScoreColor()}`}>{percentage}%</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {getScoreMessage()}
          </p>
        </div>
      </div>

      {/* Instructor Feedback */}
      {submission.feedback && (
        <div className="bg-white dark:bg-[#1a2634] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">comment</span>
            Instructor Feedback
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-slate-600 dark:text-slate-400">{submission.feedback}</p>
          </div>
        </div>
      )}

      {/* Performance Breakdown */}
      <div className="bg-white dark:bg-[#1a2634] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Performance Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 rounded-lg bg-msu-green/10 border border-msu-green/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-symbols-outlined text-msu-green">check_circle</span>
              <p className="text-3xl font-bold text-msu-green">{correctCount}</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Correct Answers</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">cancel</span>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{incorrectCount}</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Incorrect Answers</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">help</span>
              <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">{totalQuestions}</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Total Questions</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Accuracy Rate
            </span>
            <span className={`font-bold ${getScoreColor()}`}>
              {totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0}%
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
              style={{ width: `${totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question-by-Question Review */}
      {quizResult && quizResult.answers.length > 0 && (
        <div className="bg-white dark:bg-[#1a2634] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            Question Review
          </h2>
          <div className="space-y-6">
            {quizResult.answers
              .sort((a, b) => (a.question?.order_index || 0) - (b.question?.order_index || 0))
              .map((answer, index) => {
                const question = answer.question;
                if (!question) return null;

                const isCorrect = answer.is_correct;
                const correctOption = question.options?.find((o) => o.is_correct);

                return (
                  <div
                    key={answer.id}
                    className={`p-4 rounded-xl border-2 ${
                      isCorrect
                        ? "border-msu-green/30 bg-msu-green/5"
                        : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                          isCorrect
                            ? "bg-msu-green text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isCorrect ? "check" : "close"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                          Question {index + 1} | {question.points} {question.points === 1 ? "point" : "points"}
                        </p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {question.question_text}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          isCorrect
                            ? "bg-msu-green/20 text-msu-green"
                            : "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {answer.points_earned}/{question.points}
                      </span>
                    </div>

                    {/* Answer Details */}
                    <div className="ml-11 space-y-3">
                      {/* Your Answer */}
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide w-24 flex-shrink-0 pt-0.5">
                          Your Answer:
                        </span>
                        <p
                          className={`font-medium ${
                            isCorrect
                              ? "text-msu-green"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {question.question_type === "multiple_choice"
                            ? answer.selected_option?.option_text || "No answer selected"
                            : question.question_type === "true_false"
                            ? answer.selected_option_id === "true"
                              ? "True"
                              : answer.selected_option_id === "false"
                              ? "False"
                              : "No answer selected"
                            : answer.text_answer || "No answer provided"}
                        </p>
                      </div>

                      {/* Correct Answer (if wrong) */}
                      {!isCorrect && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide w-24 flex-shrink-0 pt-0.5">
                            Correct:
                          </span>
                          <p className="font-medium text-msu-green">
                            {question.question_type === "multiple_choice"
                              ? correctOption?.option_text
                              : question.question_type === "true_false"
                              ? question.correct_answer === "true"
                                ? "True"
                                : "False"
                              : question.correct_answer}
                          </p>
                        </div>
                      )}

                      {/* Explanation */}
                      {question.explanation && (
                        <div className="flex items-start gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="material-symbols-outlined text-msu-gold text-[18px] flex-shrink-0">
                            lightbulb
                          </span>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/assessments/${id}`}
          className="py-3 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center"
        >
          View Assessment Details
        </Link>
        <Link
          href="/assessments"
          className="py-3 px-6 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg font-semibold transition-colors text-center"
        >
          Back to Assessments
        </Link>
      </div>
    </>
  );
}
