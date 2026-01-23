# Realtime Schema Fixes

## Summary

Fixed schema mismatches in all Realtime subscription code. All database tables are in the `"school software"` schema, not `"public"` or `"n8n_content_creation"`.

## Issue

Realtime subscriptions were using incorrect schema references, causing them to fail to receive database change events:
- Some used `schema: "public"`
- Some used `schema: "n8n_content_creation"`
- All should use `schema: "school software"`

## Files Fixed

### 1. `/hooks/useRealtimeNotifications.ts`

**Lines Changed:** 192, 220

**Before:**
```typescript
.on("postgres_changes", {
  event: "INSERT",
  schema: "public",  // ❌ WRONG
  table: "student_notifications",
  filter: `student_id=eq.${studentId}`,
})
```

**After:**
```typescript
.on("postgres_changes", {
  event: "INSERT",
  schema: "school software",  // ✅ CORRECT
  table: "student_notifications",
  filter: `student_id=eq.${studentId}`,
})
```

**Impact:**
- Fixed INSERT events for new student notifications
- Fixed UPDATE events for notification read status changes

---

### 2. `/components/providers/MessageNotificationProvider.tsx`

**Lines Changed:** 151

**Before:**
```typescript
.on("postgres_changes", {
  event: "INSERT",
  schema: "n8n_content_creation",  // ❌ WRONG
  table: "teacher_direct_messages",
  filter: `to_profile_id=eq.${profileId}`,
})
```

**After:**
```typescript
.on("postgres_changes", {
  event: "INSERT",
  schema: "school software",  // ✅ CORRECT
  table: "teacher_direct_messages",
  filter: `to_profile_id=eq.${profileId}`,
})
```

**Impact:**
- Fixed global message notifications
- Toast notifications will now appear for new messages
- Unread count will update in real-time

---

### 3. `/hooks/useRealtimeMessages.ts`

**Lines Changed:** 139, 159

**Before:**
```typescript
// Insert events
.on("postgres_changes", {
  event: "INSERT",
  schema: "n8n_content_creation",  // ❌ WRONG
  table: "teacher_direct_messages",
  filter: `to_profile_id=eq.${profileId}`,
})

// Update events
.on("postgres_changes", {
  event: "UPDATE",
  schema: "n8n_content_creation",  // ❌ WRONG
  table: "teacher_direct_messages",
  filter: `from_profile_id=eq.${profileId}`,
})
```

**After:**
```typescript
// Insert events
.on("postgres_changes", {
  event: "INSERT",
  schema: "school software",  // ✅ CORRECT
  table: "teacher_direct_messages",
  filter: `to_profile_id=eq.${profileId}`,
})

// Update events
.on("postgres_changes", {
  event: "UPDATE",
  schema: "school software",  // ✅ CORRECT
  table: "teacher_direct_messages",
  filter: `from_profile_id=eq.${profileId}`,
})
```

**Impact:**
- Fixed real-time message delivery in conversations
- Fixed read receipt updates (delivered/read status)
- Messages will now appear instantly without page refresh

---

### 4. `/hooks/usePresence.ts`

**Status:** ✅ No changes needed

**Reason:** Presence uses Supabase Presence API (`.on("presence", ...)`) which doesn't require a schema parameter. It tracks online/offline status in memory, not in the database.

```typescript
// This is correct - presence doesn't use postgres_changes
.on("presence", { event: "sync" }, () => { ... })
.on("presence", { event: "join" }, () => { ... })
.on("presence", { event: "leave" }, () => { ... })
```

---

### 5. `/hooks/useTypingIndicator.ts`

**Status:** ✅ No changes needed

**Reason:** Typing indicators use Supabase Broadcast API (`.on("broadcast", ...)`) which is ephemeral and doesn't require a schema parameter. Events are sent directly between clients without database storage.

```typescript
// This is correct - broadcast doesn't use postgres_changes
.on("broadcast", { event: "typing" }, (payload) => { ... })
```

---

## Testing Checklist

After these fixes, verify the following features work correctly:

### Notifications
- [ ] New notifications appear in real-time
- [ ] Unread count updates automatically
- [ ] Marking as read updates UI instantly
- [ ] Notification sound plays for new notifications

### Messages
- [ ] New messages appear instantly in conversation
- [ ] Message sent from another device appears in real-time
- [ ] Read receipts update (checkmarks change from sent → delivered → read)
- [ ] Unread count badge updates on new messages
- [ ] Toast notifications appear for new messages

### Presence
- [ ] User shows as "online" when logged in
- [ ] User shows as "offline" when they log out
- [ ] Online status updates in real-time

### Typing Indicators
- [ ] "User is typing..." appears when partner types
- [ ] Typing indicator disappears after 3 seconds of inactivity
- [ ] Typing indicator clears when message is sent

---

## Database Schema Reference

All tables are in the `"school software"` schema:

```sql
-- Tables that use Realtime
"school software".student_notifications
"school software".teacher_direct_messages
"school software".profiles
```

---

## Realtime Subscription Patterns

### Postgres Changes (Database Events)

For INSERT, UPDATE, DELETE events on database tables:

```typescript
supabase
  .channel('channel-name')
  .on('postgres_changes', {
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    schema: 'school software',  // ✅ REQUIRED - must match database schema
    table: 'table_name',
    filter: 'column=eq.value',  // Optional filter
  }, (payload) => {
    // Handle change
  })
  .subscribe()
```

### Presence (Online/Offline Tracking)

For tracking user presence (no database storage):

```typescript
supabase
  .channel('presence-channel')
  .on('presence', { event: 'sync' | 'join' | 'leave' }, (payload) => {
    // Handle presence change
  })
  .subscribe()
```

**Note:** Presence does NOT use `schema` parameter.

### Broadcast (Ephemeral Events)

For temporary events between clients (no database storage):

```typescript
supabase
  .channel('broadcast-channel')
  .on('broadcast', { event: 'custom-event' }, (payload) => {
    // Handle broadcast
  })
  .subscribe()
```

**Note:** Broadcast does NOT use `schema` parameter.

---

## Common Mistakes to Avoid

### ❌ Wrong Schema
```typescript
schema: "public"  // Tables are NOT in public schema
schema: "n8n_content_creation"  // This is from a different project
```

### ✅ Correct Schema
```typescript
schema: "school software"  // All our tables are here
```

### ❌ Using Schema for Presence/Broadcast
```typescript
// WRONG - presence doesn't use schema
.on('presence', {
  event: 'sync',
  schema: 'school software'  // This will cause errors
})

// WRONG - broadcast doesn't use schema
.on('broadcast', {
  event: 'typing',
  schema: 'school software'  // This will cause errors
})
```

### ✅ Correct Presence/Broadcast
```typescript
// CORRECT - no schema parameter
.on('presence', { event: 'sync' })
.on('broadcast', { event: 'typing' })
```

---

## Impact

These fixes resolve the following issues:

1. **Notifications not appearing in real-time** - Students now see notifications immediately
2. **Message delivery delays** - Messages appear instantly in conversations
3. **Read receipts not updating** - Checkmarks now update in real-time
4. **Unread counts out of sync** - Badge counts update automatically

All Realtime features should now work as expected with proper database schema references.

---

## Related Documentation

- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Postgres Changes: https://supabase.com/docs/guides/realtime/postgres-changes
- Presence: https://supabase.com/docs/guides/realtime/presence
- Broadcast: https://supabase.com/docs/guides/realtime/broadcast
