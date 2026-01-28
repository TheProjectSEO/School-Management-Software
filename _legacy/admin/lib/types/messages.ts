/**
 * Message type definitions
 *
 * Database schema (to be created):
 *
 * CREATE TABLE messages (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   sender_id UUID REFERENCES profiles(id) NOT NULL,
 *   recipient_id UUID REFERENCES profiles(id) NOT NULL,
 *   subject VARCHAR(255) NOT NULL,
 *   body TEXT NOT NULL,
 *   is_read BOOLEAN DEFAULT false,
 *   read_at TIMESTAMP,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW(),
 *   deleted_at TIMESTAMP,
 *
 *   -- Optional: For threading/conversations
 *   parent_message_id UUID REFERENCES messages(id),
 *   thread_id UUID,
 *
 *   -- Optional: For attachments
 *   attachments JSONB,
 *
 *   -- Indexes
 *   INDEX idx_messages_recipient (recipient_id, is_read),
 *   INDEX idx_messages_sender (sender_id),
 *   INDEX idx_messages_thread (thread_id),
 *   INDEX idx_messages_created (created_at DESC)
 * );
 */

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  parent_message_id?: string;
  thread_id?: string;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface MessageThread {
  id: string;
  subject: string;
  participants: string[];
  last_message_at: string;
  unread_count: number;
  messages: Message[];
}

export interface UnreadCountResponse {
  count: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  page: number;
  pageSize: number;
}
