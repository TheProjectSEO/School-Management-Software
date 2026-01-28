"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  points: number;
  order_index: number;
  options?: {
    id: string;
    option_text: string;
    order_index: number;
  }[];
}

interface Answer {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
}

interface QuizClientProps {
  assessmentId: string;
  studentId: string;
  assessmentTitle: string;
  courseName?: string;
  timeLimitMinutes?: number;
  totalPoints: number;
  attemptNumber: number;
  maxAttempts: number;
}

export default function QuizClient({
  assessmentId,
  studentId,
  assessmentTitle,
  courseName,
  timeLimitMinutes,
  totalPoints,
  attemptNumber,
  maxAttempts,
}: QuizClientProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch questions and start quiz
  useEffect(() => {
    async function initQuiz() {
      try {
        setLoading(true);

        // Start the quiz first
        const startRes = await fetch(`/api/assessments/${assessmentId}/start`, {
          method: "POST",
        });
        const startData = await startRes.json();

        if (!startRes.ok) {
          setError(startData.error || "Failed to start quiz");
          return;
        }

        setSubmissionId(startData.submissionId);

        // Get questions and any saved answers
        const questionsRes = await fetch(`/api/assessments/${assessmentId}/questions`);
        const questionsData = await questionsRes.json();

        if (!questionsRes.ok) {
          setError(questionsData.error || "Failed to load questions");
          return;
        }

        setQuestions(questionsData.questions || []);

        // Restore saved answers if any
        if (questionsData.savedAnswers) {
          const savedMap = new Map<string, Answer>();
          Object.entries(questionsData.savedAnswers).forEach(([questionId, answer]) => {
            const typedAnswer = answer as { selectedOptionId?: string; textAnswer?: string };
            savedMap.set(questionId, {
              questionId,
              selectedOptionId: typedAnswer.selectedOptionId,
              textAnswer: typedAnswer.textAnswer,
            });
          });
          setAnswers(savedMap);
        }

        // Set up timer if there's a time limit
        if (timeLimitMinutes) {
          // Check if there's a pending submission with start time
          if (questionsData.pendingSubmission?.startedAt) {
            const startedAt = new Date(questionsData.pendingSubmission.startedAt).getTime();
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            const remaining = Math.max(0, timeLimitMinutes * 60 - elapsed);
            setTimeRemaining(remaining);
          } else {
            setTimeRemaining(timeLimitMinutes * 60);
          }
        }
      } catch (err) {
        console.error("Error initializing quiz:", err);
        setError("Failed to load quiz");
      } finally {
        setLoading(false);
      }
    }

    initQuiz();
  }, [assessmentId, timeLimitMinutes]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Auto-save answer
  const saveAnswer = useCallback(
    async (questionId: string, selectedOptionId?: string, textAnswer?: string) => {
      if (!submissionId) return;

      try {
        await fetch(`/api/assessments/${assessmentId}/save-answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId,
            questionId,
            selectedOptionId,
            textAnswer,
          }),
        });
      } catch (err) {
        console.error("Error saving answer:", err);
      }
    },
    [assessmentId, submissionId]
  );

  // Handle answer selection
  const handleAnswerChange = (
    questionId: string,
    selectedOptionId?: string,
    textAnswer?: string
  ) => {
    const newAnswer: Answer = { questionId, selectedOptionId, textAnswer };
    setAnswers((prev) => new Map(prev).set(questionId, newAnswer));

    // Debounced auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveAnswer(questionId, selectedOptionId, textAnswer);
    }, 500);
  };

  // Handle quiz submission
  const handleSubmit = async (autoSubmit = false) => {
    if (!submissionId) return;

    if (!autoSubmit && !showConfirmDialog) {
      setShowConfirmDialog(true);
      return;
    }

    try {
      setSubmitting(true);
      setShowConfirmDialog(false);

      const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);

      const answersArray = Array.from(answers.values());

      const res = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          answers: answersArray,
          timeSpentSeconds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit quiz");
        setSubmitting(false);
        return;
      }

      // Redirect to submission page
      router.push(`/assessments/${assessmentId}/submission`);
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError("Failed to submit quiz");
      setSubmitting(false);
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get current question
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;

  // Calculate progress
  const answeredCount = answers.size;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">
              error
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Error Loading Quiz
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <Link
            href={`/assessments/${assessmentId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-[#5a0c0e] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back to Assessment
          </Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-msu-gold/20 mb-4">
            <span className="material-symbols-outlined text-msu-gold text-3xl">
              quiz
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Questions Available
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This quiz does not have any questions yet.
          </p>
          <Link
            href={`/assessments/${assessmentId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-[#5a0c0e] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back to Assessment
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Quiz Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            Quiz
          </span>
          {courseName && (
            <>
              <span className="text-slate-500 dark:text-slate-400 text-sm">|</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                {courseName}
              </span>
            </>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          {assessmentTitle}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
          Attempt {attemptNumber} of {maxAttempts}
        </p>
      </div>

      {/* Timer and Progress Bar */}
      <div className="bg-white dark:bg-[#1a2634] rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Timer */}
          {timeRemaining !== null && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
                timeRemaining <= 60
                  ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : timeRemaining <= 300
                  ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">timer</span>
              {formatTime(timeRemaining)}
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-4 flex-1 min-w-[200px]">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">
                  Progress
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Points */}
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
              Total Points
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {totalPoints}
            </p>
          </div>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="bg-white dark:bg-[#1a2634] rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Question Navigator
        </p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, index) => {
            const isAnswered = answers.has(q.id);
            const isCurrent = index === currentQuestionIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                  isCurrent
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : isAnswered
                    ? "bg-msu-green/20 text-msu-green border-2 border-msu-green"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-[#1a2634] rounded-xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        {/* Question Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="px-3 py-1 rounded-full bg-msu-gold/20 text-msu-gold text-sm font-bold">
            {currentQuestion.points} {currentQuestion.points === 1 ? "point" : "points"}
          </span>
        </div>

        {/* Question Text */}
        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white mb-8 leading-relaxed">
          {currentQuestion.question_text}
        </h2>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQuestion.question_type === "multiple_choice" && currentQuestion.options && (
            <>
              {currentQuestion.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    currentAnswer?.selectedOptionId === option.id
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      currentAnswer?.selectedOptionId === option.id
                        ? "border-primary bg-primary"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {currentAnswer?.selectedOptionId === option.id && (
                      <span className="material-symbols-outlined text-white text-[16px]">
                        check
                      </span>
                    )}
                  </div>
                  <span className="text-slate-700 dark:text-slate-200 text-lg">
                    {option.option_text}
                  </span>
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option.id}
                    checked={currentAnswer?.selectedOptionId === option.id}
                    onChange={() =>
                      handleAnswerChange(currentQuestion.id, option.id)
                    }
                    className="sr-only"
                  />
                </label>
              ))}
            </>
          )}

          {currentQuestion.question_type === "true_false" && (
            <>
              {[
                { id: "true", text: "True" },
                { id: "false", text: "False" },
              ].map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    currentAnswer?.selectedOptionId === option.id
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      currentAnswer?.selectedOptionId === option.id
                        ? "border-primary bg-primary"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {currentAnswer?.selectedOptionId === option.id && (
                      <span className="material-symbols-outlined text-white text-[16px]">
                        check
                      </span>
                    )}
                  </div>
                  <span className="text-slate-700 dark:text-slate-200 text-lg">
                    {option.text}
                  </span>
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option.id}
                    checked={currentAnswer?.selectedOptionId === option.id}
                    onChange={() =>
                      handleAnswerChange(currentQuestion.id, option.id)
                    }
                    className="sr-only"
                  />
                </label>
              ))}
            </>
          )}

          {currentQuestion.question_type === "short_answer" && (
            <div>
              <textarea
                className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                rows={4}
                placeholder="Type your answer here..."
                value={currentAnswer?.textAnswer || ""}
                onChange={(e) =>
                  handleAnswerChange(
                    currentQuestion.id,
                    undefined,
                    e.target.value
                  )
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Previous
        </button>

        <div className="flex items-center gap-3">
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={() =>
                setCurrentQuestionIndex((prev) =>
                  Math.min(questions.length - 1, prev + 1)
                )
              }
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#5a0c0e] text-white rounded-lg font-semibold transition-colors"
            >
              Next
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 bg-msu-green hover:bg-msu-green/90 text-white rounded-lg font-bold shadow-lg shadow-msu-green/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent"></span>
                  Submitting...
                </>
              ) : (
                <>
                  Submit Quiz
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confirm Submit Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1a2634] rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-msu-gold/20 mb-4">
                <span className="material-symbols-outlined text-msu-gold text-3xl">
                  help
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Submit Quiz?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                You have answered {answeredCount} of {questions.length} questions.
                {answeredCount < questions.length && (
                  <span className="block mt-2 text-msu-gold font-medium">
                    {questions.length - answeredCount} questions are unanswered!
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-3 px-4 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Continue Quiz
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="flex-1 py-3 px-4 rounded-lg font-bold bg-primary text-white hover:bg-[#5a0c0e] transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
