"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { playMessageSound } from "@/lib/utils/notificationSound";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/teacher/ui/TypingIndicator";
import { ReadReceiptTicks, getMessageStatus } from "@/components/teacher/ui/ReadReceiptTicks";
import type { MessageStatus } from "@/hooks/useRealtimeMessages";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "teacher" | "student" | "parent" | "admin";
  content: string;
  timestamp: string;
  isRead: boolean;
  readAt?: string | null;
  deliveredAt?: string | null;
  tempId?: string;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  studentProfileId?: string;
  isGroupChat?: boolean;
  sectionId?: string;
  sectionName?: string;
}

interface SearchStudent {
  id: string;
  profile_id: string;
  full_name: string;
  avatar_url?: string;
  section_name?: string;
  grade_level?: string;
}

interface MessagesInterfaceProps {
  userId?: string;
  teacherId?: string;
  profileId?: string;
  schoolId?: string;
}

export default function MessagesInterface({
  teacherId,
  profileId,
  schoolId,
}: MessagesInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state for use in subscription callback
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Typing indicator hook
  const {
    isPartnerTyping,
    partnerTypingState,
    notifyTyping,
    connect: connectTyping,
    disconnect: disconnectTyping,
  } = useTypingIndicator(profileId || null);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchWithAuth("/api/teacher/messages");

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Search for students to start new conversation
  const searchStudents = useCallback(async (query: string) => {
    if (!query.trim() || !teacherId) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetchWithAuth(
        `/api/teacher/messages/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.students || []);
      }
    } catch (err) {
      console.error("Error searching students:", err);
    } finally {
      setIsSearching(false);
    }
  }, [teacherId]);

  // Debounced search
  useEffect(() => {
    if (!showNewConversation) return;
    if (!studentSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchStudents(studentSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [studentSearch, showNewConversation, searchStudents]);

  // Start new conversation with a student
  const startNewConversation = (student: SearchStudent) => {
    // Check if conversation already exists
    const existing = conversations.find(
      (c) => c.studentProfileId === student.profile_id || c.participantId === student.profile_id
    );
    if (existing) {
      setSelectedConversation(existing);
      setShowNewConversation(false);
      setStudentSearch("");
      setSearchResults([]);
      return;
    }

    // Create new conversation object
    const newConv: Conversation = {
      id: `new-${student.profile_id}`,
      participantId: student.profile_id,
      participantName: student.full_name,
      participantRole: "Student",
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      studentProfileId: student.profile_id,
    };

    setConversations([newConv, ...conversations]);
    setSelectedConversation(newConv);
    setMessages([]);
    setShowNewConversation(false);
    setStudentSearch("");
    setSearchResults([]);
  };

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (studentProfileId: string) => {
    try {
      const response = await fetchWithAuth(`/api/teacher/messages/${studentProfileId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();

      // Transform the messages to match our interface
      const transformedMessages: Message[] = (data.messages || []).map((msg: {
        id: string;
        sender_id: string;
        sender_name?: string;
        sender_role?: string;
        content: string;
        created_at: string;
        is_read: boolean;
        read_at?: string | null;
        delivered_at?: string | null;
      }) => ({
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_name || "Unknown",
        senderRole: msg.sender_role || "student",
        content: msg.content,
        timestamp: msg.created_at,
        isRead: msg.is_read,
        readAt: msg.read_at,
        deliveredAt: msg.delivered_at,
      }));

      setMessages(transformedMessages);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, []);

  useEffect(() => {
    const partnerId = selectedConversation?.studentProfileId || selectedConversation?.participantId;
    if (partnerId) {
      fetchMessages(partnerId);
      // Connect typing indicator for this conversation
      connectTyping(partnerId, "Teacher");
      // Mark messages as read
      markMessagesAsRead(partnerId);
    }
    return () => {
      disconnectTyping();
    };
  }, [selectedConversation, fetchMessages, connectTyping, disconnectTyping]);

  // Mark messages as read when viewing a conversation
  const markMessagesAsRead = useCallback(async (partnerProfileId: string) => {
    if (!profileId) return;
    const supabase = supabaseRef.current;
    try {
      await supabase.rpc("mark_messages_read", {
        p_profile_id: profileId,
        p_partner_profile_id: partnerProfileId,
      });
      // Refresh conversations to update unread count
      fetchConversations();
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [profileId, fetchConversations]);

  // Real-time subscription for new messages AND read receipts
  useEffect(() => {
    if (!profileId) return;

    const supabase = supabaseRef.current;

    console.log("[MessagesInterface] Setting up real-time subscription for:", profileId);

    const channel = supabase
      .channel(`teacher-messages:${profileId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to ALL events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "teacher_direct_messages",
        },
        (payload) => {
          console.log("[MessagesInterface] Received real-time event:", payload.eventType, payload);

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
            console.log("[MessagesInterface] Message not for this user, ignoring");
            return;
          }

          // Use ref to get current selected conversation (avoids stale closure)
          const currentConversation = selectedConversationRef.current;
          const partnerId = currentConversation?.studentProfileId || currentConversation?.participantId;

          // Handle INSERT events (new messages)
          if (payload.eventType === "INSERT") {
            // If message is TO this user (incoming), play sound
            if (msg.to_profile_id === profileId) {
              playMessageSound();
            }

            // If this message belongs to the current conversation, add it to the list
            if (partnerId && (msg.from_profile_id === partnerId || msg.to_profile_id === partnerId)) {
              console.log("[MessagesInterface] Adding message to current conversation");

              setMessages((prev) => {
                // Check if message already exists (avoid duplicates from optimistic updates)
                if (prev.some(m => m.id === msg.id)) {
                  return prev;
                }

                const transformedMessage: Message = {
                  id: msg.id,
                  senderId: msg.from_profile_id,
                  senderName: msg.from_profile_id === profileId ? "You" : (currentConversation?.participantName || "Student"),
                  senderRole: msg.sender_type as "teacher" | "student",
                  content: msg.body,
                  timestamp: msg.created_at,
                  isRead: msg.is_read,
                  readAt: msg.read_at,
                  deliveredAt: msg.delivered_at,
                };
                return [...prev, transformedMessage];
              });
            }

            // Refresh conversations list to update last message and unread count
            fetchConversations();
          }

          // Handle UPDATE events (read receipts, delivered status)
          if (payload.eventType === "UPDATE") {
            console.log("[MessagesInterface] Message updated - read:", msg.is_read, "read_at:", msg.read_at);

            // Update the message in the current conversation if it exists
            if (partnerId && (msg.from_profile_id === partnerId || msg.to_profile_id === partnerId)) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msg.id
                    ? {
                        ...m,
                        isRead: msg.is_read,
                        readAt: msg.read_at,
                        deliveredAt: msg.delivered_at,
                      }
                    : m
                )
              );
            }

            // Update conversations list (unread count changes when messages are read)
            // Use a small delay to batch updates
            fetchConversations();
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[MessagesInterface] Subscription status:", status, err || "");
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      console.log("[MessagesInterface] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [profileId, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    const studentProfileId = selectedConversation.studentProfileId || selectedConversation.participantId;
    const messageContent = newMessage.trim();

    // Add optimistic message IMMEDIATELY (before API call)
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: profileId || "current-user",
      senderName: "You",
      senderRole: "teacher",
      content: messageContent,
      timestamp: new Date().toISOString(),
      isRead: false,
      tempId: tempId, // Mark as sending
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setIsSending(true);

    try {
      const response = await fetchWithAuth("/api/teacher/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentProfileId,
          content: messageContent,
        }),
      });

      if (!response.ok) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // Update optimistic message with real ID (remove tempId to show "sent")
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, id: data.message_id || tempId, tempId: undefined } : m
        )
      );

      // Refresh conversations to update last message
      fetchConversations();
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[600px] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Conversations List */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 dark:text-white">Messages</h2>
            <div className="flex items-center gap-2">
              {/* Connection indicator */}
              <div className="flex items-center gap-1">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
                <span className="text-xs text-slate-500">
                  {isConnected ? "Live" : "..."}
                </span>
              </div>
              {/* New Message Button */}
              <button
                onClick={() => setShowNewConversation(true)}
                className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                title="New Message"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="m-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
            <button
              onClick={fetchConversations}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-y-auto" style={{ maxHeight: "calc(600px - 57px)" }}>
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-700 ${
                  selectedConversation?.id === conversation.id
                    ? "bg-slate-100 dark:bg-slate-700"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {conversation.participantName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {conversation.participantRole}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                  {conversation.lastMessage}
                </p>
                {conversation.lastMessageTime && (
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(conversation.lastMessageTime).toLocaleDateString()}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="border-b border-slate-200 p-4 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {selectedConversation.participantName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedConversation.participantRole}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.senderRole === "teacher";
                    const messageStatus = isOwnMessage
                      ? getMessageStatus({
                          is_read: message.isRead,
                          read_at: message.readAt,
                          delivered_at: message.deliveredAt,
                          tempId: message.tempId,
                        })
                      : undefined;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isOwnMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs rounded-lg px-4 py-2 ${
                            isOwnMessage
                              ? "bg-primary text-white"
                              : "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <p className="text-xs opacity-75">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                            {/* Read receipt ticks for own messages */}
                            {isOwnMessage && messageStatus && (
                              <ReadReceiptTicks
                                status={messageStatus}
                                small
                                className={messageStatus === "read" ? "text-blue-300" : "text-white/70"}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Typing indicator */}
            {isPartnerTyping && (
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700">
                <TypingIndicator
                  name={partnerTypingState?.profileName || selectedConversation?.participantName}
                  size="sm"
                />
              </div>
            )}

            {/* Input */}
            <div className="border-t border-slate-200 p-4 dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    // Notify partner that we're typing
                    notifyTyping(e.target.value.length > 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      notifyTyping(false); // Stop typing indicator
                      handleSendMessage();
                    }
                  }}
                  onBlur={() => notifyTyping(false)}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                <button
                  onClick={() => {
                    notifyTyping(false);
                    handleSendMessage();
                  }}
                  disabled={!newMessage.trim() || isSending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSending ? "..." : "Send"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                New Message
              </h2>
              <button
                onClick={() => {
                  setShowNewConversation(false);
                  setStudentSearch("");
                  setSearchResults([]);
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Search for a student in your sections to start a conversation:
              </p>

              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student name..."
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                autoFocus
              />

              <div className="max-h-[50vh] overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {studentSearch.trim() ? (
                      <>
                        <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                        <p>No students found</p>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-4xl mb-2">search</span>
                        <p>Type a name to search</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => startNewConversation(student)}
                        className="w-full p-3 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {student.avatar_url ? (
                              <img
                                src={student.avatar_url}
                                alt={student.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-primary font-semibold text-sm">
                                {student.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {student.full_name}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {student.section_name || student.grade_level || "Student"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
