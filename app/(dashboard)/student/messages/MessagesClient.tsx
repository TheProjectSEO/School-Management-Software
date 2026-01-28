"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Conversation, DirectMessage, Teacher, RealtimeMessage, MessageStatus } from "@/lib/dal/types";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { usePresence } from "@/hooks/usePresence";
import { TypingIndicator } from "@/components/ui/TypingIndicator";
import { ReadReceiptTicks, getMessageStatus } from "@/components/ui/ReadReceiptTicks";
import { OnlineStatus } from "@/components/ui/OnlineIndicator";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { playMessageSound } from "@/lib/utils/notificationSound";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state for use in subscription callback
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

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

  // Global real-time subscription for all messages involving this user
  // This handles: new message notifications, read receipts, unread count updates
  useEffect(() => {
    if (!profileId) return;

    const supabase = supabaseRef.current;
    console.log("[MessagesClient] Setting up global real-time subscription for:", profileId);

    const channel = supabase
      .channel(`student-messages:${profileId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE)
          schema: "public",
          table: "teacher_direct_messages",
        },
        (payload) => {
          console.log("[MessagesClient] Received real-time event:", payload.eventType, payload);

          const msg = payload.new as {
            id: string;
            from_profile_id: string;
            to_profile_id: string;
            body: string;
            sender_type: string;
            created_at: string;
            is_read: boolean;
            read_at?: string;
            delivered_at?: string;
          } | null;

          if (!msg) return;

          // Only process messages TO or FROM this user
          if (msg.to_profile_id !== profileId && msg.from_profile_id !== profileId) {
            console.log("[MessagesClient] Message not for this user, ignoring");
            return;
          }

          const currentConversation = selectedConversationRef.current;

          // Handle INSERT events (new messages)
          if (payload.eventType === "INSERT") {
            // If message is TO this user (incoming from teacher), play sound and update unread
            if (msg.to_profile_id === profileId) {
              playMessageSound();

              // Update unread count in conversations list
              setConversations((prev) =>
                prev.map((c) =>
                  c.partner_profile_id === msg.from_profile_id
                    ? {
                        ...c,
                        unread_count: c.unread_count + 1,
                        last_message_body: msg.body,
                        last_message_at: msg.created_at,
                      }
                    : c
                )
              );
            }

            // If this message belongs to the current conversation, add it to the list
            if (
              currentConversation &&
              (msg.from_profile_id === currentConversation.partner_profile_id ||
                msg.to_profile_id === currentConversation.partner_profile_id)
            ) {
              setMessages((prev) => {
                // Check if message already exists
                if (prev.some((m) => m.id === msg.id)) return prev;

                const newMsg: RealtimeMessage = {
                  id: msg.id,
                  school_id: schoolId,
                  from_profile_id: msg.from_profile_id,
                  to_profile_id: msg.to_profile_id,
                  body: msg.body,
                  sender_type: msg.sender_type as "teacher" | "student",
                  is_read: msg.is_read,
                  read_at: msg.read_at,
                  delivered_at: msg.delivered_at,
                  created_at: msg.created_at,
                };
                return [...prev, newMsg];
              });

              // If incoming message, mark as read immediately since user is viewing
              if (msg.from_profile_id === currentConversation.partner_profile_id) {
                markAsRead(currentConversation.partner_profile_id);
              }
            }
          }

          // Handle UPDATE events (read receipts, delivered status)
          if (payload.eventType === "UPDATE") {
            console.log("[MessagesClient] Message updated - read:", msg.is_read, "read_at:", msg.read_at);

            // Update messages in current conversation
            if (
              currentConversation &&
              (msg.from_profile_id === currentConversation.partner_profile_id ||
                msg.to_profile_id === currentConversation.partner_profile_id)
            ) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msg.id
                    ? {
                        ...m,
                        is_read: msg.is_read,
                        read_at: msg.read_at,
                        delivered_at: msg.delivered_at,
                      }
                    : m
                )
              );
            }

            // Update unread count when partner reads messages
            // (When teacher reads student's message, is_read becomes true)
            if (msg.is_read && msg.from_profile_id === profileId) {
              // Our message was read by the partner - just update the message state (handled above)
              console.log("[MessagesClient] Our message was read by partner");
            }

            // When we read teacher's messages (handled by markAsRead), update unread count
            if (msg.is_read && msg.to_profile_id === profileId) {
              setConversations((prev) =>
                prev.map((c) =>
                  c.partner_profile_id === msg.from_profile_id
                    ? { ...c, unread_count: Math.max(0, c.unread_count - 1) }
                    : c
                )
              );
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[MessagesClient] Subscription status:", status, err || "");
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      console.log("[MessagesClient] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [profileId, schoolId, markAsRead]);

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

      // Also update conversation unread counts when messages are marked as read
      // Check if any updated message affects current conversation
      if (selectedConversation) {
        updatedMessages.forEach((msg) => {
          if (
            msg.from_profile_id === selectedConversation.partner_profile_id ||
            msg.to_profile_id === selectedConversation.partner_profile_id
          ) {
            // Update conversation unread count
            setConversations((prev) =>
              prev.map((c) =>
                c.partner_profile_id === selectedConversation.partner_profile_id
                  ? { ...c, unread_count: Math.max(0, c.unread_count - 1) }
                  : c
              )
            );
          }
        });
      }
    }
  }, [updatedMessages, selectedConversation]);

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
      const res = await fetchWithAuth(`/api/student/messages/${teacherProfileId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageInput.trim() || isSending) return;

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
      const res = await fetchWithAuth(`/api/student/messages/${selectedConversation.partner_profile_id}`, {
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

        // Update conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.partner_profile_id === selectedConversation.partner_profile_id
              ? { ...c, last_message_body: messageBody, last_message_at: new Date().toISOString() }
              : c
          )
        );
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
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Contact your teachers directly
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-full overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Conversations
              {initialUnreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
                  {initialUnreadCount}
                </span>
              )}
            </h2>
            {/* Connection indicator */}
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-yellow-500"
                }`}
              />
              <span className="text-xs text-slate-500">
                {isConnected ? "Live" : "Connecting..."}
              </span>
            </div>
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
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-full overflow-hidden">
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
