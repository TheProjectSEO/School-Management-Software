# Messaging Components Implementation Guide

## Overview

Complete set of reusable messaging UI components for the admin messaging system, built with Next.js 14+, TypeScript, and Tailwind CSS.

## File Structure

```
components/messaging/
├── AdminBadge.tsx              # Small badge component for admin identification
├── ConversationItem.tsx        # List item for conversation preview
├── MessageBubble.tsx           # Individual message display component
├── MessageInput.tsx            # Message composition input with auto-grow
├── MessagingExample.tsx        # Complete demo/example (for testing)
├── types.ts                    # Shared TypeScript types
├── index.ts                    # Main exports
├── README.md                   # Component documentation
└── IMPLEMENTATION_GUIDE.md     # This file
```

## Quick Start

### 1. Import Components

```tsx
import {
  MessageBubble,
  ConversationItem,
  MessageInput,
  AdminBadge,
  // Types
  Message,
  Conversation,
  UserRole,
} from "@/components/messaging";
```

### 2. Basic Messaging Page

```tsx
"use client";

import { useState, useEffect } from "react";
import { MessageBubble, ConversationItem, MessageInput } from "@/components/messaging";
import type { Message, Conversation } from "@/components/messaging";

export default function MessagingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/admin/messaging/conversations");
      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/messaging/conversations/${conversationId}/messages`);
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversation) return;

    try {
      const response = await fetch("/api/admin/messaging/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation,
          content,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages([...messages, data.message]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="flex h-screen bg-bg-light">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">
            {conversations.filter(c => c.unreadCount > 0).length} unread
          </p>
        </div>
        <div className="overflow-y-auto">
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              {...conv}
              isActive={activeConversation === conv.id}
              onClick={setActiveConversation}
            />
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    {...msg}
                  />
                ))
              )}
            </div>

            {/* Input */}
            <MessageInput onSend={handleSendMessage} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl mb-2">chat_bubble</span>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

## API Integration

### Required API Endpoints

Create the following API routes in your app:

#### 1. Get Conversations
```tsx
// app/api/admin/messaging/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Get conversations from database
  const conversations = await db.query(`
    SELECT
      c.*,
      u.name as user_name,
      u.role as user_role,
      u.avatar as user_avatar,
      (SELECT COUNT(*) FROM messages
       WHERE conversation_id = c.id
       AND is_read = false
       AND is_from_admin = false) as unread_count,
      (SELECT content FROM messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC LIMIT 1) as last_message_time
    FROM conversations c
    JOIN users u ON c.user_id = u.id
    ORDER BY last_message_time DESC
  `);

  return NextResponse.json({ conversations });
}
```

#### 2. Get Messages for Conversation
```tsx
// app/api/admin/messaging/conversations/[conversationId]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const messages = await db.query(`
    SELECT
      m.*,
      u.name as sender_name,
      u.role as sender_role,
      u.avatar as sender_avatar
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `, [params.conversationId]);

  // Mark messages as read
  await db.query(`
    UPDATE messages
    SET is_read = true, read_at = NOW()
    WHERE conversation_id = ? AND is_from_admin = false AND is_read = false
  `, [params.conversationId]);

  return NextResponse.json({ messages });
}
```

#### 3. Send Message
```tsx
// app/api/admin/messaging/send/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { conversationId, content } = await request.json();

  // Get admin user from session
  const adminId = "admin-id"; // Get from session/auth

  const message = await db.query(`
    INSERT INTO messages (
      conversation_id,
      sender_id,
      content,
      is_from_admin,
      created_at
    ) VALUES (?, ?, ?, true, NOW())
    RETURNING *
  `, [conversationId, adminId, content]);

  // Update conversation timestamp
  await db.query(`
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = ?
  `, [conversationId]);

  return NextResponse.json({
    success: true,
    message: message[0],
  });
}
```

## Database Schema

### Conversations Table
```sql
CREATE TABLE conversations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_from_admin BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_unread ON messages(is_read, is_from_admin);
```

## Advanced Features

### Real-time Updates with WebSockets

```tsx
"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";

export function useRealtimeMessaging(conversationId: string) {
  useEffect(() => {
    const socket = io("/api/messaging");

    socket.on("message:new", (message) => {
      // Handle new message
      console.log("New message:", message);
    });

    socket.on("message:read", ({ messageIds }) => {
      // Update read status
      console.log("Messages read:", messageIds);
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId]);
}
```

### Infinite Scroll for Messages

```tsx
import { useInfiniteQuery } from "@tanstack/react-query";

function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(
        `/api/admin/messaging/conversations/${conversationId}/messages?page=${pageParam}`
      );
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}
```

### Search Conversations

```tsx
"use client";

import { useState } from "react";

export function ConversationSearch({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");

  return (
    <div className="p-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
          }}
          placeholder="Search conversations..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <span className="absolute left-3 top-2.5 material-symbols-outlined text-gray-400">
          search
        </span>
      </div>
    </div>
  );
}
```

## Testing

### View the Demo

To test the components:

1. Create a test page:
```tsx
// app/messaging-test/page.tsx
import MessagingExample from "@/components/messaging/MessagingExample";

export default function TestPage() {
  return <MessagingExample />;
}
```

2. Navigate to `/messaging-test` in your browser

### Unit Testing

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import MessageInput from "@/components/messaging/MessageInput";

describe("MessageInput", () => {
  it("sends message on Enter key", async () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSend).toHaveBeenCalledWith("Test message");
  });

  it("adds new line on Shift+Enter", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "Line 1" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });
});
```

## Performance Optimization

### Virtualization for Large Lists

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

export function VirtualizedConversationList({ conversations }: { conversations: Conversation[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Approximate height of ConversationItem
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${item.start}px)`,
            }}
          >
            <ConversationItem {...conversations[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Accessibility

All components are built with accessibility in mind:

- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support

## Next Steps

1. **Implement API endpoints** - Create the backend routes
2. **Set up database** - Create tables and indexes
3. **Add authentication** - Ensure admin-only access
4. **Test components** - Use the MessagingExample component
5. **Add real-time updates** - Integrate WebSockets
6. **Optimize performance** - Add virtualization for large lists
7. **Deploy** - Test in production environment

## Support

For issues or questions:
- Check the README.md for component documentation
- Review the MessagingExample.tsx for usage examples
- Check the types.ts file for TypeScript definitions
