"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Conversation, Teacher, RealtimeMessage, MessageStatus } from "@/lib/dal/types";
import type { PeerStudent } from "@/lib/dal/student-messages";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { usePresence } from "@/hooks/usePresence";
import { TypingIndicator } from "@/components/ui/TypingIndicator";
import { ReadReceiptTicks, getMessageStatus } from "@/components/ui/ReadReceiptTicks";
import { OnlineStatus } from "@/components/ui/OnlineIndicator";
import { fetchWithAuth } from "@/lib/utils/fetchWithAuth";
import { playMessageSound } from "@/lib/utils/notificationSound";
import { useStudentTheme } from "@/components/student/providers/StudentThemeProvider";

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

interface MessagesClientProps {
  conversations: Conversation[];
  unreadCount: number;
  availableTeachers: (Teacher & { course_name?: string })[];
  availablePeers: PeerStudent[];
  groupChats: GroupChat[];
  schoolId: string;
  profileId: string;
}

export function MessagesClient({
  conversations: initialConversations,
  unreadCount: initialUnreadCount,
  availableTeachers,
  availablePeers,
  groupChats: initialGroupChats,
  schoolId,
  profileId,
}: MessagesClientProps) {
  const { isPlayful } = useStudentTheme();
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<"direct" | "groups">("direct");
  const [groupChats] = useState<GroupChat[]>(initialGroupChats);
  const [selectedGroupChat, setSelectedGroupChat] = useState<GroupChat | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
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
  useEffect(() => {
    if (!profileId) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`student-messages:${profileId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_direct_messages",
        },
        (payload) => {
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

          if (msg.to_profile_id !== profileId && msg.from_profile_id !== profileId) {
            return;
          }

          const currentConversation = selectedConversationRef.current;

          if (payload.eventType === "INSERT") {
            if (msg.from_profile_id === profileId) {
              return;
            }

            if (msg.to_profile_id === profileId) {
              playMessageSound();

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

            if (
              currentConversation &&
              msg.from_profile_id === currentConversation.partner_profile_id
            ) {
              setMessages((prev) => {
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

              markAsRead(currentConversation.partner_profile_id);
            }
          }

          if (payload.eventType === "UPDATE") {
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
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, schoolId, markAsRead]);

  // Real-time subscription for group chat messages
  useEffect(() => {
    if (!profileId) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`student-group-messages:${profileId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "section_group_chat_messages",
        },
        (payload) => {
          const msg = payload.new as {
            id: string;
            group_chat_id: string;
            sender_profile_id: string;
            sender_role: string;
            body: string;
            created_at: string;
          } | null;

          if (!msg) return;
          if (msg.sender_profile_id === profileId) return;

          // If viewing this group chat, add the message
          if (selectedGroupChat && msg.group_chat_id === selectedGroupChat.id) {
            setGroupMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [
                ...prev,
                {
                  id: msg.id,
                  sender_profile_id: msg.sender_profile_id,
                  sender_name: "Member",
                  sender_role: msg.sender_role,
                  body: msg.body,
                  created_at: msg.created_at,
                },
              ];
            });
            playMessageSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, selectedGroupChat?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  // Load messages and subscribe to real-time when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.partner_profile_id, selectedConversation.partner_role);

      subscribeToConversation(selectedConversation.partner_profile_id);
      connectTyping(selectedConversation.partner_profile_id, "Student");
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
      const isFromPartner = newMessage.from_profile_id === selectedConversation.partner_profile_id;
      const isToPartner = newMessage.to_profile_id === selectedConversation.partner_profile_id;

      if (isFromPartner || isToPartner) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage as RealtimeMessage];
        });

        if (isFromPartner) {
          markAsRead(selectedConversation.partner_profile_id);
        }

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

      if (selectedConversation) {
        updatedMessages.forEach((msg) => {
          if (
            msg.from_profile_id === selectedConversation.partner_profile_id ||
            msg.to_profile_id === selectedConversation.partner_profile_id
          ) {
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

  const loadMessages = async (partnerProfileId: string, partnerRole: string) => {
    setIsLoading(true);
    try {
      // Use different API route for peers vs teachers
      const url =
        partnerRole === "student"
          ? `/api/student/messages/peers/${partnerProfileId}`
          : `/api/student/messages/${partnerProfileId}`;
      const res = await fetchWithAuth(url);
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

  // Fetch group chat messages
  const fetchGroupMessages = useCallback(async (groupId: string) => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/student/messages/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroupMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching group messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle group chat selection
  const handleSelectGroupChat = (group: GroupChat) => {
    setSelectedGroupChat(group);
    setSelectedConversation(null);
    fetchGroupMessages(group.id);
    setShowMobileChat(true);
  };

  // Handle direct conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setSelectedGroupChat(null);
    setGroupMessages([]);
    setShowMobileChat(true);
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageInput.trim() || isSending) return;

    const messageBody = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    notifyTyping(false);

    const optimisticMessage: RealtimeMessage = {
      id: tempId,
      school_id: schoolId,
      from_profile_id: profileId,
      to_profile_id: selectedConversation.partner_profile_id,
      body: messageBody,
      sender_type: "student",
      is_read: false,
      created_at: new Date().toISOString(),
      tempId,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageInput("");
    setIsSending(true);

    try {
      // Use different API route for peers vs teachers
      const url =
        selectedConversation.partner_role === "student"
          ? `/api/student/messages/peers/${selectedConversation.partner_profile_id}`
          : `/api/student/messages/${selectedConversation.partner_profile_id}`;

      const res = await fetchWithAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageBody }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: data.message_id, tempId: undefined }
              : m
          )
        );

        setConversations((prev) =>
          prev.map((c) =>
            c.partner_profile_id === selectedConversation.partner_profile_id
              ? { ...c, last_message_body: messageBody, last_message_at: new Date().toISOString() }
              : c
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle sending group message
  const handleSendGroupMessage = async () => {
    if (!selectedGroupChat || !messageInput.trim() || isSending) return;

    const messageBody = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: GroupMessage = {
      id: tempId,
      sender_profile_id: profileId,
      sender_name: "You",
      sender_role: "student",
      body: messageBody,
      created_at: new Date().toISOString(),
    };

    setGroupMessages((prev) => [...prev, optimisticMessage]);
    setMessageInput("");
    setIsSending(true);

    try {
      const res = await fetchWithAuth(`/api/student/messages/groups/${selectedGroupChat.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageBody }),
      });

      if (!res.ok) {
        setGroupMessages((prev) => prev.filter((m) => m.id !== tempId));
        alert("Failed to send message.");
      } else {
        const data = await res.json();
        setGroupMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: data.message_id } : m))
        );
      }
    } catch (error) {
      console.error("Error sending group message:", error);
      setGroupMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const startNewConversation = async (teacher: Teacher & { course_name?: string }) => {
    const existing = conversations.find((c) => c.partner_profile_id === teacher.profile_id);
    if (existing) {
      handleSelectConversation(existing);
      setShowNewConversation(false);
      return;
    }

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
    handleSelectConversation(newConversation);
    setMessages([]);
    setShowNewConversation(false);
    setTeacherSearch("");
  };

  const startPeerConversation = (peer: PeerStudent) => {
    const existing = conversations.find((c) => c.partner_profile_id === peer.profile_id);
    if (existing) {
      handleSelectConversation(existing);
      setShowNewConversation(false);
      return;
    }

    const newConversation: Conversation = {
      partner_profile_id: peer.profile_id,
      partner_name: peer.full_name,
      partner_avatar_url: peer.avatar_url ?? undefined,
      partner_role: "student",
      last_message_body: "",
      last_message_at: new Date().toISOString(),
      last_message_sender_type: "student",
      unread_count: 0,
      total_messages: 0,
    };

    setConversations([newConversation, ...conversations]);
    handleSelectConversation(newConversation);
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

  const filteredPeers = availablePeers.filter((peer) => {
    if (!teacherSearch.trim()) return true;
    return peer.full_name.toLowerCase().includes(teacherSearch.toLowerCase());
  });

  // Determine if we're in DM or group chat mode for the send handler
  const handleSend = () => {
    if (selectedGroupChat) {
      handleSendGroupMessage();
    } else {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 flex-shrink-0 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {isPlayful ? "\u{1F4AC} Messages" : "Messages"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {isPlayful
              ? "Talk to your teachers and friends!"
              : "Chat with teachers, classmates, and section groups"}
          </p>
        </div>
        {activeTab === "direct" && (
          <button
            onClick={() => setShowNewConversation(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isPlayful
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            <span className="material-symbols-outlined text-xl">add</span>
            {isPlayful ? "New Chat" : "New Message"}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
        {/* Conversations List */}
        <div className={`lg:col-span-1 flex-col max-h-full overflow-hidden ${showMobileChat ? 'hidden lg:flex' : 'flex'} ${
          isPlayful
            ? "bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200"
            : "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
        }`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Conversations
                {initialUnreadCount > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded-full ${
                    isPlayful
                      ? "bg-pink-500 text-white"
                      : "bg-primary text-white"
                  }`}>
                    {initialUnreadCount}
                  </span>
                )}
              </h2>
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

          <div className="flex-1 overflow-y-auto">
            {activeTab === "direct" ? (
              // Direct Messages List
              conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <span className="material-symbols-outlined text-5xl mb-3">chat</span>
                  <p>{isPlayful ? "\u{1F4AD} No chats yet!" : "No conversations yet"}</p>
                  <p className="text-sm mt-1">
                    {isPlayful
                      ? "Send a message to your teacher or a classmate!"
                      : "Start by messaging a teacher or classmate"}
                  </p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.partner_profile_id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full p-4 text-left border-b transition-colors ${
                      isPlayful
                        ? `border-pink-100 hover:bg-pink-100/50 ${
                            selectedConversation?.partner_profile_id === conversation.partner_profile_id
                              ? "bg-pink-100/70 border-l-4 border-l-pink-500"
                              : ""
                          }`
                        : `border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                            selectedConversation?.partner_profile_id === conversation.partner_profile_id
                              ? "bg-primary/5 border-l-4 border-l-primary"
                              : ""
                          }`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        conversation.partner_role === "student" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-primary/10"
                      }`}>
                        {conversation.partner_avatar_url ? (
                          <img
                            src={conversation.partner_avatar_url}
                            alt={conversation.partner_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className={`font-semibold text-sm ${
                            conversation.partner_role === "student" ? "text-blue-600 dark:text-blue-400" : "text-primary"
                          }`}>
                            {getInitials(conversation.partner_name)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                              {conversation.partner_name}
                            </h3>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              conversation.partner_role === "student"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            }`}>
                              {conversation.partner_role === "student" ? "Student" : "Teacher"}
                            </span>
                          </div>
                          {conversation.unread_count > 0 && (
                            <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                              isPlayful
                                ? "bg-pink-500 text-white"
                                : "bg-msu-gold text-black"
                            }`}>
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
              )
            ) : (
              // Group Chats List
              groupChats.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <span className="material-symbols-outlined text-5xl mb-3">groups</span>
                  <p>{isPlayful ? "\u{1F465} No group chats yet!" : "No section group chats yet"}</p>
                  <p className="text-sm mt-1">
                    {isPlayful
                      ? "You'll get group chats when you join a section!"
                      : "Group chats are created when you\u0027re enrolled in a section"}
                  </p>
                </div>
              ) : (
                groupChats.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroupChat(group)}
                    className={`w-full p-4 text-left border-b transition-colors ${
                      isPlayful
                        ? `border-pink-100 hover:bg-pink-100/50 ${
                            selectedGroupChat?.id === group.id
                              ? "bg-pink-100/70 border-l-4 border-l-pink-500"
                              : ""
                          }`
                        : `border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                            selectedGroupChat?.id === group.id
                              ? "bg-primary/5 border-l-4 border-l-primary"
                              : ""
                          }`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-lg">
                          groups
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {group.section_name || group.name}
                        </h3>
                        <p className="text-xs text-slate-500">{group.member_count} members</p>
                        {group.last_message_body && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                            <span className="font-medium">{group.last_message_sender}: </span>
                            {group.last_message_body}
                          </p>
                        )}
                        {group.last_message_at && (
                          <p className="text-xs text-slate-400 mt-1">
                            {formatTime(group.last_message_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className={`lg:col-span-2 flex-col max-h-full overflow-hidden ${showMobileChat ? 'flex' : 'hidden lg:flex'} ${
          isPlayful
            ? "bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200"
            : "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="lg:hidden mr-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedConversation.partner_role === "student" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-primary/10"
                    }`}>
                      {selectedConversation.partner_avatar_url ? (
                        <img
                          src={selectedConversation.partner_avatar_url}
                          alt={selectedConversation.partner_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className={`font-semibold text-sm ${
                          selectedConversation.partner_role === "student" ? "text-blue-600" : "text-primary"
                        }`}>
                          {getInitials(selectedConversation.partner_name)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {selectedConversation.partner_name}
                      </h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        selectedConversation.partner_role === "student"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      }`}>
                        {selectedConversation.partner_role === "student" ? "Student" : "Teacher"}
                      </span>
                    </div>
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
                    <p>{isPlayful ? "\u{1F44B} Say hello!" : "Start the conversation!"}</p>
                    <p className="text-sm mt-1">
                      {isPlayful
                        ? `Send a friendly message to ${selectedConversation.partner_name}!`
                        : `Send your first message to ${selectedConversation.partner_name}`}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.from_profile_id === profileId;
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
                                ? isPlayful
                                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-md"
                                  : "bg-primary text-white rounded-br-md"
                                : isPlayful
                                  ? "bg-white/80 border border-pink-200 text-slate-900 rounded-bl-md"
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
                        handleSend();
                      }
                    }}
                    placeholder={isPlayful ? "Type something fun! (Shift+Enter for new line)" : "Type a message... (Shift+Enter for new line)"}
                    rows={2}
                    className={`flex-1 px-4 py-3 rounded-lg border text-slate-900 dark:text-white focus:outline-none focus:ring-2 resize-none ${
                      isPlayful
                        ? "border-pink-200 bg-white focus:ring-pink-400"
                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-primary"
                    }`}
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isSending || !messageInput.trim()}
                    className={`px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      isPlayful
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
                        : "bg-primary text-white hover:bg-primary/90"
                    }`}
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
          ) : selectedGroupChat ? (
            <>
              {/* Group Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="lg:hidden mr-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                      groups
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {selectedGroupChat.section_name || selectedGroupChat.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedGroupChat.member_count} members
                    </p>
                  </div>
                </div>
              </div>

              {/* Group Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : groupMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <span className="material-symbols-outlined text-5xl mb-3">forum</span>
                    <p>{isPlayful ? "\u{1F389} Be the first to say hi!" : "No messages yet"}</p>
                    <p className="text-sm mt-1">
                      {isPlayful
                        ? "Type a message and talk to your group!"
                        : "Start the conversation in this group!"}
                    </p>
                  </div>
                ) : (
                  groupMessages.map((message) => {
                    const isOwnMessage = message.sender_profile_id === profileId;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[70%] ${isOwnMessage ? "" : "flex gap-2"}`}>
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
                                  {getInitials(message.sender_name || "?")}
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isOwnMessage
                                ? isPlayful
                                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-md"
                                  : "bg-primary text-white rounded-br-md"
                                : isPlayful
                                  ? "bg-white/80 border border-pink-200 text-slate-900 rounded-bl-md"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-md"
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
                            <p className="whitespace-pre-wrap">{message.body}</p>
                            <p className="text-xs opacity-75 text-right mt-1">
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Group Message Input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-end gap-3">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendGroupMessage();
                      }
                    }}
                    placeholder="Type a message to the group..."
                    rows={2}
                    className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendGroupMessage}
                    disabled={isSending || !messageInput.trim()}
                    className={`px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      isPlayful
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
                        : "bg-primary text-white hover:bg-primary/90"
                    }`}
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
              <p className="text-lg font-medium">
                {isPlayful ? "\u{1F44B} Pick someone to chat with!" : "Select a conversation"}
              </p>
              <p className="text-sm mt-1">
                {isPlayful
                  ? "Tap a name on the left to start talking!"
                  : "Or start a new one with a teacher or classmate"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full max-h-[80vh] overflow-hidden ${
            isPlayful
              ? "bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-200"
              : "bg-white dark:bg-slate-800 rounded-xl"
          }`}>
            <div className={`p-4 flex items-center justify-between ${
              isPlayful
                ? "border-b border-pink-200"
                : "border-b border-slate-200 dark:border-slate-700"
            }`}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {isPlayful ? "\u{2728} Start a New Chat" : "Start New Conversation"}
              </h2>
              <button
                onClick={() => {
                  setShowNewConversation(false);
                  setTeacherSearch("");
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder={isPlayful ? "Search for a teacher or friend..." : "Search by name or course..."}
                className={`w-full px-4 py-2 rounded-lg border text-slate-900 dark:text-white focus:outline-none focus:ring-2 mb-4 ${
                  isPlayful
                    ? "border-pink-200 bg-white focus:ring-pink-400"
                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-primary"
                }`}
              />

              {/* Teachers Section */}
              {filteredTeachers.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Teachers
                  </p>
                  <div className="space-y-2 mb-4">
                    {filteredTeachers.map((teacher) => (
                      <button
                        key={teacher.id}
                        onClick={() => startNewConversation(teacher)}
                        className="w-full p-3 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
                </>
              )}

              {/* Students Section */}
              {filteredPeers.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Classmates
                  </p>
                  <div className="space-y-2">
                    {filteredPeers.map((peer) => (
                      <button
                        key={peer.profile_id}
                        onClick={() => startPeerConversation(peer)}
                        className="w-full p-3 text-left rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            {peer.avatar_url ? (
                              <img
                                src={peer.avatar_url}
                                alt={peer.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                {getInitials(peer.full_name)}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {peer.full_name}
                            </h3>
                            <p className="text-sm text-slate-500">Student</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {filteredTeachers.length === 0 && filteredPeers.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                  <p>No contacts found</p>
                  <p className="text-sm mt-1">You need to be enrolled in courses first</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
