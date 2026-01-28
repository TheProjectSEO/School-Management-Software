# Admin App Hooks

Custom React hooks for the MSU Admin Portal.

## Available Hooks

### `useAdminMessaging`

Comprehensive real-time messaging hook using Supabase Realtime for admin-to-user communication.

#### Features

1. **Conversation Subscriptions**
   - Subscribe to specific conversations with individual users
   - Receive real-time message updates
   - Automatic read receipt tracking

2. **Conversation List Subscriptions**
   - Subscribe to all admin message updates
   - Update conversation list in real-time
   - Track new messages from any user

3. **Presence Tracking**
   - Online/offline status for all users in the school
   - Last seen timestamps
   - Automatic presence broadcasting

4. **Notification System**
   - Optional sound notifications for new messages
   - Callbacks for custom handling
   - Visual notification support

5. **Automatic Cleanup**
   - Unsubscribes from all channels on unmount
   - No memory leaks
   - Efficient resource management

---

## Usage Examples

### Basic Usage - Single Conversation

```typescript
import { useAdminMessaging } from "@/hooks";

function ConversationPage() {
  const admin = useAdmin(); // Your admin context/hook
  const { subscribeToConversation, newMessage, isConversationSubscribed } =
    useAdminMessaging(admin.profile_id, admin.school_id);

  useEffect(() => {
    if (currentUserId) {
      subscribeToConversation(currentUserId);
    }

    return () => {
      unsubscribeFromConversation();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (newMessage) {
      // Add message to UI
      addMessageToList(newMessage);
    }
  }, [newMessage]);

  return (
    <div>
      {isConversationSubscribed && <Badge>Live</Badge>}
      <MessageList messages={messages} />
    </div>
  );
}
```

### Conversation List with Real-time Updates

```typescript
import { useAdminMessaging } from "@/hooks";

function ConversationListPage() {
  const admin = useAdmin();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const {
    subscribeToConversations,
    conversationUpdates,
    isConversationsSubscribed
  } = useAdminMessaging(admin.profile_id, admin.school_id, {
    playSound: true,
    onNewMessage: (message) => {
      console.log("New message received:", message);
    },
  });

  // Subscribe to all conversations on mount
  useEffect(() => {
    subscribeToConversations();
    return () => unsubscribeFromConversations();
  }, []);

  // Handle conversation updates
  useEffect(() => {
    conversationUpdates.forEach((update) => {
      if (update.type === "new_message") {
        // Update conversation list with new message
        updateConversationList(update.profile_id, update.message);
      } else if (update.type === "message_read") {
        // Update read status in conversation list
        markConversationRead(update.profile_id);
      }
    });
  }, [conversationUpdates]);

  return (
    <div>
      {isConversationsSubscribed && <StatusIndicator status="live" />}
      <ConversationList conversations={conversations} />
    </div>
  );
}
```

### With Presence Tracking

```typescript
import { useAdminMessaging } from "@/hooks";

function MessagesWithPresence() {
  const admin = useAdmin();
  const { presenceMap, isOnline, getLastSeen } =
    useAdminMessaging(admin.profile_id, admin.school_id);

  return (
    <div>
      {users.map((user) => (
        <UserItem key={user.id}>
          <Avatar src={user.avatar_url} />
          <div>
            <h3>{user.full_name}</h3>
            {isOnline(user.profile_id) ? (
              <Badge variant="success">Online</Badge>
            ) : (
              <span>Last seen: {formatDate(getLastSeen(user.profile_id))}</span>
            )}
          </div>
        </UserItem>
      ))}
    </div>
  );
}
```

### With Custom Callbacks

```typescript
import { useAdminMessaging } from "@/hooks";
import { toast } from "sonner";

function MessagesWithNotifications() {
  const admin = useAdmin();

  const { subscribeToConversations } = useAdminMessaging(
    admin.profile_id,
    admin.school_id,
    {
      playSound: true,
      onNewMessage: (message) => {
        // Show toast notification
        toast.info(`New message from ${message.sender?.full_name}`, {
          description: message.message.substring(0, 50) + "...",
        });

        // Update unread count
        incrementUnreadCount();
      },
      onMessageRead: (messageId) => {
        // Update UI to show message was read
        markMessageAsRead(messageId);
      },
      onConversationUpdate: (update) => {
        // Update conversation list
        if (update.type === "new_message") {
          moveConversationToTop(update.profile_id);
        }
      },
    }
  );

  // ... rest of component
}
```

---

## API Reference

### `useAdminMessaging(adminProfileId, schoolId, options)`

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `adminProfileId` | `string \| null` | Yes | The admin's profile ID |
| `schoolId` | `string \| null` | Yes | The school ID for presence tracking |
| `options` | `UseAdminMessagingOptions` | No | Configuration options |

#### Options

```typescript
interface UseAdminMessagingOptions {
  /** Play sound on new message (default: true) */
  playSound?: boolean;

  /** Callback when a new message arrives */
  onNewMessage?: (message: AdminMessage) => void;

  /** Callback when message status changes (read receipt) */
  onMessageRead?: (messageId: string) => void;

  /** Callback when conversation list updates */
  onConversationUpdate?: (update: ConversationUpdate) => void;
}
```

#### Return Value

```typescript
interface UseAdminMessagingReturn {
  // Conversation Management
  subscribeToConversation: (userProfileId: string) => void;
  unsubscribeFromConversation: () => void;
  subscribeToConversations: () => void;
  unsubscribeFromConversations: () => void;

  // State
  newMessage: AdminMessage | null;
  conversationUpdates: ConversationUpdate[];
  presenceMap: Map<string, PresenceState>;
  isConversationSubscribed: boolean;
  isConversationsSubscribed: boolean;
  error: string | null;

  // Utilities
  clearNewMessage: () => void;
  clearConversationUpdates: () => void;
  isOnline: (profileId: string) => boolean;
  getLastSeen: (profileId: string) => string | undefined;
}
```

---

## Types

### `AdminMessage`

```typescript
interface AdminMessage {
  id: string;
  sender_profile_id: string;
  receiver_profile_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  receiver?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}
```

### `ConversationUpdate`

```typescript
interface ConversationUpdate {
  profile_id: string;
  message: AdminMessage;
  type: "new_message" | "message_read";
}
```

### `PresenceState`

```typescript
interface PresenceState {
  profileId: string;
  status: "online" | "offline";
  lastSeen?: string;
}
```

---

## Database Schema

The hook works with the following Supabase tables:

### `messages` table (schema: "school software")

```sql
CREATE TABLE "school software".messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id UUID NOT NULL REFERENCES "school software".profiles(id),
  receiver_profile_id UUID NOT NULL REFERENCES "school software".profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_messages_receiver ON "school software".messages(receiver_profile_id);
CREATE INDEX idx_messages_sender ON "school software".messages(sender_profile_id);
CREATE INDEX idx_messages_created_at ON "school software".messages(created_at DESC);
```

### Required Supabase Realtime Configuration

Enable Realtime for the `messages` table:

1. Go to Supabase Dashboard > Database > Replication
2. Enable Realtime for `messages` table
3. Select events: `INSERT`, `UPDATE`

---

## Performance Considerations

### Channel Management

- **Conversation Channel**: One channel per active conversation
- **Conversations Channel**: One channel for all admin messages
- **Presence Channel**: One channel per school (shared across users)

### Best Practices

1. **Unsubscribe When Not Needed**
   ```typescript
   useEffect(() => {
     subscribeToConversation(userId);
     return () => unsubscribeFromConversation();
   }, [userId]);
   ```

2. **Limit Active Subscriptions**
   - Only subscribe to the current conversation
   - Use conversation list subscription for overview
   - Unsubscribe when navigating away

3. **Handle Updates Efficiently**
   ```typescript
   useEffect(() => {
     if (conversationUpdates.length > 0) {
       // Batch process updates
       processUpdates(conversationUpdates);
       // Clear after processing
       clearConversationUpdates();
     }
   }, [conversationUpdates]);
   ```

---

## Troubleshooting

### Messages Not Appearing in Real-time

1. **Check Realtime is enabled**
   - Verify in Supabase Dashboard > Database > Replication
   - Ensure `messages` table has Realtime enabled

2. **Check subscription status**
   ```typescript
   console.log("Subscribed:", isConversationSubscribed);
   console.log("Error:", error);
   ```

3. **Verify profile IDs**
   - Ensure `adminProfileId` and `schoolId` are not null
   - Check that profile IDs match database records

### Presence Not Working

1. **Check school ID**
   - Presence is scoped by school
   - Verify `schoolId` is correct

2. **Check network**
   - Presence requires active WebSocket connection
   - Test in browser console: `supabase.channel('test').subscribe()`

### Sound Not Playing

1. **User interaction required**
   - Most browsers require user interaction before playing audio
   - Sound will work after first click/tap

2. **Disable if needed**
   ```typescript
   useAdminMessaging(profileId, schoolId, { playSound: false });
   ```

---

## Migration Guide

### From Polling to Real-time

**Before:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchMessages();
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

**After:**
```typescript
const { subscribeToConversations, conversationUpdates } =
  useAdminMessaging(profileId, schoolId);

useEffect(() => {
  subscribeToConversations();
  return () => unsubscribeFromConversations();
}, []);

useEffect(() => {
  conversationUpdates.forEach(handleUpdate);
}, [conversationUpdates]);
```

---

## Related Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Admin Messaging DAL](/lib/dal/messages.ts)
- [Student Messaging Hooks](/student-app/hooks/useRealtimeMessages.ts)

---

## Support

For issues or questions:
1. Check this documentation
2. Review example implementations
3. Check browser console for errors
4. Verify Supabase Realtime configuration
