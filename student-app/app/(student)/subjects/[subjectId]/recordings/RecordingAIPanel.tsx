"use client";

import { useEffect, useRef, useState } from "react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface RecordingAIPanelProps {
  sessionId: string;
  sessionTitle: string;
  courseName: string;
}

const starterQuestions = [
  "Summarize the key takeaways from this session",
  "Explain the most important concept in simple terms",
  "Give me a practice question based on this session",
  "What should I review next?",
];

export function RecordingAIPanel({
  sessionId,
  sessionTitle,
  courseName,
}: RecordingAIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const askQuestion = async (question: string) => {
    if (!question.trim() || isLoading) return;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`/api/live-sessions/${sessionId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          conversationHistory,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setHasTranscript(Boolean(data.hasTranscript));
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.error || "Sorry, I ran into an issue. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Recording AI error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I couldn't reach the AI service. Try again in a moment.",
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Ask AI about this recording
            </h3>
            <p className="text-xs text-slate-500">
              {sessionTitle} • {courseName}
            </p>
          </div>
          {hasTranscript && (
            <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
              Transcript available
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-sm text-slate-500">
            Ask questions grounded in this recording. Try one of these:
            <div className="mt-3 flex flex-wrap gap-2">
              {starterQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => askQuestion(q)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-primary hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {message.role === "assistant" ? (
                  <MarkdownRenderer content={message.content} />
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this recording..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
