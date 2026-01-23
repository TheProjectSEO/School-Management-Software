# Quick Start Guide - Messaging Components

Get up and running with the messaging components in 5 minutes.

## Step 1: Test the Components (2 minutes)

Create a test page to see all components in action:

```tsx
// app/test-messaging/page.tsx
import MessagingExample from "@/components/messaging/MessagingExample";

export default function TestPage() {
  return <MessagingExample />;
}
```

Navigate to: `http://localhost:3000/test-messaging`

## Step 2: Import What You Need (30 seconds)

```tsx
import {
  MessageBubble,
  ConversationItem,
  MessageInput,
  AdminBadge,
} from "@/components/messaging";
```

## Step 3: Create a Simple Messaging Page (2 minutes)

```tsx
"use client";

import { useState } from "react";
import { MessageBubble, MessageInput } from "@/components/messaging";

export default function SimpleChatPage() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      content: "Hello! How can I help?",
      timestamp: new Date(),
      isFromAdmin: true,
      senderName: "Admin",
    },
  ]);

  const handleSend = (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      isFromAdmin: true,
      senderName: "Admin",
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} {...msg} />
        ))}
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
```

## Step 4: Add Conversations List (1 minute)

```tsx
"use client";

import { useState } from "react";
import { ConversationItem } from "@/components/messaging";

const conversations = [
  {
    id: "1",
    userName: "Jane Student",
    userRole: "student" as const,
    lastMessage: "Can you help me?",
    lastMessageTime: new Date(),
    unreadCount: 2,
  },
  {
    id: "2",
    userName: "John Teacher",
    userRole: "teacher" as const,
    lastMessage: "Thank you!",
    lastMessageTime: new Date(Date.now() - 3600000),
    unreadCount: 0,
  },
];

export default function ConversationsPage() {
  const [active, setActive] = useState("1");

  return (
    <div className="w-80 border border-gray-200 rounded-lg overflow-hidden">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          {...conv}
          isActive={active === conv.id}
          onClick={setActive}
        />
      ))}
    </div>
  );
}
```

## Step 5: Complete Messaging Interface (Optional)

Combine everything:

```tsx
"use client";

import { useState } from "react";
import {
  ConversationItem,
  MessageBubble,
  MessageInput,
} from "@/components/messaging";

export default function MessagingPage() {
  const [activeConv, setActiveConv] = useState("1");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200">
        {/* Add ConversationItems here */}
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Add MessageBubbles here */}
        </div>

        {/* Input */}
        <MessageInput onSend={(msg) => console.log(msg)} />
      </div>
    </div>
  );
}
```

## Common Use Cases

### Use Case 1: Display Admin Badge
```tsx
import { AdminBadge } from "@/components/messaging";

<AdminBadge size="sm" />
```

### Use Case 2: Format Timestamps
```tsx
import { formatMessageTime } from "@/components/messaging";

const timeStr = formatMessageTime(new Date());
// "Just now" or "5m ago" or "2h ago"
```

### Use Case 3: Sort Conversations
```tsx
import { sortConversationsByUnread } from "@/components/messaging";

const sorted = sortConversationsByUnread(conversations);
// Unread conversations appear first
```

### Use Case 4: Validate Message
```tsx
import { validateMessageContent } from "@/components/messaging";

const { valid, error } = validateMessageContent(message);
if (!valid) {
  alert(error);
}
```

### Use Case 5: Get User Initials
```tsx
import { getInitials } from "@/components/messaging";

const initials = getInitials("John Doe");
// "JD"
```

## Component Props Cheat Sheet

### MessageBubble
```tsx
<MessageBubble
  id="1"                           // Required
  content="Hello"                  // Required
  timestamp={new Date()}           // Required
  isFromAdmin={true}               // Required
  senderName="Admin"               // Required
  senderRole="student"             // Optional: "teacher" | "student"
  senderAvatar="/avatar.jpg"       // Optional
  isRead={true}                    // Optional (default: true)
/>
```

### ConversationItem
```tsx
<ConversationItem
  id="1"                           // Required
  userName="Jane"                  // Required
  userRole="student"               // Required: "teacher" | "student"
  lastMessage="Hello"              // Required
  lastMessageTime={new Date()}     // Required
  unreadCount={3}                  // Required
  onClick={(id) => {}}             // Required
  userAvatar="/avatar.jpg"         // Optional
  isActive={false}                 // Optional (default: false)
/>
```

### MessageInput
```tsx
<MessageInput
  onSend={(msg) => {}}             // Required
  placeholder="Type..."            // Optional
  disabled={false}                 // Optional (default: false)
  maxLength={2000}                 // Optional (default: 2000)
  className=""                     // Optional
/>
```

### AdminBadge
```tsx
<AdminBadge
  size="sm"                        // Optional: "sm" | "md" (default: "sm")
  className=""                     // Optional
/>
```

## Keyboard Shortcuts

- **Enter** - Send message
- **Shift + Enter** - New line
- **Escape** - Close modal (if applicable)
- **Tab** - Navigate between elements

## Styling Tips

### Custom Avatar Colors
```tsx
<div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
  {initials}
</div>
```

### Custom Message Bubble Colors
```tsx
<div className="bg-gradient-to-r from-primary to-primary-hover text-white rounded-2xl p-4">
  {content}
</div>
```

### Dark Mode Support (Add to components)
```tsx
<div className="dark:bg-gray-800 dark:text-white">
  {/* Content */}
</div>
```

## Common Patterns

### Load Conversations
```tsx
useEffect(() => {
  fetch("/api/admin/messaging/conversations")
    .then(res => res.json())
    .then(data => setConversations(data.conversations));
}, []);
```

### Load Messages
```tsx
useEffect(() => {
  if (activeConversation) {
    fetch(`/api/admin/messaging/conversations/${activeConversation}/messages`)
      .then(res => res.json())
      .then(data => setMessages(data.messages));
  }
}, [activeConversation]);
```

### Send Message
```tsx
const handleSend = async (content: string) => {
  const response = await fetch("/api/admin/messaging/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, content }),
  });

  const data = await response.json();
  if (data.success) {
    setMessages([...messages, data.message]);
  }
};
```

## Troubleshooting

### Issue: Components not rendering
**Solution:** Make sure you're using `"use client"` directive at the top of your page.

### Issue: Timestamps not formatting
**Solution:** Ensure `date-fns` is installed: `npm install date-fns`

### Issue: Icons not showing
**Solution:** Add Material Symbols to your layout:
```tsx
// app/layout.tsx
<link
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
  rel="stylesheet"
/>
```

### Issue: Styles not applying
**Solution:** Ensure Tailwind is configured to scan the messaging folder:
```js
// tailwind.config.ts
content: [
  './components/**/*.{js,ts,jsx,tsx}',
]
```

## Next Steps

1. **Read the docs**: Check `README.md` for detailed component documentation
2. **Implement backend**: Follow `IMPLEMENTATION_GUIDE.md` for API setup
3. **Review architecture**: See `ARCHITECTURE.md` for system design
4. **Add features**: Extend with real-time updates, file uploads, etc.

## Need Help?

- **Component API**: See `README.md`
- **Implementation**: See `IMPLEMENTATION_GUIDE.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Types**: See `types.ts`
- **Utilities**: See `utils.ts`

---

**Time to first render**: ~5 minutes
**Time to production**: ~2 hours (with backend)

Happy coding!
