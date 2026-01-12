"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { ActionCardsContainer, ActionCardItem, ActionCardType } from "@/components/ai/ActionCard";

interface ActionCards {
  type: ActionCardType;
  items: ActionCardItem[];
  title?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  followUpQuestions?: string[];
  intent?: string;
  contextUsed?: string[];
  actionCards?: ActionCards;
}

interface AskAIPanelProps {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
  courseName: string;
  videoUrl?: string;
}

// Initial suggestions for lesson-specific questions
const lessonSuggestions = [
  "Explain this lesson in simple terms",
  "What are the key concepts I should remember?",
  "Give me a real-world example",
  "How can I apply this in practice?",
];

// Quick action buttons for personalized queries
const quickActions = [
  { label: "My Progress", query: "How am I doing in all my courses?", icon: "trending_up", color: "from-emerald-500 to-teal-500" },
  { label: "Upcoming Exams", query: "What exams and deadlines do I have coming up?", icon: "event", color: "from-orange-500 to-red-500" },
  { label: "What to Study", query: "What should I focus on next based on my progress?", icon: "psychology", color: "from-purple-500 to-pink-500" },
  { label: "Study Plan", query: "Create a study plan for me for this week", icon: "calendar_month", color: "from-[#7B1113] to-[#a02020]" },
];

// Extract YouTube video ID
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function AskAIPanel({
  lessonId,
  courseId,
  lessonTitle,
  courseName,
  videoUrl,
}: AskAIPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [activeContexts, setActiveContexts] = useState<string[]>([]);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get video thumbnail
  const videoId = videoUrl ? extractVideoId(videoUrl) : null;
  const videoThumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const askQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          lessonId,
          courseId,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasTranscript(data.hasTranscript || false);
        if (data.studentName) setStudentName(data.studentName);
        if (data.contextUsed) setActiveContexts(data.contextUsed);
        if (data.intent) setCurrentIntent(data.intent);

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
          followUpQuestions: data.followUpQuestions,
          intent: data.intent,
          contextUsed: data.contextUsed,
          actionCards: data.actionCards,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.error || "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error asking AI:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I couldn't connect to the AI service. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    askQuestion(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion(input);
    }
  };

  return (
    <div className="mx-4 sm:mx-6 lg:mx-8 mb-8">
      {/* Collapsed State - Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-[#7B1113] to-[#5a0c0e] text-white shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
        >
          <span className="material-symbols-outlined text-2xl">smart_toy</span>
          <span className="font-bold">Ask AI about this lesson</span>
          <span className="material-symbols-outlined">expand_more</span>
        </button>
      )}

      {/* Expanded State - Chat Interface */}
      {isExpanded && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634] shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#7B1113] to-[#5a0c0e] text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <div>
                <h3 className="font-bold">
                  {studentName ? `${studentName}'s Learning Assistant` : "AI Learning Assistant"}
                </h3>
                <div className="flex items-center gap-2 text-xs text-white/80 flex-wrap">
                  {hasTranscript && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">videocam</span>
                      Transcript
                    </span>
                  )}
                  {activeContexts.includes("courses") && (
                    <>
                      {hasTranscript && <span className="w-1 h-1 rounded-full bg-white/60" />}
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">school</span>
                        Courses
                      </span>
                    </>
                  )}
                  {activeContexts.includes("assessments") && (
                    <>
                      {(hasTranscript || activeContexts.includes("courses")) && <span className="w-1 h-1 rounded-full bg-white/60" />}
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">assignment</span>
                        Assessments
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined">expand_less</span>
            </button>
          </div>

          {/* Video Context Card */}
          {videoThumbnail && messages.length === 0 && (
            <div className="mx-4 mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-12 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={videoThumbnail}
                    alt={lessonTitle}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-sm">play_circle</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Learning from:</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {lessonTitle}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{courseName}</p>
                </div>
                <div className="flex-shrink-0 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    RAG Enabled
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7B1113]/20 to-[#5a0c0e]/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-primary">
                    psychology
                  </span>
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                  I&apos;m your personalized learning assistant!
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
                  I know your courses, progress, and upcoming deadlines. Ask me about this lesson or your overall learning journey!
                </p>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 gap-2 w-full max-w-sm mb-4">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => askQuestion(action.query)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r ${action.color} text-white text-xs font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg`}
                    >
                      <span className="material-symbols-outlined text-sm">{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2 w-full max-w-sm mb-4">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400 dark:text-slate-500">or ask about this lesson</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

                {/* Lesson-specific suggestions */}
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {lessonSuggestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => askQuestion(q)}
                      className="px-3 py-2 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#7B1113]/10 hover:text-primary dark:hover:bg-[#7B1113]/20 dark:hover:text-[#e07a7c] transition-all border border-slate-200 dark:border-slate-700 hover:border-[#7B1113]/30 dark:hover:border-[#7B1113]/50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  <div
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#7B1113] to-[#5a0c0e] flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-white rounded-br-md"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md"
                      }`}
                    >
                      {message.role === "user" ? (
                        <p className="text-sm">{message.content}</p>
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">person</span>
                      </div>
                    )}
                  </div>

                  {/* Action Cards */}
                  {message.role === "assistant" && message.actionCards && message.actionCards.items.length > 0 && (
                    <div className="ml-11">
                      <ActionCardsContainer
                        type={message.actionCards.type}
                        items={message.actionCards.items}
                        title={message.actionCards.title}
                      />
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {message.role === "assistant" && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                    <div className="ml-11 mt-3">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        Continue exploring:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.followUpQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => askQuestion(q)}
                            className="px-3 py-1.5 text-xs rounded-full bg-[#7B1113]/10 dark:bg-[#7B1113]/20 text-primary dark:text-[#e07a7c] hover:bg-[#7B1113]/20 dark:hover:bg-[#7B1113]/40 transition-colors border border-[#7B1113]/20 dark:border-[#7B1113]/40"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#7B1113] to-[#5a0c0e] flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                      {studentName ? `Analyzing ${studentName}'s learning data...` : "Analyzing your learning data..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about this lesson..."
                  rows={1}
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 pr-12 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[#7B1113]/20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  <span className="material-symbols-outlined text-sm">psychology</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-[#7B1113] to-[#5a0c0e] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#7B1113]/25 hover:shadow-xl hover:shadow-[#7B1113]/30"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Press Enter to send, Shift+Enter for new line
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {hasTranscript && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-xs">videocam</span>
                    Transcript
                  </span>
                )}
                {activeContexts.includes("profile") && (
                  <span className="text-xs text-primary dark:text-[#e07a7c] flex items-center gap-1 bg-[#7B1113]/10 dark:bg-[#7B1113]/20 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-xs">person</span>
                    Profile
                  </span>
                )}
                {activeContexts.includes("courses") && (
                  <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-xs">school</span>
                    Courses
                  </span>
                )}
                {currentIntent && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-xs">target</span>
                    {currentIntent}
                  </span>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
