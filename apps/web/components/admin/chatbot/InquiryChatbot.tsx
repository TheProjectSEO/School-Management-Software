"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  category?: string;
  needs_escalation?: boolean;
  suggested_questions?: string[];
}

interface InquiryChatbotProps {
  isOpen?: boolean;
  onClose?: () => void;
  floating?: boolean;
  visitorInfo?: {
    name?: string;
    email?: string;
  };
}

export function InquiryChatbot({
  isOpen: controlledOpen,
  onClose,
  floating = true,
  visitorInfo,
}: InquiryChatbotProps) {
  const [isOpen, setIsOpen] = useState(!floating);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use controlled open state if provided
  const actualIsOpen = controlledOpen !== undefined ? controlledOpen : isOpen;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (actualIsOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [actualIsOpen]);

  // Add welcome message on first open
  useEffect(() => {
    if (actualIsOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hello${visitorInfo?.name ? `, ${visitorInfo.name}` : ""}! I'm here to help answer your questions about our school. You can ask me about admissions, programs, fees, schedules, and more. How can I assist you today?`,
          timestamp: new Date(),
          suggested_questions: [
            "How do I apply for admission?",
            "What programs do you offer?",
            "What are the tuition fees?",
          ],
        },
      ]);
    }
  }, [actualIsOpen, messages.length, visitorInfo?.name]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/chatbot/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: conversationId,
          visitor_info: visitorInfo,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      // Update conversation ID
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }

      // Check for escalation
      if (data.response.needs_escalation) {
        setEscalated(true);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: data.response.message,
        timestamp: new Date(),
        category: data.response.category,
        needs_escalation: data.response.needs_escalation,
        suggested_questions: data.response.suggested_questions,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your request. Please try again or contact our admissions office directly.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, visitorInfo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
  };

  // Floating button (when closed)
  if (floating && !actualIsOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-[#5a0c0e] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
        aria-label="Open chat"
      >
        <span className="material-symbols-outlined text-[24px]">chat</span>
      </button>
    );
  }

  // Chat widget
  const chatContent = (
    <div className={`flex flex-col ${floating ? "h-[500px] w-[380px]" : "h-full w-full"}`}>
      {/* Header */}
      <div className="p-4 bg-primary text-white rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined">support_agent</span>
          </div>
          <div>
            <h3 className="font-bold">Admissions Assistant</h3>
            <p className="text-xs text-white/80">
              {isLoading ? "Typing..." : "Ask me anything!"}
            </p>
          </div>
        </div>
        {floating && (
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm rounded-bl-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${
                  msg.role === "user" ? "text-white/70" : "text-slate-400"
                }`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Escalation Notice */}
            {msg.needs_escalation && (
              <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs">
                  <span className="material-symbols-outlined text-[16px]">priority_high</span>
                  A staff member will follow up with you for more details.
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {msg.role === "assistant" && msg.suggested_questions && msg.suggested_questions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {msg.suggested_questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedQuestion(q)}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Escalation Banner */}
      {escalated && (
        <div className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
            Your inquiry has been noted. Our team will contact you soon.
          </p>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 rounded-b-xl"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your question..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-10 h-10 bg-primary hover:bg-[#5a0c0e] text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </div>
      </form>
    </div>
  );

  // Floating widget wrapper
  if (floating) {
    return (
      <div className="fixed bottom-6 right-6 z-50 shadow-2xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        {chatContent}
      </div>
    );
  }

  // Full page/embedded mode
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      {chatContent}
    </div>
  );
}

export default InquiryChatbot;
