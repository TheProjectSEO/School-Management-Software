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

interface AdminContact {
  admin_id: string;
  profile_id: string;
  role: string;
  full_name: string;
  avatar_url?: string;
}

interface GroupChat {
  id: string;
  section_id: string;
  name: string;
  description?: string;
  section_name: string;
  member_count: number;
  last_message_body?: string;
  last_message_at?: string;
  last_message_sender?: string;
}

interface GroupMessage {
  id: string;
  sender_profile_id: string;
  sender_name: string;
  sender_avatar_url?: string;
  sender_role: string;
  body: string;
  created_at: string;
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
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [selectedGroupChat, setSelectedGroupChat] = useState<GroupChat | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"direct" | "groups">("direct");
  const [availableAdmins, setAvailableAdmins] = useState<AdminContact[]>([]);
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

  // Fetch group chats
  const fetchGroupChats = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/teacher/messages/groups");
      if (response.ok) {
        const data = await response.json();
        setGroupChats(data.groupChats || []);
      }
    } catch (err) {
      console.error("Error fetching group chats:", err);
    }
  }, []);

  // Fetch available admins
  const fetchAdmins = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/teacher/messages/admins");
      if (response.ok) {
        const data = await response.json();
        setAvailableAdmins(data.admins || []);
      }
    } catch (err) {
      console.error("Error fetching admins:", err);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Sync/create group chats for teacher's sections
  const syncGroupChats = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/teacher/messages/groups", {
        method: "POST",
      });
      if (response.ok) {
        // Refresh group chats after sync
        fetchGroupChats();
      }
    } catch (err) {
      console.error("Error syncing group chats:", err);
    }
  }, [fetchGroupChats]);

  // Fetch group chats on mount and sync
  useEffect(() => {
    syncGroupChats();
  }, [syncGroupChats]);

  // Fetch messages for selected group chat
  const fetchGroupMessages = useCallback(async (groupId: string) => {
    try {
      const response = await fetchWithAuth(`/api/teacher/messages/groups/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setGroupMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching group messages:", err);
    }
  }, []);

  // Handle group chat selection
  useEffect(() => {
    if (selectedGroupChat) {
      fetchGroupMessages(selectedGroupChat.id);
      setSelectedConversation(null); // Deselect direct conversation
    }
  }, [selectedGroupChat, fetchGroupMessages]);

  // Handle direct conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedGroupChat(null); // Deselect group chat
  };

  // Handle sending group message
  const handleSendGroupMessage = async () => {
    if (!newMessage.trim() || !selectedGroupChat || isSending) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Optimistic update
    const optimisticMessage: GroupMessage = {
      id: tempId,
      sender_profile_id: profileId || "",
      sender_name: "You",
      sender_role: "teacher",
      body: messageContent,
      created_at: new Date().toISOString(),
    };

    setGroupMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setIsSending(true);

    try {
      const response = await fetchWithAuth(`/api/teacher/messages/groups/${selectedGroupChat.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageContent }),
      });

      if (!response.ok) {
        setGroupMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      setGroupMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: data.message_id } : m))
      );

      // Refresh group chats to update last message
      fetchGroupChats();
    } catch (err) {
      console.error("Error sending group message:", err);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

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

  // Start new conversation with an admin
  const startAdminConversation = (admin: AdminContact) => {
    const existing = conversations.find(
      (c) => c.participantId === admin.profile_id || c.studentProfileId === admin.profile_id
    );
    if (existing) {
      setSelectedConversation(existing);
      setShowNewConversation(false);
      setStudentSearch("");
      return;
    }

    const newConv: Conversation = {
      id: `new-${admin.profile_id}`,
      participantId: admin.profile_id,
      participantName: admin.full_name,
      participantRole: "Admin",
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      studentProfileId: admin.profile_id,
    };

    setConversations([newConv, ...conversations]);
    setSelectedConversation(newConv);
    setMessages([]);
    setShowNewConversation(false);
    setStudentSearch("");
  };

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
  const fetchMessages = useCallback(async (studentProfileId: string, isAdmin?: boolean) => {
    try {
      const url = isAdmin
        ? `/api/teacher/messages/admins/${studentProfileId}`
        : `/api/teacher/messages/${studentProfileId}`;
      const response = await fetchWithAuth(url);

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
    const isAdmin = selectedConversation?.participantRole === "Admin";
    if (partnerId) {
      fetchMessages(partnerId, isAdmin);
      connectTyping(partnerId, "Teacher");
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
            // If message is FROM this user (outgoing), skip - already handled by optimistic update
            if (msg.from_profile_id === profileId) {
              console.log("[MessagesInterface] Skipping own message (handled by optimistic update)");
              // Still refresh conversations to update last message display
              fetchConversations();
              return;
            }

            // If message is TO this user (incoming), play sound
            if (msg.to_profile_id === profileId) {
              playMessageSound();
            }

            // If this message belongs to the current conversation, add it to the list
            if (partnerId && (msg.from_profile_id === partnerId || msg.to_profile_id === partnerId)) {
              console.log("[MessagesInterface] Adding incoming message to current conversation");

              setMessages((prev) => {
                // Check if message already exists (avoid duplicates)
                if (prev.some(m => m.id === msg.id)) {
                  return prev;
                }

                const transformedMessage: Message = {
                  id: msg.id,
                  senderId: msg.from_profile_id,
                  senderName: currentConversation?.participantName || "Student",
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
    const isAdmin = selectedConversation.participantRole === "Admin";
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
      // Use admin route for admin conversations, standard route for students
      const url = isAdmin
        ? `/api/teacher/messages/admins/${studentProfileId}`
        : "/api/teacher/messages/send";
      const payload = isAdmin
        ? { content: messageContent }
        : { studentProfileId, content: messageContent };

      const response = await fetchWithAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
              {/* New Message Button (only for direct messages) */}
              {activeTab === "direct" && (
                <button
                  onClick={() => setShowNewConversation(true)}
                  className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  title="New Message"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                </button>
              )}
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("direct")}
              className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === "direct"
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Direct
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === "groups"
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Groups
            </button>
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

        <div className="overflow-y-auto flex-1">
          {activeTab === "direct" ? (
            // Direct Messages List
            conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
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
            )
          ) : (
            // Group Chats List
            groupChats.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2 block">groups</span>
                No section group chats yet
              </div>
            ) : (
              groupChats.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupChat(group)}
                  className={`w-full border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-700 ${
                    selectedGroupChat?.id === group.id
                      ? "bg-slate-100 dark:bg-slate-700"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-sm">
                          groups
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {group.section_name || group.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {group.member_count} members
                        </p>
                      </div>
                    </div>
                  </div>
                  {group.last_message_body && (
                    <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{group.last_message_sender}: </span>
                      {group.last_message_body}
                    </p>
                  )}
                  {group.last_message_at && (
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(group.last_message_at).toLocaleDateString()}
                    </p>
                  )}
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          // Direct Message View
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
                    notifyTyping(e.target.value.length > 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      notifyTyping(false);
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
        ) : selectedGroupChat ? (
          // Group Chat View
          <>
            {/* Header */}
            <div className="border-b border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                    groups
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {selectedGroupChat.section_name || selectedGroupChat.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedGroupChat.member_count} members
                  </p>
                </div>
              </div>
            </div>

            {/* Group Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {groupMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl mb-2 block">forum</span>
                    No messages yet. Start the conversation!
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupMessages.map((message) => {
                    const isOwnMessage = message.sender_profile_id === profileId;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-xs ${isOwnMessage ? "" : "flex gap-2"}`}>
                          {!isOwnMessage && (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                              {message.sender_avatar_url ? (
                                <img
                                  src={message.sender_avatar_url}
                                  alt={message.sender_name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                  {message.sender_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isOwnMessage
                                ? "bg-primary text-white"
                                : "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white"
                            }`}
                          >
                            {!isOwnMessage && (
                              <p className="text-xs font-medium mb-1 opacity-75">
                                {message.sender_name}
                                {message.sender_role === "teacher" && (
                                  <span className="ml-1 text-purple-600 dark:text-purple-400">(Teacher)</span>
                                )}
                              </p>
                            )}
                            <p className="text-sm">{message.body}</p>
                            <p className="mt-1 text-xs opacity-75 text-right">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Group Input */}
            <div className="border-t border-slate-200 p-4 dark:border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      handleSendGroupMessage();
                    }
                  }}
                  placeholder="Type a message to the group..."
                  disabled={isSending}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                <button
                  onClick={handleSendGroupMessage}
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
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl mb-2 block">chat</span>
              Select a conversation to start messaging
            </div>
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
                Search for a student or select an admin to start a conversation:
              </p>

              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                autoFocus
              />

              <div className="max-h-[50vh] overflow-y-auto">
                {/* Admins Section */}
                {availableAdmins.length > 0 && (!studentSearch.trim() || availableAdmins.some(a => a.full_name.toLowerCase().includes(studentSearch.toLowerCase()))) && (
                  <>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Admins
                    </p>
                    <div className="space-y-2 mb-4">
                      {availableAdmins
                        .filter(a => !studentSearch.trim() || a.full_name.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map((admin) => (
                          <button
                            key={admin.admin_id}
                            onClick={() => startAdminConversation(admin)}
                            className="w-full p-3 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                {admin.avatar_url ? (
                                  <img
                                    src={admin.avatar_url}
                                    alt={admin.full_name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-amber-700 dark:text-amber-400 font-semibold text-sm">
                                    {admin.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </span>
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {admin.full_name}
                                </h3>
                                <p className="text-sm text-slate-500 capitalize">
                                  {admin.role?.replace(/_/g, " ") || "Admin"}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </>
                )}

                {/* Students Section */}
                {studentSearch.trim() && (
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Students
                  </p>
                )}
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : searchResults.length === 0 && studentSearch.trim() ? (
                  <div className="text-center py-4 text-slate-500">
                    <p className="text-sm">No students found</p>
                  </div>
                ) : !studentSearch.trim() && availableAdmins.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2">search</span>
                    <p>Type a name to search</p>
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
