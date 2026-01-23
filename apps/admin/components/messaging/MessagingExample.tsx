"use client";

import { useState } from "react";
import MessageBubble from "./MessageBubble";
import ConversationItem from "./ConversationItem";
import MessageInput from "./MessageInput";
import AdminBadge from "./AdminBadge";

/**
 * Example component demonstrating all messaging components
 * This is for testing/demo purposes - remove or customize for production
 */

const mockConversations = [
  {
    id: "conv-1",
    userName: "Sarah Johnson",
    userRole: "teacher" as const,
    lastMessage: "Thank you for the quick response!",
    lastMessageTime: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    unreadCount: 2,
  },
  {
    id: "conv-2",
    userName: "Michael Chen",
    userRole: "student" as const,
    lastMessage: "Can you help me with my assignment?",
    lastMessageTime: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    unreadCount: 5,
  },
  {
    id: "conv-3",
    userName: "Emily Davis",
    userRole: "teacher" as const,
    lastMessage: "The grades have been updated.",
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    unreadCount: 0,
  },
  {
    id: "conv-4",
    userName: "James Wilson",
    userRole: "student" as const,
    lastMessage: "I understand now, thanks!",
    lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    unreadCount: 0,
  },
];

const mockMessages = [
  {
    id: "msg-1",
    content: "Hello! I noticed you had a question about the recent assignment. How can I help you?",
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
    isFromAdmin: true,
    senderName: "Admin Support",
    isRead: true,
  },
  {
    id: "msg-2",
    content: "Yes, I'm confused about question 3. Can you explain it?",
    timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
    isFromAdmin: false,
    senderName: "Sarah Johnson",
    senderRole: "teacher" as const,
  },
  {
    id: "msg-3",
    content: "Of course! Question 3 is asking you to analyze the data set and identify trends. Let me break it down:\n\n1. First, review the data table\n2. Look for patterns in the numbers\n3. Write a summary of what you observe",
    timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 mins ago
    isFromAdmin: true,
    senderName: "Admin Support",
    isRead: true,
  },
  {
    id: "msg-4",
    content: "That makes sense now. Thank you!",
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    isFromAdmin: false,
    senderName: "Sarah Johnson",
    senderRole: "teacher" as const,
  },
  {
    id: "msg-5",
    content: "You're welcome! Feel free to reach out if you have any other questions.",
    timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 mins ago
    isFromAdmin: true,
    senderName: "Admin Support",
    isRead: false,
  },
];

export default function MessagingExample() {
  const [activeConversation, setActiveConversation] = useState("conv-1");
  const [messages, setMessages] = useState(mockMessages);

  const handleSendMessage = async (message: string) => {
    // Simulate sending message
    const newMessage = {
      id: `msg-${Date.now()}`,
      content: message,
      timestamp: new Date(),
      isFromAdmin: true,
      senderName: "Admin Support",
      isRead: false,
    };

    setMessages([...messages, newMessage]);

    // Simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <div className="min-h-screen bg-bg-light p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Messaging Components Demo
          </h1>
          <p className="text-gray-600">
            Interactive demonstration of all messaging UI components
          </p>
        </div>

        {/* Admin Badge Demo */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Badge</h2>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Small</p>
              <AdminBadge size="sm" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Medium</p>
              <AdminBadge size="md" />
            </div>
          </div>
        </div>

        {/* Full Messaging Interface */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="flex h-[600px]">
            {/* Conversations Sidebar */}
            <div className="w-80 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                <p className="text-sm text-gray-500">
                  {mockConversations.filter((c) => c.unreadCount > 0).length} unread
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {mockConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    {...conv}
                    isActive={activeConversation === conv.id}
                    onClick={setActiveConversation}
                  />
                ))}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                    SJ
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Sarah Johnson</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Teacher</span>
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      <span className="text-xs text-gray-500">Online</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} {...msg} />
                ))}
              </div>

              {/* Input */}
              <MessageInput onSend={handleSendMessage} />
            </div>
          </div>
        </div>

        {/* Individual Component Examples */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Message Bubbles */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Message Bubbles
            </h2>
            <div className="space-y-4">
              <MessageBubble
                id="example-1"
                content="This is an admin message"
                timestamp={new Date()}
                isFromAdmin={true}
                senderName="Admin"
                isRead={true}
              />
              <MessageBubble
                id="example-2"
                content="This is a teacher message"
                timestamp={new Date()}
                isFromAdmin={false}
                senderName="John Teacher"
                senderRole="teacher"
              />
              <MessageBubble
                id="example-3"
                content="This is a student message"
                timestamp={new Date()}
                isFromAdmin={false}
                senderName="Jane Student"
                senderRole="student"
              />
            </div>
          </div>

          {/* Conversation Items */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Conversation Items
            </h2>
            <div className="space-y-2 border border-gray-200 rounded-lg overflow-hidden">
              <ConversationItem
                id="demo-1"
                userName="Active Teacher"
                userRole="teacher"
                lastMessage="This is the last message preview..."
                lastMessageTime={new Date()}
                unreadCount={3}
                isActive={true}
                onClick={() => {}}
              />
              <ConversationItem
                id="demo-2"
                userName="Inactive Student"
                userRole="student"
                lastMessage="Another message preview here"
                lastMessageTime={new Date(Date.now() - 60 * 60 * 1000)}
                unreadCount={0}
                isActive={false}
                onClick={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
