# useAdminMessaging - Quick Reference

## Import

```typescript
import { useAdminMessaging } from "@/hooks";
```

## Basic Setup

```typescript
const {
  subscribeToConversation,
  newMessage,
  isConversationSubscribed
} = useAdminMessaging(adminProfileId, schoolId);
```

## Common Patterns

### 1. Single Conversation

```typescript
// Subscribe
useEffect(() => {
  subscribeToConversation(userId);
  return () => unsubscribeFromConversation();
}, [userId]);

// Handle new messages
useEffect(() => {
  if (newMessage) {
    addToMessages(newMessage);
    clearNewMessage();
  }
}, [newMessage]);
```

### 2. Conversation List

```typescript
// Subscribe
useEffect(() => {
  subscribeToConversations();
  return () => unsubscribeFromConversations();
}, []);

// Handle updates
useEffect(() => {
  conversationUpdates.forEach(updateConversationList);
  clearConversationUpdates();
}, [conversationUpdates]);
```

### 3. Presence Tracking

```typescript
const { isOnline, getLastSeen } = useAdminMessaging(profileId, schoolId);

// Check status
const online = isOnline(userId);
const lastSeen = getLastSeen(userId);
```

## Props & Options

```typescript
useAdminMessaging(
  adminProfileId: string | null,
  schoolId: string | null,
  {
    playSound?: boolean,
    onNewMessage?: (msg) => void,
    onMessageRead?: (id) => void,
    onConversationUpdate?: (update) => void
  }
)
```

## Return Values

| Property | Type | Description |
|----------|------|-------------|
| `subscribeToConversation(id)` | Function | Subscribe to specific user |
| `unsubscribeFromConversation()` | Function | Unsubscribe from current |
| `subscribeToConversations()` | Function | Subscribe to all updates |
| `unsubscribeFromConversations()` | Function | Unsubscribe from all |
| `newMessage` | AdminMessage \| null | Latest message |
| `conversationUpdates` | ConversationUpdate[] | List updates |
| `presenceMap` | Map | Online/offline status |
| `isConversationSubscribed` | boolean | Connection status |
| `isConversationsSubscribed` | boolean | List connection |
| `error` | string \| null | Connection error |
| `clearNewMessage()` | Function | Clear message state |
| `clearConversationUpdates()` | Function | Clear updates |
| `isOnline(id)` | Function | Check if online |
| `getLastSeen(id)` | Function | Get last seen |

## Database Requirements

### Enable Realtime

1. Supabase Dashboard → Database → Replication
2. Enable for `messages` table
3. Select events: `INSERT`, `UPDATE`

### Schema

```typescript
// Table: "school software".messages
{
  id: uuid
  sender_profile_id: uuid → profiles(id)
  receiver_profile_id: uuid → profiles(id)
  message: text
  is_read: boolean
  created_at: timestamptz
  updated_at: timestamptz
}
```

## Common Issues

### Messages not appearing?
- Check `isConversationSubscribed === true`
- Verify Realtime enabled in Supabase
- Ensure profile IDs are correct

### Sound not playing?
- Requires user interaction first
- Disable: `{ playSound: false }`

### Presence not working?
- Check `schoolId` is correct
- Verify WebSocket connection

## Performance Tips

1. **Unsubscribe when done**
   ```typescript
   return () => unsubscribeFromConversation();
   ```

2. **Clear processed updates**
   ```typescript
   useEffect(() => {
     processUpdates(conversationUpdates);
     clearConversationUpdates();
   }, [conversationUpdates]);
   ```

3. **Limit active subscriptions**
   - Only one conversation at a time
   - Use list subscription for overview

## Examples

See [EXAMPLE_USAGE.tsx](./EXAMPLE_USAGE.tsx) for complete examples:
- Simple conversation
- Conversation list
- Presence indicators
- Custom notifications
- Complete messaging app
