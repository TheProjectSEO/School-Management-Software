# Messaging Components Architecture

## Component Hierarchy

```
MessagingPage (Your Implementation)
│
├── Sidebar
│   ├── SearchBar (Optional)
│   ├── FilterTabs (Optional)
│   └── ConversationList
│       └── ConversationItem[] (Multiple)
│           ├── Avatar
│           ├── UserInfo
│           │   ├── UserName
│           │   └── RoleBadge (Teacher/Student)
│           ├── LastMessage (truncated)
│           ├── UnreadBadge (if > 0)
│           └── Timestamp
│
└── MainArea
    ├── Header (Conversation Info)
    │   ├── Avatar
    │   ├── UserName
    │   ├── RoleBadge
    │   └── OnlineStatus (Optional)
    │
    ├── MessagesContainer
    │   └── MessageBubble[] (Multiple)
    │       ├── Avatar
    │       ├── SenderInfo
    │       │   ├── SenderName
    │       │   └── Badge (AdminBadge or RoleBadge)
    │       ├── MessageContent
    │       └── MessageFooter
    │           ├── Timestamp
    │           └── ReadStatus (if from admin)
    │
    └── MessageInput
        ├── Textarea (auto-growing)
        ├── CharacterCounter (if near limit)
        ├── KeyboardHints
        └── SendButton
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     MessagingPage                           │
│                                                             │
│  State:                                                     │
│    - conversations[]                                        │
│    - activeConversation                                     │
│    - messages[]                                             │
│    - loading                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├── Fetch Conversations
                            │   └── API: GET /api/admin/messaging/conversations
                            │       Response: Conversation[]
                            │
                            ├── Fetch Messages (when conversation selected)
                            │   └── API: GET /api/admin/messaging/conversations/[id]/messages
                            │       Response: Message[]
                            │
                            └── Send Message
                                └── API: POST /api/admin/messaging/send
                                    Payload: { conversationId, content }
                                    Response: Message
```

## Component Communication

```
┌─────────────────┐          onClick(id)         ┌─────────────────┐
│ ConversationItem│─────────────────────────────>│  Parent State   │
└─────────────────┘                               │ (set active)    │
                                                  └─────────────────┘
                                                           │
                                                           ↓
                                                  ┌─────────────────┐
                                                  │  Load Messages  │
                                                  │  for selected   │
                                                  │  conversation   │
                                                  └─────────────────┘
                                                           │
                                                           ↓
                                                  ┌─────────────────┐
                                                  │ MessageBubble[] │
                                                  │ rendered with   │
                                                  │ fetched data    │
                                                  └─────────────────┘

┌─────────────────┐        onSend(content)       ┌─────────────────┐
│  MessageInput   │─────────────────────────────>│  Parent Handler │
└─────────────────┘                               │ (send to API)   │
                                                  └─────────────────┘
                                                           │
                                                           ↓
                                                  ┌─────────────────┐
                                                  │   API Call      │
                                                  │ POST /send      │
                                                  └─────────────────┘
                                                           │
                                                           ↓
                                                  ┌─────────────────┐
                                                  │ Update messages │
                                                  │ state with new  │
                                                  │ message         │
                                                  └─────────────────┘
```

## State Management

### Option 1: React State (Current)
```tsx
const [conversations, setConversations] = useState<Conversation[]>([]);
const [activeConversation, setActiveConversation] = useState<string | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
```

**Pros:** Simple, no extra dependencies
**Cons:** Props drilling, re-fetching on unmount

### Option 2: React Query (Recommended)
```tsx
// Conversations query
const { data: conversations } = useQuery({
  queryKey: ["conversations"],
  queryFn: fetchConversations,
  refetchInterval: 30000, // Refetch every 30s
});

// Messages query
const { data: messages } = useQuery({
  queryKey: ["messages", activeConversation],
  queryFn: () => fetchMessages(activeConversation),
  enabled: !!activeConversation,
});

// Send mutation
const sendMutation = useMutation({
  mutationFn: sendMessage,
  onSuccess: () => {
    queryClient.invalidateQueries(["messages", activeConversation]);
    queryClient.invalidateQueries(["conversations"]);
  },
});
```

**Pros:** Caching, automatic refetching, optimistic updates
**Cons:** Extra dependency

### Option 3: Zustand (For Complex Apps)
```tsx
// store.ts
const useMessagingStore = create<MessagingState>((set) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  setActiveConversation: (id) => set({ activeConversation: id }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
}));
```

**Pros:** Global state, no prop drilling
**Cons:** Extra dependency, more setup

## API Response Formats

### GET /api/admin/messaging/conversations
```json
{
  "conversations": [
    {
      "id": "conv-123",
      "userId": "user-456",
      "userName": "Jane Student",
      "userEmail": "jane@example.com",
      "userRole": "student",
      "userAvatar": "/avatars/jane.jpg",
      "lastMessage": "Thank you for your help!",
      "lastMessageTime": "2024-01-12T10:30:00Z",
      "unreadCount": 3,
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-12T10:30:00Z"
    }
  ]
}
```

### GET /api/admin/messaging/conversations/[id]/messages
```json
{
  "messages": [
    {
      "id": "msg-789",
      "conversationId": "conv-123",
      "senderId": "admin-1",
      "senderName": "Admin Support",
      "senderRole": null,
      "senderAvatar": null,
      "content": "Hello, how can I help?",
      "timestamp": "2024-01-12T10:25:00Z",
      "isFromAdmin": true,
      "isRead": true,
      "readAt": "2024-01-12T10:26:00Z"
    },
    {
      "id": "msg-790",
      "conversationId": "conv-123",
      "senderId": "user-456",
      "senderName": "Jane Student",
      "senderRole": "student",
      "senderAvatar": "/avatars/jane.jpg",
      "content": "I have a question about my grades",
      "timestamp": "2024-01-12T10:26:00Z",
      "isFromAdmin": false,
      "isRead": false,
      "readAt": null
    }
  ]
}
```

### POST /api/admin/messaging/send
**Request:**
```json
{
  "conversationId": "conv-123",
  "content": "I'll check that for you."
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg-791",
    "conversationId": "conv-123",
    "senderId": "admin-1",
    "senderName": "Admin Support",
    "content": "I'll check that for you.",
    "timestamp": "2024-01-12T10:30:00Z",
    "isFromAdmin": true,
    "isRead": false
  }
}
```

## Database Schema

### conversations table
```sql
CREATE TABLE conversations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_updated_at (updated_at DESC)
);
```

### messages table
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

  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversation_id (conversation_id, created_at),
  INDEX idx_unread (conversation_id, is_read, is_from_admin)
);
```

### Indexes Explained
- `idx_user_id`: Fast lookup of user's conversations
- `idx_updated_at`: Fast sorting of conversations by last activity
- `idx_conversation_id`: Fast retrieval of messages for a conversation
- `idx_unread`: Fast counting of unread messages

## Performance Considerations

### 1. Conversation List
```tsx
// Use pagination for large lists
const CONVERSATIONS_PER_PAGE = 20;

// Use virtualization for smooth scrolling
import { useVirtualizer } from "@tanstack/react-virtual";
```

### 2. Message List
```tsx
// Load messages in reverse order (newest first)
// Implement infinite scroll for history

// Use React.memo for MessageBubble
const MessageBubble = React.memo((props) => {
  // ...
});
```

### 3. Real-time Updates
```tsx
// Use WebSocket for real-time messages
// Fallback to polling if WebSocket unavailable

useEffect(() => {
  const socket = io("/api/messaging");

  socket.on("message:new", (message) => {
    setMessages(prev => [...prev, message]);
  });

  return () => socket.disconnect();
}, []);
```

### 4. Caching
```tsx
// Cache conversations and messages
// Invalidate on new message/conversation

// Use React Query cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
    },
  },
});
```

## Security Considerations

### 1. Authentication
```tsx
// Protect all messaging routes with middleware
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get("admin-token");

  if (!token) {
    return NextResponse.redirect("/login");
  }

  // Verify token
  const isValid = verifyAdminToken(token);
  if (!isValid) {
    return NextResponse.redirect("/login");
  }
}

export const config = {
  matcher: "/api/admin/messaging/:path*",
};
```

### 2. Input Validation
```tsx
// Validate all inputs
import { z } from "zod";

const messageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

// In API route
const { conversationId, content } = messageSchema.parse(await request.json());
```

### 3. Content Sanitization
```tsx
// Sanitize message content
import DOMPurify from "isomorphic-dompurify";

const sanitizedContent = DOMPurify.sanitize(content);
```

### 4. Rate Limiting
```tsx
// Limit messages per user per minute
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 messages per minute
});

const { success } = await ratelimit.limit(adminId);
if (!success) {
  return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

## Testing Strategy

### 1. Unit Tests
```tsx
// Test individual components
describe("MessageBubble", () => {
  it("renders admin message correctly", () => {
    render(<MessageBubble {...adminMessageProps} />);
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
  });
});
```

### 2. Integration Tests
```tsx
// Test component interactions
describe("MessageInput", () => {
  it("sends message on Enter", async () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} />);

    const input = screen.getByRole("textbox");
    await userEvent.type(input, "Test message{Enter}");

    expect(onSend).toHaveBeenCalledWith("Test message");
  });
});
```

### 3. E2E Tests
```tsx
// Test full messaging flow
test("admin can send message to student", async ({ page }) => {
  await page.goto("/admin/messaging");
  await page.click('text="Jane Student"');
  await page.fill('textarea', "Hello Jane!");
  await page.click('button[aria-label="Send message"]');

  await expect(page.locator('text="Hello Jane!"')).toBeVisible();
});
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] API endpoints secured with auth
- [ ] Rate limiting implemented
- [ ] Error handling added
- [ ] Logging configured
- [ ] WebSocket server deployed (if using)
- [ ] Load testing completed
- [ ] Mobile responsive checked
- [ ] Accessibility tested
- [ ] Browser compatibility verified

## Monitoring

### Key Metrics to Track
1. **Message Delivery Time** - Time from send to receipt
2. **Unread Message Count** - Track if messages are being read
3. **Response Time** - Admin response time to user messages
4. **Error Rate** - Failed message sends
5. **WebSocket Connection Health** - Connection drops/reconnects
6. **API Latency** - Response time of messaging endpoints

### Logging
```tsx
// Log important events
logger.info("Message sent", {
  conversationId,
  messageId,
  adminId,
  timestamp: new Date(),
});

logger.error("Failed to send message", {
  conversationId,
  error: error.message,
  adminId,
});
```

---

This architecture provides a solid foundation for a scalable, maintainable messaging system. All components are designed to work together seamlessly while remaining flexible for future enhancements.
