"use client";

import { useState, useRef, useEffect } from "react";
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

// Quick action buttons for personalized queries - all using brand maroon colors
const quickActions = [
  { label: "My Progress", query: "How am I doing in all my courses?", icon: "trending_up", color: "from-[#7B1113] to-[#5a0c0e]" },
  { label: "Upcoming Exams", query: "What exams and deadlines do I have coming up?", icon: "event", color: "from-[#8B2123] to-[#7B1113]" },
  { label: "What to Study", query: "What should I focus on next based on my progress?", icon: "psychology", color: "from-[#6B1011] to-[#4a0a0c]" },
  { label: "Study Plan", query: "Create a study plan for me for this week", icon: "calendar_month", color: "from-[#9B2125] to-[#7B1113]" },
];

// General suggestions for learning
const generalSuggestions = [
  "Summarize what I learned this week",
  "Which courses need more attention?",
  "Help me prepare for my next exam",
  "What are my strongest subjects?",
  "Give me study tips for better retention",
  "How can I improve my grades?",
];

export default function AskAIStandalone() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [activeContexts, setActiveContexts] = useState<string[]>([]);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          conversationHistory,
          // No lessonId or courseId - this is a general assistant
        }),
      });

      const data = await response.json();

      if (response.ok) {
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

  const clearChat = () => {
    setMessages([]);
    setActiveContexts([]);
    setCurrentIntent(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#7B1113] to-[#5a0c0e] text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <span className="material-symbols-outlined text-2xl">smart_toy</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {studentName ? `${studentName}'s AI Assistant` : "AI Learning Assistant"}
            </h1>
            <p className="text-sm text-white/80">
              Ask me anything about your courses, progress, or study plans
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            New Chat
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-[#1a2634] border-x border-slate-200 dark:border-slate-700">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7B1113]/20 to-[#5a0c0e]/20 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl text-primary">
                psychology
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Your Personal Learning Assistant
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
              I have access to all your courses, grades, progress, and upcoming assessments. Ask me anything about your academic journey!
            </p>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg mb-6">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => askQuestion(action.query)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${action.color} text-white text-sm font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg hover:scale-[1.02]`}
                >
                  <span className="material-symbols-outlined">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full max-w-lg mb-6">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400 dark:text-slate-500 px-2">or try these questions</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* General suggestions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-xl">
              {generalSuggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => askQuestion(q)}
                  className="px-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#7B1113]/10 hover:text-primary dark:hover:bg-[#7B1113]/20 dark:hover:text-[#e07a7c] transition-all border border-slate-200 dark:border-slate-700 hover:border-[#7B1113]/30 dark:hover:border-[#7B1113]/50"
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
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#7B1113] to-[#5a0c0e] flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">smart_toy</span>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
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
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">person</span>
                  </div>
                )}
              </div>

              {/* Action Cards */}
              {message.role === "assistant" && message.actionCards && message.actionCards.items.length > 0 && (
                <div className="ml-13 pl-13">
                  <ActionCardsContainer
                    type={message.actionCards.type}
                    items={message.actionCards.items}
                    title={message.actionCards.title}
                  />
                </div>
              )}

              {/* Follow-up Questions */}
              {message.role === "assistant" && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                <div className="ml-13 mt-3">
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
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#7B1113] to-[#5a0c0e] flex items-center justify-center">
              <span className="material-symbols-outlined text-white">smart_toy</span>
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
      <form onSubmit={handleSubmit} className="p-4 border border-t-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 rounded-b-xl">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your courses, progress, or study plans..."
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
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#7B1113] to-[#5a0c0e] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#7B1113]/25 hover:shadow-xl hover:shadow-[#7B1113]/30"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Press Enter to send, Shift+Enter for new line
          </p>
          <div className="flex items-center gap-2 flex-wrap">
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
            {activeContexts.includes("assessments") && (
              <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-xs">assignment</span>
                Assessments
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
  );
}
