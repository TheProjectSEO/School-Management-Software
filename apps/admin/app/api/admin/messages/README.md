# Admin Messaging API Routes

Complete API routes for the admin messaging system, allowing admins to communicate with students and teachers.

## Database Setup

Before using these API routes, run the migration to add admin support to the messages table:

```sql
-- Location: /supabase/migrations/20260112_add_admin_id_to_messages.sql
```

This migration adds:
- `admin_id` column to `direct_messages` table
- Indexes for performance
- RLS policies for admin access
- Updated constraints to allow admin messages

## API Endpoints

### 1. List All Conversations

**Endpoint:** `GET /api/admin/messages/conversations`

Get a list of all message conversations (grouped by participant).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)
- `search` (optional): Search by participant name, subject, or message body

**Response:**
```json
{
  "data": [
    {
      "profileId": "uuid",
      "name": "Student Name",
      "role": "student",
      "lastMessage": {
        "id": "uuid",
        "subject": "Question about homework",
        "body": "I have a question...",
        "isRead": false,
        "createdAt": "2026-01-12T10:30:00Z",
        "fromAdmin": false
      },
      "unreadCount": 3
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

**Example Usage:**
```typescript
const response = await fetch('/api/admin/messages/conversations?page=1&pageSize=20');
const { data, total, page, pageSize, totalPages } = await response.json();
```

### 2. Get Message Thread

**Endpoint:** `GET /api/admin/messages/[profileId]`

Get all messages in a conversation with a specific user (student or teacher).

**Path Parameters:**
- `profileId`: UUID of the student or teacher

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "subject": "Re: Question about homework",
      "body": "Here's the answer...",
      "attachments": [],
      "isRead": true,
      "readAt": "2026-01-12T11:00:00Z",
      "createdAt": "2026-01-12T10:45:00Z",
      "fromAdmin": true,
      "fromName": "Admin Name",
      "parentMessageId": "uuid"
    }
  ],
  "participant": {
    "id": "uuid",
    "name": "Student Name",
    "role": "student",
    "lrn": "123456789",
    "gradeLevel": "10"
  },
  "total": 25,
  "page": 1,
  "pageSize": 50,
  "totalPages": 1
}
```

**Example Usage:**
```typescript
const studentId = 'student-uuid';
const response = await fetch(`/api/admin/messages/${studentId}?page=1`);
const { messages, participant } = await response.json();
```

**Notes:**
- Automatically marks unread messages (to admin) as read
- Returns messages in reverse chronological order (newest first)

### 3. Send Message

**Endpoint:** `POST /api/admin/messages`

Send a message from admin to a user (student or teacher).

**Request Body:**
```json
{
  "recipientId": "uuid",
  "recipientType": "student",
  "subject": "Message subject",
  "message": "Message body",
  "attachments": [
    {
      "name": "file.pdf",
      "url": "https://...",
      "type": "application/pdf",
      "size": 12345
    }
  ],
  "parentMessageId": "uuid"
}
```

**Required Fields:**
- `recipientId`: UUID of the recipient (student or teacher ID)
- `recipientType`: Either "student" or "teacher"
- `subject`: Message subject (non-empty string)
- `message`: Message body (non-empty string)

**Optional Fields:**
- `attachments`: Array of attachment objects (JSON)
- `parentMessageId`: UUID of the parent message (for threading)

**Response (Success - 201):**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "subject": "Message subject",
    "body": "Message body",
    "createdAt": "2026-01-12T10:30:00Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "error": "Missing required fields: recipientId, recipientType, subject, message"
}
```

**Example Usage:**
```typescript
const response = await fetch('/api/admin/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipientId: 'student-uuid',
    recipientType: 'student',
    subject: 'Welcome to the school',
    message: 'Hello! Welcome to our school...',
    attachments: []
  })
});

const { success, message } = await response.json();
```

## Authentication

All endpoints require admin authentication via `getCurrentAdmin()`. Returns:
- `401 Unauthorized` if not authenticated
- `403 Forbidden` if trying to access messages from a different school

## Error Handling

All endpoints follow consistent error handling:

**Common Error Responses:**
- `401`: Unauthorized (not logged in as admin)
- `403`: Forbidden (insufficient permissions or wrong school)
- `404`: Not Found (recipient or message not found)
- `400`: Bad Request (validation errors)
- `500`: Internal Server Error

**Error Response Format:**
```json
{
  "error": "Description of the error"
}
```

## Database Schema

### direct_messages Table

```sql
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  from_student_id UUID REFERENCES students(id),
  to_teacher_id UUID,
  from_teacher_id UUID,
  to_student_id UUID REFERENCES students(id),
  admin_id UUID REFERENCES admin_profiles(id),  -- NEW
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments_json JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES direct_messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Constraints:**
- Messages must have valid sender/recipient combination
- Admin messages tracked via `admin_id` field
- Body and subject cannot be empty
- Read status automatically manages `read_at` timestamp

## TypeScript Types

```typescript
// Conversation list item
interface Conversation {
  profileId: string;
  name: string;
  role: "student" | "teacher";
  lastMessage: {
    id: string;
    subject: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    fromAdmin: boolean;
  };
  unreadCount: number;
}

// Message in a thread
interface Message {
  id: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  fromAdmin: boolean;
  fromName: string;
  parentMessageId: string | null;
}

// Attachment
interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// Participant info
interface Participant {
  id: string;
  name: string;
  role: "student" | "teacher";
  lrn?: string;
  gradeLevel?: string;
}

// Send message request
interface SendMessageRequest {
  recipientId: string;
  recipientType: "student" | "teacher";
  subject: string;
  message: string;
  attachments?: Attachment[];
  parentMessageId?: string;
}

// Paginated response
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

## Security

### Row Level Security (RLS)

The messaging system uses Supabase RLS to ensure:
- Admins can only view messages in their school
- Admins can only send messages to users in their school
- Students/teachers can only view their own messages
- Message read status is properly tracked

### Permission Checks

- All routes verify admin authentication
- School ID matching prevents cross-school access
- Recipient validation ensures messages go to valid users

## Future Enhancements

1. **Teacher Integration**: Currently teacher names show as "Teacher" placeholder
   - Needs teacher_profiles table integration
   - Add teacher name resolution in queries

2. **Batch Messaging**: Send messages to multiple recipients
   - Add bulk send endpoint
   - Template support

3. **Rich Text Support**: Enhanced message formatting
   - HTML content support
   - Markdown rendering

4. **Real-time Updates**: WebSocket/Supabase Realtime
   - Live message notifications
   - Typing indicators

5. **Search & Filters**: Advanced search capabilities
   - Full-text search
   - Filter by date range, read status
   - Archive/delete functionality

## Testing

### Manual Testing

```bash
# 1. List conversations
curl -X GET 'http://localhost:3000/api/admin/messages/conversations?page=1' \
  -H 'Cookie: session=...'

# 2. Get message thread
curl -X GET 'http://localhost:3000/api/admin/messages/{studentId}' \
  -H 'Cookie: session=...'

# 3. Send message
curl -X POST 'http://localhost:3000/api/admin/messages' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=...' \
  -d '{
    "recipientId": "student-uuid",
    "recipientType": "student",
    "subject": "Test message",
    "message": "Hello from admin"
  }'
```

## File Locations

```
admin-app/
├── app/api/admin/messages/
│   ├── conversations/
│   │   └── route.ts          # GET /api/admin/messages/conversations
│   ├── [profileId]/
│   │   └── route.ts          # GET /api/admin/messages/[profileId]
│   ├── route.ts              # POST /api/admin/messages
│   └── README.md             # This file
├── supabase/migrations/
│   └── 20260112_add_admin_id_to_messages.sql
└── lib/dal/
    └── admin.ts              # getCurrentAdmin() helper
```

## Support

For issues or questions:
1. Check error messages in browser console
2. Verify admin authentication
3. Ensure migration has been run
4. Check Supabase logs for RLS policy violations
