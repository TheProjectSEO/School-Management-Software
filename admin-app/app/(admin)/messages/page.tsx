"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Admin Messaging Page
 * Two-column layout for admin to communicate with teachers and students
 * Features: Search users, real-time updates, message thread, read receipts
 */

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface Conversation {
  partner_profile_id: string;
  partner_name: string;
  partner_avatar_url?: string;
  partner_role: "teacher" | "student";
  last_message_body: string;
  last_message_at: string;
  last_message_sender_type: "admin" | "teacher" | "student";
  unread_count: number;
  total_messages: number;
}

interface Message {
  id: string;
  school_id: string;
  from_profile_id: string;
  to_profile_id: string;
  body: string;
  sender_type: "admin" | "teacher" | "student";
  is_read: boolean;
  read_at?: string;
  delivered_at?: string;
  created_at: string;
  status?: "sending" | "sent" | "delivered" | "read";
  tempId?: string;
}

interface User {
  profile_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: "teacher" | "student";
  grade_level?: string;
  section_name?: string;
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagePollingRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Poll for new messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.partner_profile_id);

      // Poll every 5 seconds for real-time updates
      messagePollingRef.current = setInterval(() => {
        loadMessages(selectedConversation.partner_profile_id, true);
      }, 5000);
    }

    return () => {
      if (messagePollingRef.current) {
        clearInterval(messagePollingRef.current);
      }
    };
  }, [selectedConversation?.partner_profile_id]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/messages/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (profileId: string, silent = false) => {
    if (!silent) setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/messages/${profileId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);

        // Mark messages as read
        if (data.messages?.length > 0) {
          markMessagesAsRead(profileId);
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async (profileId: string) => {
    try {
      await fetch(`/api/admin/messages/${profileId}/read`, {
        method: "POST",
      });

      // Update conversation unread count
      setConversations((prev) =>
        prev.map((c) =>
          c.partner_profile_id === profileId
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageInput.trim() || isSending) return;

    const messageBody = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic update
    const optimisticMessage: Message = {
      id: tempId,
      school_id: "",
      from_profile_id: "",
      to_profile_id: selectedConversation.partner_profile_id,
      body: messageBody,
      sender_type: "admin",
      is_read: false,
      created_at: new Date().toISOString(),
      status: "sending",
      tempId,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientProfileId: selectedConversation.partner_profile_id,
          message: messageBody,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: data.message_id, status: "sent", tempId: undefined }
              : m
          )
        );

        // Update conversation list
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.partner_profile_id === selectedConversation.partner_profile_id
              ? {
                  ...c,
                  last_message_body: messageBody,
                  last_message_at: new Date().toISOString(),
                  last_message_sender_type: "admin" as const,
                }
              : c
          );
          // Move conversation to top
          const current = updated.find(
            (c) => c.partner_profile_id === selectedConversation.partner_profile_id
          );
          const others = updated.filter(
            (c) => c.partner_profile_id !== selectedConversation.partner_profile_id
          );
          return current ? [current, ...others] : updated;
        });
      } else {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/admin/messages/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const startNewConversation = (user: User) => {
    // Check if conversation already exists
    const existing = conversations.find(
      (c) => c.partner_profile_id === user.profile_id
    );
    if (existing) {
      setSelectedConversation(existing);
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    // Create new conversation
    const newConversation: Conversation = {
      partner_profile_id: user.profile_id,
      partner_name: user.full_name,
      partner_avatar_url: user.avatar_url,
      partner_role: user.role,
      last_message_body: "",
      last_message_at: new Date().toISOString(),
      last_message_sender_type: "admin",
      unread_count: 0,
      total_messages: 0,
    };

    setConversations([newConversation, ...conversations]);
    setSelectedConversation(newConversation);
    setMessages([]);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
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

  const getRoleBadgeColor = (role: "teacher" | "student") => {
    return role === "teacher"
      ? "bg-purple-100 text-purple-700"
      : "bg-blue-100 text-blue-700";
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500 mt-1">Communicate with teachers and students</p>
        </div>
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          New Message
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Conversations</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="material-symbols-outlined text-5xl mb-3 block text-gray-300">
                  chat
                </span>
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm mt-1">Start by messaging a user</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.partner_profile_id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedConversation?.partner_profile_id ===
                    conversation.partner_profile_id
                      ? "bg-red-50 border-l-4 border-l-primary"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {conversation.partner_avatar_url ? (
                          <img
                            src={conversation.partner_avatar_url}
                            alt={conversation.partner_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-semibold text-sm">
                            {getInitials(conversation.partner_name)}
                          </span>
                        )}
                      </div>
                      {conversation.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.partner_name}
                        </h3>
                        <span className="text-xs text-gray-400 ml-2">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(
                            conversation.partner_role
                          )}`}
                        >
                          {conversation.partner_role === "teacher"
                            ? "Teacher"
                            : "Student"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.last_message_sender_type === "admin" && "You: "}
                        {conversation.last_message_body || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {selectedConversation.partner_avatar_url ? (
                      <img
                        src={selectedConversation.partner_avatar_url}
                        alt={selectedConversation.partner_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 font-semibold text-sm">
                        {getInitials(selectedConversation.partner_name)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedConversation.partner_name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(
                        selectedConversation.partner_role
                      )}`}
                    >
                      {selectedConversation.partner_role === "teacher"
                        ? "Teacher"
                        : "Student"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <span className="material-symbols-outlined text-5xl mb-3 text-gray-300">
                      waving_hand
                    </span>
                    <p className="font-medium">Start the conversation!</p>
                    <p className="text-sm mt-1">Send your first message</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.sender_type === "admin";
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
                                : "bg-gray-100 text-gray-900 rounded-bl-md"
                            }`}
                          >
                            {isOwn && (
                              <span className="text-xs font-semibold opacity-80 block mb-1">
                                ADMIN
                              </span>
                            )}
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          </div>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span className="text-xs text-gray-500">
                              {formatTime(message.created_at)}
                            </span>
                            {isOwn && (
                              <span className="text-xs text-gray-500">
                                {message.status === "sending" && "Sending..."}
                                {message.is_read && message.status !== "sending" && (
                                  <span className="material-symbols-outlined text-[14px] text-blue-500">
                                    done_all
                                  </span>
                                )}
                                {!message.is_read &&
                                  message.status !== "sending" && (
                                    <span className="material-symbols-outlined text-[14px] text-gray-400">
                                      done
                                    </span>
                                  )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex items-end gap-3">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message... (Shift+Enter for new line)"
                    rows={2}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || !messageInput.trim()}
                    className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <span className="material-symbols-outlined text-6xl mb-4 text-gray-300">
                forum
              </span>
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Or start a new one with a user</p>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Start New Conversation
              </h2>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  placeholder="Search by name or email..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <span className="material-symbols-outlined">search</span>
                  )}
                </button>
              </div>

              <div className="overflow-y-auto max-h-[50vh]">
                {searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block text-gray-300">
                      person_search
                    </span>
                    <p className="text-sm">
                      {searchQuery
                        ? "No users found"
                        : "Search for teachers or students"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <button
                        key={user.profile_id}
                        onClick={() => startNewConversation(user)}
                        className="w-full p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-600 font-semibold text-sm">
                                {getInitials(user.full_name)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {user.full_name}
                            </h3>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(
                                  user.role
                                )}`}
                              >
                                {user.role === "teacher" ? "Teacher" : "Student"}
                              </span>
                              {user.grade_level && (
                                <span className="text-xs text-gray-500">
                                  Grade {user.grade_level}
                                </span>
                              )}
                              {user.section_name && (
                                <span className="text-xs text-gray-500">
                                  {user.section_name}
                                </span>
                              )}
                            </div>
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
