"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Conversation, DirectMessage, MessageQuota, Teacher, RealtimeMessage, MessageStatus } from "@/lib/dal/types";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { usePresence } from "@/hooks/usePresence";
import { TypingIndicator } from "@/components/ui/TypingIndicator";
import { ReadReceiptTicks, getMessageStatus } from "@/components/ui/ReadReceiptTicks";
import { OnlineStatus } from "@/components/ui/OnlineIndicator";

interface MessagesClientProps {
  conversations: Conversation[];
  unreadCount: number;
  availableTeachers: (Teacher & { course_name?: string })[];
  studentId: string;
  schoolId: string;
  profileId: string;
}

export function MessagesClient({
  conversations: initialConversations,
  unreadCount: initialUnreadCount,
  availableTeachers,
  studentId,
  schoolId,
  profileId,
}: MessagesClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [quota, setQuota] = useState<MessageQuota | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time hooks
  const {
    subscribeToConversation,
    unsubscribeFromConversation,
    markAsDelivered,
    markAsRead,
    newMessage,
    updatedMessages,
  } = useRealtimeMessages(profileId);

  const {
    isPartnerTyping,
    partnerTypingState,
    notifyTyping,
    connect: connectTyping,
    disconnect: disconnectTyping,
  } = useTypingIndicator(profileId);

  const { isOnline, getLastSeen } = usePresence(profileId, schoolId);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages and subscribe to real-time when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.partner_profile_id);

      // Subscribe to real-time updates for this conversation
      subscribeToConversation(selectedConversation.partner_profile_id);
      connectTyping(selectedConversation.partner_profile_id, "Student");

      // Mark messages as delivered when opening conversation
      markAsDelivered(selectedConversation.partner_profile_id);
    }

    return () => {
      unsubscribeFromConversation();
      disconnectTyping();
    };
  }, [selectedConversation?.partner_profile_id, subscribeToConversation, connectTyping, markAsDelivered, unsubscribeFromConversation, disconnectTyping]);

  // Handle new real-time messages
  useEffect(() => {
    if (newMessage && selectedConversation) {
      // Check if message belongs to current conversation
      const isFromPartner = newMessage.from_profile_id === selectedConversation.partner_profile_id;
      const isToPartner = newMessage.to_profile_id === selectedConversation.partner_profile_id;

      if (isFromPartner || isToPartner) {
        setMessages((prev) => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage as RealtimeMessage];
        });

        // If message is from partner, mark it as read immediately
        if (isFromPartner) {
          markAsRead(selectedConversation.partner_profile_id);
        }

        // Update conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.partner_profile_id === selectedConversation.partner_profile_id
              ? { ...c, last_message_body: newMessage.body, last_message_at: newMessage.created_at }
              : c
          )
        );
      }
    }
  }, [newMessage, selectedConversation?.partner_profile_id]);

  // Handle read receipt updates
  useEffect(() => {
    if (updatedMessages.size > 0) {
      setMessages((prev) =>
        prev.map((msg) => {
          const updated = updatedMessages.get(msg.id);
          if (updated) {
            return {
              ...msg,
              is_read: updated.is_read,
              read_at: updated.read_at,
              delivered_at: updated.delivered_at,
            };
          }
          return msg;
        })
      );
    }
  }, [updatedMessages]);

  // Notify typing when user types
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessageInput(e.target.value);
      if (selectedConversation && e.target.value.trim()) {
        notifyTyping(true);
      }
    },
    [selectedConversation, notifyTyping]
  );

  const loadMessages = async (teacherProfileId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/messages/${teacherProfileId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setQuota(data.quota);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageInput.trim() || isSending) return;
    if (quota && !quota.can_send) return;

    const messageBody = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    // Stop typing indicator
    notifyTyping(false);

    // Optimistic update - add message with "sending" status
    const optimisticMessage: RealtimeMessage = {
      id: tempId,
      school_id: schoolId,
      from_profile_id: profileId,
      to_profile_id: selectedConversation.partner_profile_id,
      body: messageBody,
      sender_type: "student",
      is_read: false,
      created_at: new Date().toISOString(),
      tempId, // Flag as optimistic
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageInput("");
    setIsSending(true);

    try {
      const res = await fetch(`/api/messages/${selectedConversation.partner_profile_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageBody }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: data.message_id, tempId: undefined }
              : m
          )
        );
        setQuota(data.quota);

        // Update conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.partner_profile_id === selectedConversation.partner_profile_id
              ? { ...c, last_message_body: messageBody, last_message_at: new Date().toISOString() }
              : c
          )
        );
      } else if (res.status === 429) {
        // Quota exceeded - remove optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setQuota(data.quota);
        alert(data.message || "You have reached your daily message limit for this teacher.");
      } else {
        // Error - remove optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const startNewConversation = async (teacher: Teacher & { course_name?: string }) => {
    // Check if conversation already exists
    const existing = conversations.find((c) => c.partner_profile_id === teacher.profile_id);
    if (existing) {
      setSelectedConversation(existing);
      setShowNewConversation(false);
      return;
    }

    // Create new conversation object
    const newConversation: Conversation = {
      partner_profile_id: teacher.profile_id,
      partner_name: teacher.profile?.full_name || "Teacher",
      partner_avatar_url: teacher.profile?.avatar_url,
      partner_role: "teacher",
      last_message_body: "",
      last_message_at: new Date().toISOString(),
      last_message_sender_type: "student",
      unread_count: 0,
      total_messages: 0,
      teacher_id: teacher.id,
      course_name: teacher.course_name,
    };

    setConversations([newConversation, ...conversations]);
    setSelectedConversation(newConversation);
    setMessages([]);
    setShowNewConversation(false);
    setTeacherSearch("");

    // Load quota for this teacher
    try {
      const res = await fetch(`/api/messages/quota?teacherId=${teacher.id}`);
      if (res.ok) {
        const data = await res.json();
        setQuota(data.quota);
      }
    } catch (error) {
      console.error("Error loading quota:", error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    if (diffInHours < 168) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredTeachers = availableTeachers.filter((teacher) => {
    if (!teacherSearch.trim()) return true;
    const query = teacherSearch.toLowerCase();
    return (
      teacher.profile?.full_name?.toLowerCase().includes(query) ||
      teacher.course_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Contact your teachers (3 messages/day limit per teacher)
          </p>
        </div>
        <button
          onClick={() => setShowNewConversation(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          New Message
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Conversations
              {initialUnreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                  {initialUnreadCount}
                </span>
              )}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <span className="material-symbols-outlined text-5xl mb-3">chat</span>
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Start by messaging a teacher</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.partner_profile_id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 text-left border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                    selectedConversation?.partner_profile_id === conversation.partner_profile_id
                      ? "bg-primary/5 border-l-4 border-l-primary"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {conversation.partner_avatar_url ? (
                        <img
                          src={conversation.partner_avatar_url}
                          alt={conversation.partner_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-sm">
                          {getInitials(conversation.partner_name)}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {conversation.partner_name}
                        </h3>
                        {conversation.unread_count > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-msu-gold text-black rounded-full">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      {conversation.course_name && (
                        <p className="text-xs text-slate-500 truncate">{conversation.course_name}</p>
                      )}
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                        {conversation.last_message_body || "No messages yet"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatTime(conversation.last_message_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {selectedConversation.partner_avatar_url ? (
                        <img
                          src={selectedConversation.partner_avatar_url}
                          alt={selectedConversation.partner_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-sm">
                          {getInitials(selectedConversation.partner_name)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {selectedConversation.partner_name}
                    </h3>
                    {selectedConversation.course_name && (
                      <p className="text-xs text-slate-500">{selectedConversation.course_name}</p>
                    )}
                    <OnlineStatus
                      isOnline={isOnline(selectedConversation.partner_profile_id)}
                      lastSeen={getLastSeen(selectedConversation.partner_profile_id)}
                    />
                  </div>
                </div>

                {/* Quota Display */}
                {quota && (
                  <div className={`text-sm px-3 py-1 rounded-full ${
                    quota.remaining === 0
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : quota.remaining === 1
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}>
                    {quota.remaining}/{quota.max} messages left today
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <span className="material-symbols-outlined text-5xl mb-3">waving_hand</span>
                    <p>Start the conversation!</p>
                    <p className="text-sm mt-1">Send your first message to this teacher</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender_type === "student";
                    const status: MessageStatus = getMessageStatus(message);
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[70%] ${isOwn ? "order-2" : "order-1"}`}>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isOwn
                                ? "bg-primary text-white rounded-br-md"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.body}</p>
                          </div>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span className="text-xs text-slate-500">
                              {formatTime(message.created_at)}
                            </span>
                            {isOwn && <ReadReceiptTicks status={status} small />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator */}
                {isPartnerTyping && selectedConversation && (
                  <div className="flex items-end gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-xs">
                        {getInitials(selectedConversation.partner_name)}
                      </span>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                      <TypingIndicator size="sm" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                {quota && quota.remaining === 0 ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                    <span className="material-symbols-outlined text-red-500 text-2xl mb-2">
                      timer_off
                    </span>
                    <p className="text-red-700 dark:text-red-400 font-medium">
                      Daily message limit reached
                    </p>
                    <p className="text-red-600 dark:text-red-500 text-sm mt-1">
                      You can send more messages tomorrow at midnight
                    </p>
                  </div>
                ) : (
                  <div className="flex items-end gap-3">
                    <textarea
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type a message... (Shift+Enter for new line)"
                      rows={2}
                      className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      disabled={isSending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !messageInput.trim()}
                      className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSending ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      ) : (
                        <span className="material-symbols-outlined">send</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <span className="material-symbols-outlined text-6xl mb-4">forum</span>
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Or start a new one with a teacher</p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Start New Conversation
              </h2>
              <button
                onClick={() => setShowNewConversation(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Select a teacher from your enrolled courses:
              </p>

              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Start typing a teacher name or course..."
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              />

              {filteredTeachers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                  <p>No teachers available</p>
                  <p className="text-sm mt-1">You need to be enrolled in courses first</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTeachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => startNewConversation(teacher)}
                      className="w-full p-4 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {teacher.profile?.avatar_url ? (
                            <img
                              src={teacher.profile.avatar_url}
                              alt={teacher.profile.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-primary font-semibold text-sm">
                              {getInitials(teacher.profile?.full_name || "T")}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {teacher.profile?.full_name || "Teacher"}
                          </h3>
                          <p className="text-sm text-slate-500">{teacher.course_name}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
