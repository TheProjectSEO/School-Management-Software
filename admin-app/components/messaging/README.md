# Messaging UI Components

Reusable messaging components for the admin messaging system. These components follow the established design system and are fully typed with TypeScript.

## Components

### 1. AdminBadge

A small badge component displaying "ADMIN" with an icon.

**Props:**
- `size?: "sm" | "md"` - Badge size (default: "sm")
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { AdminBadge } from "@/components/messaging";

<AdminBadge size="sm" />
```

---

### 2. MessageBubble

Displays an individual message with sender information, timestamp, and read status.

**Props:**
```typescript
{
  id: string;
  content: string;
  timestamp: Date | string;
  isFromAdmin: boolean;
  senderName: string;
  senderRole?: "teacher" | "student";
  senderAvatar?: string;
  isRead?: boolean;
}
```

**Features:**
- Admin messages appear on the right with primary color background
- User messages appear on the left with white background
- Automatic role badge (Admin/Teacher/Student)
- Avatar with initials fallback
- Relative timestamp (e.g., "2 minutes ago")
- Read status indicator for admin messages (single/double check)

**Usage:**
```tsx
import { MessageBubble } from "@/components/messaging";

<MessageBubble
  id="msg-1"
  content="Hello, how can I help you?"
  timestamp={new Date()}
  isFromAdmin={true}
  senderName="John Admin"
  isRead={true}
/>

<MessageBubble
  id="msg-2"
  content="I have a question about my grades"
  timestamp={new Date()}
  isFromAdmin={false}
  senderName="Jane Student"
  senderRole="student"
  senderAvatar="/avatars/jane.jpg"
/>
```

---

### 3. ConversationItem

List item for displaying conversation previews in a sidebar/list.

**Props:**
```typescript
{
  id: string;
  userName: string;
  userAvatar?: string;
  userRole: "teacher" | "student";
  lastMessage: string;
  lastMessageTime: Date | string;
  unreadCount: number;
  isActive?: boolean;
  onClick: (id: string) => void;
}
```

**Features:**
- Shows user avatar (with initials fallback)
- Role badge (Teacher/Student)
- Last message preview (truncated at 60 chars)
- Unread count badge
- Relative timestamp
- Active state highlighting
- Hover effects

**Usage:**
```tsx
import { ConversationItem } from "@/components/messaging";

<ConversationItem
  id="conv-1"
  userName="Jane Student"
  userRole="student"
  lastMessage="Thank you for your help!"
  lastMessageTime={new Date(Date.now() - 300000)}
  unreadCount={3}
  isActive={true}
  onClick={(id) => handleConversationClick(id)}
/>
```

---

### 4. MessageInput

Input component for composing and sending messages.

**Props:**
```typescript
{
  onSend: (message: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}
```

**Features:**
- Auto-growing textarea (up to 150px height)
- Character counter (shows when near limit)
- Loading state with spinner
- Keyboard shortcuts:
  - `Enter` to send
  - `Shift + Enter` for new line
- Disabled state
- Visual feedback for send button state

**Usage:**
```tsx
import { MessageInput } from "@/components/messaging";

const handleSend = async (message: string) => {
  await sendMessageToAPI(message);
};

<MessageInput
  onSend={handleSend}
  placeholder="Type your message..."
  maxLength={2000}
/>
```

---

## Complete Example

Here's a complete example of a messaging interface:

```tsx
"use client";

import { useState } from "react";
import {
  ConversationItem,
  MessageBubble,
  MessageInput,
} from "@/components/messaging";

const conversations = [
  {
    id: "1",
    userName: "Jane Student",
    userRole: "student" as const,
    lastMessage: "Thank you!",
    lastMessageTime: new Date(),
    unreadCount: 2,
  },
  // ... more conversations
];

const messages = [
  {
    id: "msg-1",
    content: "Hello, how can I help?",
    timestamp: new Date(),
    isFromAdmin: true,
    senderName: "Admin",
  },
  {
    id: "msg-2",
    content: "I have a question",
    timestamp: new Date(),
    isFromAdmin: false,
    senderName: "Jane Student",
    senderRole: "student" as const,
  },
  // ... more messages
];

export default function MessagingPage() {
  const [activeConversation, setActiveConversation] = useState("1");

  const handleSendMessage = async (message: string) => {
    // Send message to API
    console.log("Sending:", message);
  };

  return (
    <div className="flex h-screen">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-gray-200 overflow-y-auto">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            {...conv}
            isActive={activeConversation === conv.id}
            onClick={setActiveConversation}
          />
        ))}
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} {...msg} />
          ))}
        </div>

        {/* Input */}
        <MessageInput onSend={handleSendMessage} />
      </div>
    </div>
  );
}
```

---

## Design System Alignment

These components follow the established design patterns:

**Colors:**
- Primary: `#7B1113` (MSU Maroon)
- Primary Hover: `#961517`
- Teacher: Blue variants
- Student: Purple variants

**Typography:**
- Font: Lexend (sans-serif)
- Consistent sizing: xs (10px), sm (12px), md (14px)

**Spacing:**
- Consistent padding and gaps using Tailwind spacing scale
- Rounded corners: xl (12px) for cards, full for badges

**Icons:**
- Material Symbols Outlined
- Consistent sizing and colors

**Interactions:**
- Smooth transitions (transition-all)
- Hover states for interactive elements
- Loading states with spinners
- Disabled states with reduced opacity

---

## Dependencies

- `clsx` - Conditional CSS classes
- `date-fns` - Date formatting
- `@tailwindcss/forms` - Form styling
- Material Symbols Outlined (via CDN or package)

---

## Accessibility

- Semantic HTML elements
- ARIA labels for icon buttons
- Keyboard navigation support
- Focus states for interactive elements
- Disabled state handling

---

## Future Enhancements

Consider adding:
- File attachment support
- Emoji picker
- Message reactions
- Typing indicators
- Online/offline status
- Message search
- Message deletion/editing
- Voice messages
