"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer" | "essay";
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
  requiresFileUpload?: boolean;
  fileUploadInstructions?: string | null;
  allowedFileTypes?: string | null;
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
  requiresFileUpload = false,
  fileUploadInstructions,
  allowedFileTypes = 'any',
}: QuizClientProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isSubmitStarted, setIsSubmitStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime] = useState(Date.now());
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{url: string; path: string; name: string; size: number; fileType: string}>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch questions and start quiz
  useEffect(() => {
    async function initQuiz() {
      try {
        setLoading(true);

        // Start the quiz first
        const startRes = await authFetch(`/api/student/assessments/${assessmentId}/start`, {
          method: "POST",
        });
        const startData = await startRes.json();

        if (!startRes.ok) {
          setError(startData.error || "Failed to start quiz");
          return;
        }

        setSubmissionId(startData.submissionId);

        // Get questions and any saved answers
        const questionsRes = await authFetch(`/api/student/assessments/${assessmentId}/questions`);
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
        await authFetch(`/api/student/assessments/${assessmentId}/save-answer`, {
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

  const fileAccept = (() => {
    switch (allowedFileTypes) {
      case 'images': return 'image/*';
      case 'pdf': return 'application/pdf';
      case 'documents': return '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'images,pdf': return 'image/*,application/pdf';
      default: return '*';
    }
  })();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !submissionId) return;

    if (uploadedFiles.length >= 5) {
      setUploadError('Maximum 5 files allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be under 10MB');
      return;
    }

    setUploadingFile(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('submissionId', submissionId);

      const res = await authFetch(`/api/student/assessments/${assessmentId}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Upload failed');
        return;
      }

      setUploadedFiles(prev => [...prev, {
        url: data.url,
        path: data.path,
        name: data.name,
        size: data.size,
        fileType: data.fileType,
      }]);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploadingFile(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle quiz submission
  const handleSubmit = async (autoSubmit = false) => {
    if (!submissionId) return;

    // Validate file upload requirement
    if (requiresFileUpload && uploadedFiles.length === 0 && !autoSubmit) {
      setError('This assignment requires at least one file upload before submitting.');
      return;
    }

    if (!autoSubmit && !showConfirmDialog) {
      setIsSubmitStarted(true); // lock all inputs from this point forward
      setShowConfirmDialog(true);
      return;
    }

    try {
      setSubmitting(true);
      setShowConfirmDialog(false);

      const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);

      const answersArray = Array.from(answers.values());

      const res = await authFetch(`/api/student/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          answers: answersArray,
          timeSpentSeconds,
          fileAttachments: uploadedFiles,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit quiz");
        setSubmitting(false);
        return;
      }

      // Redirect to submission page
      router.push(`/student/assessments/${assessmentId}/submission`);
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
            href={`/student/assessments/${assessmentId}`}
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
            href={`/student/assessments/${assessmentId}`}
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
          <div className="flex items-center gap-4 flex-1 min-w-0">
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

      {/* Read-only notice when submit has been initiated */}
      {isSubmitStarted && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4 text-sm font-medium text-amber-800 dark:text-amber-300">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          Answers are locked — reviewing only. Click <strong>Submit Now</strong> to finalize.
        </div>
      )}

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
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    isSubmitStarted
                      ? "cursor-not-allowed opacity-80"
                      : "cursor-pointer"
                  } ${
                    currentAnswer?.selectedOptionId === option.id
                      ? "border-primary bg-primary/5"
                      : isSubmitStarted
                      ? "border-slate-200 dark:border-slate-700"
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
                  <span className="text-slate-700 dark:text-slate-200 text-base sm:text-lg">
                    {option.option_text}
                  </span>
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option.id}
                    checked={currentAnswer?.selectedOptionId === option.id}
                    disabled={isSubmitStarted}
                    onChange={() =>
                      !isSubmitStarted && handleAnswerChange(currentQuestion.id, option.id)
                    }
                    className="sr-only"
                  />
                </label>
              ))}
            </>
          )}

          {currentQuestion.question_type === "true_false" && (
            <>
              {/* If custom options provided, use them; otherwise use standard True/False */}
              {(currentQuestion.options && currentQuestion.options.length > 0
                ? currentQuestion.options.map((opt) => ({ id: opt.id, text: opt.option_text }))
                : [
                    { id: "true", text: "True" },
                    { id: "false", text: "False" },
                  ]
              ).map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    isSubmitStarted
                      ? "cursor-not-allowed opacity-80"
                      : "cursor-pointer"
                  } ${
                    currentAnswer?.selectedOptionId === option.id
                      ? "border-primary bg-primary/5"
                      : isSubmitStarted
                      ? "border-slate-200 dark:border-slate-700"
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
                  <span className="text-slate-700 dark:text-slate-200 text-base sm:text-lg">
                    {option.text}
                  </span>
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option.id}
                    checked={currentAnswer?.selectedOptionId === option.id}
                    disabled={isSubmitStarted}
                    onChange={() =>
                      !isSubmitStarted && handleAnswerChange(currentQuestion.id, option.id)
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
                className={`w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-lg transition-all resize-none ${
                  isSubmitStarted
                    ? "cursor-not-allowed opacity-80"
                    : "focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
                rows={4}
                placeholder={isSubmitStarted ? "Answers are locked" : "Type your answer here..."}
                value={currentAnswer?.textAnswer || ""}
                disabled={isSubmitStarted}
                onChange={(e) =>
                  !isSubmitStarted && handleAnswerChange(
                    currentQuestion.id,
                    undefined,
                    e.target.value
                  )
                }
              />
            </div>
          )}

          {currentQuestion.question_type === "essay" && (
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Write your essay answer below. Be thorough and organized.</p>
              <textarea
                className={`w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base sm:text-lg transition-all resize-none ${
                  isSubmitStarted
                    ? "cursor-not-allowed opacity-80"
                    : "focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
                rows={8}
                placeholder={isSubmitStarted ? "Answers are locked" : "Write your essay answer here..."}
                value={currentAnswer?.textAnswer || ""}
                disabled={isSubmitStarted}
                onChange={(e) =>
                  !isSubmitStarted && handleAnswerChange(
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

      {/* File Upload Section */}
      {requiresFileUpload && !isSubmitStarted && (
        <div className="mt-6 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">attach_file</span>
            File Submission
            <span className="text-red-500 text-sm font-normal ml-1">*required</span>
          </h3>
          {fileUploadInstructions && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{fileUploadInstructions}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Up to 5 files · Max 10MB each
          </p>

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 mb-3">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">
                    {f.fileType.startsWith('image/') ? 'image' : f.fileType === 'application/pdf' ? 'picture_as_pdf' : 'description'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{f.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(f.size)}</p>
                  </div>
                  {f.fileType.startsWith('image/') && (
                    <img src={f.url} alt={f.name} className="h-10 w-10 object-cover rounded" />
                  )}
                  <button
                    onClick={() => removeFile(i)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {uploadedFiles.length < 5 && (
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors w-fit ${
              uploadingFile
                ? 'border-slate-300 text-slate-400 cursor-not-allowed'
                : 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}>
              {uploadingFile ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-r-transparent"></span>
                  <span className="text-sm">Uploading…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">upload</span>
                  <span className="text-sm font-medium">Choose file to upload</span>
                </>
              )}
              <input
                type="file"
                accept={fileAccept}
                onChange={handleFileUpload}
                disabled={uploadingFile || isSubmitStarted}
                className="hidden"
              />
            </label>
          )}

          {uploadError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-base">error</span>
              {uploadError}
            </p>
          )}
        </div>
      )}

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
          {currentQuestionIndex < questions.length - 1 && !isSubmitStarted && (
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
          )}
          {(currentQuestionIndex === questions.length - 1 || isSubmitStarted) && (
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
                  {requiresFileUpload ? 'Submit Assignment' : 'Submit Quiz'}
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
          <div className="bg-white dark:bg-[#1a2634] rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-msu-gold/20 mb-4">
                <span className="material-symbols-outlined text-msu-gold text-3xl">
                  help
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {requiresFileUpload ? 'Submit Assignment?' : 'Submit Quiz?'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                You have answered {answeredCount} of {questions.length} questions.
                {answeredCount < questions.length && (
                  <span className="block mt-2 text-msu-gold font-medium">
                    {questions.length - answeredCount} questions are unanswered!
                  </span>
                )}
              </p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                <span className="font-semibold text-primary">Note:</span> Answers are now locked. You may review them, but you cannot make changes after this point.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-3 px-4 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Review Answers
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
