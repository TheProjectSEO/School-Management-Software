/**
 * Teacher Communication Data Access Layer
 *
 * Handles announcements, discussions, direct messages, and notifications.
 * All queries use n8n_content_creation schema.
 */

import { createClient } from '@/lib/supabase/server';

// Types
export interface Announcement {
  id: string;
  scope_type: 'section' | 'subject_multi_section';
  scope_ids_json: string[];
  title: string;
  body: string;
  attachments_json?: string[];
  publish_at?: string;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementInput {
  scope_type: 'section' | 'subject_multi_section';
  scope_ids: string[];
  title: string;
  body: string;
  attachments_json?: string[];
  publish_at?: string;
  created_by: string;
}

export interface DiscussionThread {
  id: string;
  section_subject_id: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  post_count?: number;
  last_post_at?: string;
}

export interface DiscussionPost {
  id: string;
  thread_id: string;
  created_by: string;
  body: string;
  attachments_json?: string[];
  created_at: string;
  author_name?: string;
  author_avatar?: string;
}

export interface DirectMessage {
  id: string;
  school_id: string;
  from_user: string;
  to_user: string;
  body: string;
  attachments_json?: string[];
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

export interface SendDirectMessageInput {
  to_profile_id: string;
  body: string;
  attachments_json?: string[];
}

export interface Notification {
  id: string;
  to_user: string;
  type: 'announcement' | 'message' | 'submission' | 'grade' | 'assignment' | 'system';
  entity_ref_json?: Record<string, unknown>;
  payload_json?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

/**
 * Send an announcement to section(s) or subject across sections
 * Automatically creates notifications for all students in scope
 */
export async function sendAnnouncement(
  input: CreateAnnouncementInput
): Promise<Announcement | null> {
  try {
    const supabase = await createClient();

    // Create announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        scope_type: input.scope_type,
        scope_ids_json: input.scope_ids,
        title: input.title,
        body: input.body,
        attachments_json: input.attachments_json,
        publish_at: input.publish_at || new Date().toISOString(),
        is_published: !input.publish_at, // Publish immediately if no future date
        created_by: input.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return null;
    }

    // Get all students in scope
    let studentIds: string[] = [];

    if (input.scope_type === 'section') {
      // Get students from section enrollments
      const { data: enrollments } = await supabase
        .from('section_enrollments')
        .select('student_id')
        .in('section_id', input.scope_ids)
        .eq('status', 'active');

      studentIds = (enrollments || []).map(e => e.student_id);
    } else {
      // Get students from all sections for this subject
      const { data: sectionSubjects } = await supabase
        .from('section_subjects')
        .select('section_id')
        .in('id', input.scope_ids);

      const sectionIds = (sectionSubjects || []).map(ss => ss.section_id);

      const { data: enrollments } = await supabase
        .from('section_enrollments')
        .select('student_id')
        .in('section_id', sectionIds)
        .eq('status', 'active');

      studentIds = (enrollments || []).map(e => e.student_id);
    }

    // Create notifications for all students
    if (studentIds.length > 0) {
      const notifications = studentIds.map(studentId => ({
        to_user: studentId,
        type: 'announcement' as const,
        entity_ref_json: { announcement_id: announcement.id },
        payload_json: {
          title: input.title,
          preview: input.body.substring(0, 100)
        },
        is_read: false,
        created_at: new Date().toISOString()
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return announcement as Announcement;
  } catch (error) {
    console.error('Unexpected error in sendAnnouncement:', error);
    return null;
  }
}

/**
 * Get discussion threads for a course/section
 */
export async function getDiscussionThreads(
  sectionSubjectId: string
): Promise<DiscussionThread[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('discussion_threads')
      .select(`
        *,
        discussion_posts (count)
      `)
      .eq('section_subject_id', sectionSubjectId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching discussion threads:', error);
      return [];
    }

    return (data || []).map((thread: any) => ({
      ...thread,
      post_count: thread.discussion_posts?.[0]?.count || 0
    })) as DiscussionThread[];
  } catch (error) {
    console.error('Unexpected error in getDiscussionThreads:', error);
    return [];
  }
}

/**
 * Create a new discussion thread
 */
export async function createDiscussionThread(
  sectionSubjectId: string,
  title: string,
  createdBy: string
): Promise<DiscussionThread | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('discussion_threads')
      .insert({
        section_subject_id: sectionSubjectId,
        title,
        is_pinned: false,
        is_locked: false,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating discussion thread:', error);
      return null;
    }

    return data as DiscussionThread;
  } catch (error) {
    console.error('Unexpected error in createDiscussionThread:', error);
    return null;
  }
}

/**
 * Get posts for a discussion thread
 */
export async function getThreadPosts(threadId: string): Promise<DiscussionPost[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('discussion_posts')
      .select(`
        *,
        user_profiles (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching thread posts:', error);
      return [];
    }

    return (data || []).map((post: any) => ({
      ...post,
      author_name: `${post.user_profiles?.first_name || ''} ${post.user_profiles?.last_name || ''}`.trim(),
      author_avatar: post.user_profiles?.avatar_url
    })) as DiscussionPost[];
  } catch (error) {
    console.error('Unexpected error in getThreadPosts:', error);
    return [];
  }
}

/**
 * Add a post to a discussion thread
 */
export async function addThreadPost(
  threadId: string,
  body: string,
  createdBy: string,
  attachments?: string[]
): Promise<DiscussionPost | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('discussion_posts')
      .insert({
        thread_id: threadId,
        created_by: createdBy,
        body,
        attachments_json: attachments,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding thread post:', error);
      return null;
    }

    // Update thread's updated_at
    await supabase
      .from('discussion_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    return data as DiscussionPost;
  } catch (error) {
    console.error('Unexpected error in addThreadPost:', error);
    return null;
  }
}

/**
 * Send a direct message to a student
 */
export async function sendDirectMessage(
  input: SendDirectMessageInput,
  fromUserId: string,
  schoolId: string
): Promise<DirectMessage | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        school_id: schoolId,
        from_user: fromUserId,
        to_user: input.to_profile_id,
        body: input.body,
        attachments_json: input.attachments_json,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending direct message:', error);
      return null;
    }

    // Create notification for recipient
    await supabase.from('notifications').insert({
      to_user: input.to_profile_id,
      type: 'message',
      entity_ref_json: { message_id: data.id },
      payload_json: {
        preview: input.body.substring(0, 100)
      },
      is_read: false,
      created_at: new Date().toISOString()
    });

    return data as DirectMessage;
  } catch (error) {
    console.error('Unexpected error in sendDirectMessage:', error);
    return null;
  }
}

/**
 * Get all messages for a teacher (sent and received)
 */
export async function getMessages(teacherId: string): Promise<DirectMessage[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:user_profiles!from_user (
          first_name,
          last_name
        ),
        recipient:user_profiles!to_user (
          first_name,
          last_name
        )
      `)
      .or(`from_user.eq.${teacherId},to_user.eq.${teacherId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      ...msg,
      sender_name: `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim(),
      recipient_name: `${msg.recipient?.first_name || ''} ${msg.recipient?.last_name || ''}`.trim()
    })) as DirectMessage[];
  } catch (error) {
    console.error('Unexpected error in getMessages:', error);
    return [];
  }
}

/**
 * Get conversation between teacher and a specific student
 */
export async function getConversation(
  teacherId: string,
  studentId: string
): Promise<DirectMessage[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:user_profiles!from_user (
          first_name,
          last_name,
          avatar_url
        ),
        recipient:user_profiles!to_user (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .or(
        `and(from_user.eq.${teacherId},to_user.eq.${studentId}),and(from_user.eq.${studentId},to_user.eq.${teacherId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching conversation:', error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      ...msg,
      sender_name: `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim(),
      recipient_name: `${msg.recipient?.first_name || ''} ${msg.recipient?.last_name || ''}`.trim()
    })) as DirectMessage[];
  } catch (error) {
    console.error('Unexpected error in getConversation:', error);
    return [];
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('direct_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error marking message as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in markMessageAsRead:', error);
    return false;
  }
}

/**
 * Get unread message count for teacher
 */
export async function getUnreadMessageCount(teacherId: string): Promise<number> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('to_user', teacherId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Unexpected error in getUnreadMessageCount:', error);
    return 0;
  }
}
