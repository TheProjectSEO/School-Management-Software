# Admin Messaging API - Quick Reference

Quick reference guide for implementing admin messaging features.

## Setup Checklist

- [ ] Run database migration: `20260112_add_admin_id_to_messages.sql`
- [ ] Import types: `import { ... } from '@/lib/types/messages'`
- [ ] Ensure admin is authenticated
- [ ] Test endpoints with your auth cookies

## API Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/admin/messages/conversations` | List all conversations | Yes (Admin) |
| GET | `/api/admin/messages/[profileId]` | Get message thread | Yes (Admin) |
| POST | `/api/admin/messages` | Send message | Yes (Admin) |

## Quick Examples

### 1. Fetch Conversations

```typescript
import { ConversationsResponse } from '@/lib/types/messages';

async function fetchConversations(page = 1) {
  const response = await fetch(
    `/api/admin/messages/conversations?page=${page}&pageSize=20`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  const data: ConversationsResponse = await response.json();
  return data;
}

// Usage
const { data: conversations, total } = await fetchConversations(1);
```

### 2. Get Message Thread

```typescript
import { MessageThreadResponse } from '@/lib/types/messages';

async function getMessageThread(profileId: string, page = 1) {
  const response = await fetch(
    `/api/admin/messages/${profileId}?page=${page}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  const data: MessageThreadResponse = await response.json();
  return data;
}

// Usage
const { messages, participant } = await getMessageThread('student-uuid');
```

### 3. Send Message

```typescript
import { SendMessageRequest, SendMessageResponse } from '@/lib/types/messages';

async function sendMessage(data: SendMessageRequest) {
  const response = await fetch('/api/admin/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  const result: SendMessageResponse = await response.json();
  return result;
}

// Usage - Send to student
await sendMessage({
  recipientId: 'student-uuid',
  recipientType: 'student',
  subject: 'Welcome!',
  message: 'Hello, welcome to our school.',
});

// Usage - Reply to existing message
await sendMessage({
  recipientId: 'student-uuid',
  recipientType: 'student',
  subject: 'Re: Question',
  message: 'Here is the answer...',
  parentMessageId: 'parent-message-uuid',
  attachments: [
    {
      name: 'document.pdf',
      url: 'https://storage.example.com/doc.pdf',
      type: 'application/pdf',
      size: 12345,
    }
  ],
});
```

## React Component Examples

### Conversation List Component

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Conversation } from '@/lib/types/messages';

export function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadConversations() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/messages/conversations?page=${page}&pageSize=20`
        );
        const data = await response.json();
        setConversations(data.data);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
  }, [page]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <div
          key={conversation.profileId}
          className="p-4 border rounded-lg hover:bg-gray-50"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{conversation.name}</h3>
              <p className="text-sm text-gray-600">
                {conversation.role === 'student' ? 'Student' : 'Teacher'}
              </p>
            </div>
            {conversation.unreadCount > 0 && (
              <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                {conversation.unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-2 truncate">
            {conversation.lastMessage.body}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
```

### Message Thread Component

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Message, MessageParticipant } from '@/lib/types/messages';

interface MessageThreadProps {
  profileId: string;
}

export function MessageThread({ profileId }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [participant, setParticipant] = useState<MessageParticipant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMessages() {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/messages/${profileId}`);
        const data = await response.json();
        setMessages(data.messages);
        setParticipant(data.participant);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [profileId]);

  if (loading) return <div>Loading messages...</div>;

  return (
    <div>
      {participant && (
        <div className="mb-4 p-4 border-b">
          <h2 className="text-xl font-bold">{participant.name}</h2>
          <p className="text-sm text-gray-600">
            {participant.role === 'student'
              ? `Grade ${participant.gradeLevel} - LRN: ${participant.lrn}`
              : `Department: ${participant.department}`
            }
          </p>
        </div>
      )}

      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 rounded-lg ${
              message.fromAdmin
                ? 'bg-blue-100 ml-12'
                : 'bg-gray-100 mr-12'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold">{message.fromName}</span>
              <span className="text-xs text-gray-500">
                {new Date(message.createdAt).toLocaleString()}
              </span>
            </div>
            <h4 className="font-medium mb-1">{message.subject}</h4>
            <p className="text-gray-700">{message.body}</p>

            {message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map((attachment, idx) => (
                  <a
                    key={idx}
                    href={attachment.url}
                    className="text-blue-600 text-sm hover:underline block"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📎 {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Send Message Form

```typescript
'use client';

import { useState } from 'react';
import { SendMessageRequest } from '@/lib/types/messages';

interface SendMessageFormProps {
  recipientId: string;
  recipientType: 'student' | 'teacher';
  onSuccess?: () => void;
}

export function SendMessageForm({
  recipientId,
  recipientType,
  onSuccess,
}: SendMessageFormProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required');
      return;
    }

    try {
      setSending(true);

      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId,
          recipientType,
          subject: subject.trim(),
          message: message.trim(),
        } as SendMessageRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      // Clear form
      setSubject('');
      setMessage('');

      // Call success callback
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Enter subject"
          disabled={sending}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          rows={6}
          placeholder="Enter your message"
          disabled={sending}
          required
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

## Common Patterns

### Search Conversations

```typescript
const [search, setSearch] = useState('');

// Debounced search
useEffect(() => {
  const timer = setTimeout(() => {
    fetchConversations(1, search);
  }, 300);

  return () => clearTimeout(timer);
}, [search]);

async function fetchConversations(page: number, searchQuery?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: '20',
    ...(searchQuery && { search: searchQuery }),
  });

  const response = await fetch(
    `/api/admin/messages/conversations?${params}`
  );
  // ...
}
```

### Pagination

```typescript
function Pagination({ total, page, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex gap-2 justify-center">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1 border rounded"
      >
        Previous
      </button>

      <span className="px-3 py-1">
        Page {page} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1 border rounded"
      >
        Next
      </button>
    </div>
  );
}
```

### Real-time Unread Count

```typescript
// Poll for new messages every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    fetchConversations(currentPage);
  }, 30000);

  return () => clearInterval(interval);
}, [currentPage]);

// Show unread badge
function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

## Error Handling

```typescript
async function handleAPICall<T>(
  promise: Promise<Response>
): Promise<T> {
  try {
    const response = await promise;

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      // Show user-friendly error
      console.error('API Error:', error.message);
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}

// Usage
try {
  const data = await handleAPICall<ConversationsResponse>(
    fetch('/api/admin/messages/conversations')
  );
  setConversations(data.data);
} catch (error) {
  setError(error.message);
}
```

## Testing Checklist

- [ ] List conversations endpoint returns data
- [ ] Pagination works correctly
- [ ] Search filters conversations
- [ ] Get message thread shows all messages
- [ ] Messages mark as read when viewed
- [ ] Send message creates new message
- [ ] Attachments are handled correctly
- [ ] Error handling works for invalid data
- [ ] Auth checks prevent unauthorized access
- [ ] School isolation works (can't see other schools' messages)

## Performance Tips

1. **Pagination**: Always use pagination for large datasets
2. **Caching**: Consider using SWR or React Query for data fetching
3. **Debouncing**: Debounce search inputs to reduce API calls
4. **Optimistic Updates**: Update UI before API response for better UX
5. **Lazy Loading**: Load messages only when conversation is opened

## Next Steps

1. Implement UI components using the examples above
2. Add file upload for attachments
3. Implement real-time updates with Supabase Realtime
4. Add message templates for common responses
5. Implement bulk messaging functionality
