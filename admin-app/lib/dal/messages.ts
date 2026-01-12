import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "./admin";
import { logAuditEvent } from "./admin";

// Types
export interface Message {
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

export interface Conversation {
  profile_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_sender: boolean; // true if admin sent last message, false if user sent it
}

export interface MessageThread {
  profile_id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  messages: Message[];
  total_messages: number;
}

export interface SendMessageResult {
  success: boolean;
  message?: Message;
  error?: string;
}

// Functions

/**
 * Get all conversations with last message
 * Returns a list of unique users the admin has messaged with,
 * along with the last message and unread count
 */
export async function listConversations(): Promise<{
  conversations: Conversation[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const admin = await getCurrentAdmin();

    if (!admin) {
      return { conversations: [], error: "Admin not authenticated" };
    }

    // Get all messages where admin is sender or receiver
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(
        `
        id,
        sender_profile_id,
        receiver_profile_id,
        message,
        is_read,
        created_at,
        sender:profiles!messages_sender_profile_id_fkey(id, full_name, email, avatar_url),
        receiver:profiles!messages_receiver_profile_id_fkey(id, full_name, email, avatar_url)
      `
      )
      .or(
        `sender_profile_id.eq.${admin.profile_id},receiver_profile_id.eq.${admin.profile_id}`
      )
      .order("created_at", { ascending: false });

    if (messagesError) {
      console.error("Error fetching conversations:", messagesError);
      return { conversations: [], error: messagesError.message };
    }

    if (!messages || messages.length === 0) {
      return { conversations: [] };
    }

    // Group messages by conversation partner
    const conversationMap = new Map<string, Conversation>();

    messages.forEach((msg: any) => {
      // Determine who the conversation partner is
      const isAdminSender = msg.sender_profile_id === admin.profile_id;
      const partnerId = isAdminSender
        ? msg.receiver_profile_id
        : msg.sender_profile_id;
      const partner = isAdminSender ? msg.receiver : msg.sender;

      // Skip if partner data is missing
      if (!partner) return;

      // Check if we already have this conversation
      const existing = conversationMap.get(partnerId);

      if (!existing) {
        // First message in this conversation
        conversationMap.set(partnerId, {
          profile_id: partnerId,
          full_name: partner.full_name,
          email: partner.email,
          avatar_url: partner.avatar_url,
          last_message: msg.message,
          last_message_time: msg.created_at,
          unread_count: !isAdminSender && !msg.is_read ? 1 : 0,
          is_sender: isAdminSender,
        });
      } else {
        // Update unread count if this is an unread message from the partner
        if (!isAdminSender && !msg.is_read) {
          existing.unread_count += 1;
        }
      }
    });

    // Convert map to array and sort by last message time
    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.last_message_time).getTime() -
        new Date(a.last_message_time).getTime()
    );

    return { conversations };
  } catch (error) {
    console.error("Error in listConversations:", error);
    return {
      conversations: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all messages with a specific user
 * Returns the complete message thread between admin and user
 */
export async function getMessageThread(
  profileId: string
): Promise<MessageThread | null> {
  try {
    const supabase = await createClient();
    const admin = await getCurrentAdmin();

    if (!admin) {
      console.error("Admin not authenticated");
      return null;
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .eq("id", profileId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return null;
    }

    // Get all messages between admin and user
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(
        `
        id,
        sender_profile_id,
        receiver_profile_id,
        message,
        is_read,
        created_at,
        updated_at,
        sender:profiles!messages_sender_profile_id_fkey(id, full_name, email, avatar_url),
        receiver:profiles!messages_receiver_profile_id_fkey(id, full_name, email, avatar_url)
      `
      )
      .or(
        `and(sender_profile_id.eq.${admin.profile_id},receiver_profile_id.eq.${profileId}),and(sender_profile_id.eq.${profileId},receiver_profile_id.eq.${admin.profile_id})`
      )
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching message thread:", messagesError);
      return null;
    }

    // Map messages to correct format (Supabase returns sender/receiver as arrays)
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      sender_profile_id: msg.sender_profile_id,
      receiver_profile_id: msg.receiver_profile_id,
      message: msg.message,
      is_read: msg.is_read,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
      receiver: Array.isArray(msg.receiver) ? msg.receiver[0] : msg.receiver,
    }));

    return {
      profile_id: profileId,
      user: userProfile,
      messages: formattedMessages as Message[],
      total_messages: messages?.length || 0,
    };
  } catch (error) {
    console.error("Error in getMessageThread:", error);
    return null;
  }
}

/**
 * Send a message as admin to a user
 * Creates a new message record and logs the audit event
 */
export async function sendMessage(
  toProfileId: string,
  message: string
): Promise<SendMessageResult> {
  try {
    const supabase = await createClient();
    const admin = await getCurrentAdmin();

    if (!admin) {
      return { success: false, error: "Admin not authenticated" };
    }

    if (!message.trim()) {
      return { success: false, error: "Message cannot be empty" };
    }

    // Verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", toProfileId)
      .single();

    if (recipientError || !recipient) {
      return { success: false, error: "Recipient not found" };
    }

    // Create message
    const { data: newMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_profile_id: admin.profile_id,
        receiver_profile_id: toProfileId,
        message: message.trim(),
        is_read: false,
      })
      .select(
        `
        id,
        sender_profile_id,
        receiver_profile_id,
        message,
        is_read,
        created_at,
        updated_at,
        sender:profiles!messages_sender_profile_id_fkey(id, full_name, email, avatar_url),
        receiver:profiles!messages_receiver_profile_id_fkey(id, full_name, email, avatar_url)
      `
      )
      .single();

    if (messageError) {
      console.error("Error sending message:", messageError);
      return { success: false, error: messageError.message };
    }

    // Log audit event
    await logAuditEvent({
      action: "send",
      entityType: "message",
      entityId: newMessage.id,
      metadata: {
        recipient_id: toProfileId,
        recipient_name: recipient.full_name,
        recipient_email: recipient.email,
        message_preview: message.substring(0, 50),
      },
    });

    // Format message (Supabase returns sender/receiver as arrays)
    const formattedMessage: Message = {
      id: newMessage.id,
      sender_profile_id: newMessage.sender_profile_id,
      receiver_profile_id: newMessage.receiver_profile_id,
      message: newMessage.message,
      is_read: newMessage.is_read,
      created_at: newMessage.created_at,
      updated_at: newMessage.updated_at,
      sender: Array.isArray(newMessage.sender) ? newMessage.sender[0] : newMessage.sender,
      receiver: Array.isArray(newMessage.receiver) ? newMessage.receiver[0] : newMessage.receiver,
    };

    return {
      success: true,
      message: formattedMessage,
    };
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Mark all messages from a user as read
 * Updates all unread messages from the specified user to read status
 */
export async function markAsRead(
  profileId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const admin = await getCurrentAdmin();

    if (!admin) {
      return { success: false, error: "Admin not authenticated" };
    }

    // Mark all unread messages from this user as read
    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("sender_profile_id", profileId)
      .eq("receiver_profile_id", admin.profile_id)
      .eq("is_read", false)
      .select("id");

    if (error) {
      console.error("Error marking messages as read:", error);
      return { success: false, error: error.message };
    }

    const count = data?.length || 0;

    if (count > 0) {
      await logAuditEvent({
        action: "mark_read",
        entityType: "message",
        metadata: {
          user_id: profileId,
          messages_marked: count,
        },
      });
    }

    return { success: true, count };
  } catch (error) {
    console.error("Error in markAsRead:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get total unread message count for admin
 * Returns the count of all unread messages sent to the admin
 */
export async function getUnreadCount(): Promise<{
  count: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const admin = await getCurrentAdmin();

    if (!admin) {
      return { count: 0, error: "Admin not authenticated" };
    }

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_profile_id", admin.profile_id)
      .eq("is_read", false);

    if (error) {
      console.error("Error getting unread count:", error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0 };
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    return {
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a message (soft delete by marking as deleted)
 * Note: Consider implementing soft delete if needed
 */
export async function deleteMessage(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const admin = await getCurrentAdmin();

    if (!admin) {
      return { success: false, error: "Admin not authenticated" };
    }

    // Verify admin is the sender
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("id, sender_profile_id")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      return { success: false, error: "Message not found" };
    }

    if (message.sender_profile_id !== admin.profile_id) {
      return { success: false, error: "Unauthorized to delete this message" };
    }

    // Delete the message
    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) {
      console.error("Error deleting message:", deleteError);
      return { success: false, error: deleteError.message };
    }

    await logAuditEvent({
      action: "delete",
      entityType: "message",
      entityId: messageId,
    });

    return { success: true };
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search messages by content
 * Returns messages matching the search query
 */
export async function searchMessages(
  query: string
): Promise<{ messages: Message[]; error?: string }> {
  try {
    const supabase = await createClient();
    const admin = await getCurrentAdmin();

    if (!admin) {
      return { messages: [], error: "Admin not authenticated" };
    }

    if (!query.trim()) {
      return { messages: [] };
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select(
        `
        id,
        sender_profile_id,
        receiver_profile_id,
        message,
        is_read,
        created_at,
        updated_at,
        sender:profiles!messages_sender_profile_id_fkey(id, full_name, email, avatar_url),
        receiver:profiles!messages_receiver_profile_id_fkey(id, full_name, email, avatar_url)
      `
      )
      .or(
        `sender_profile_id.eq.${admin.profile_id},receiver_profile_id.eq.${admin.profile_id}`
      )
      .ilike("message", `%${query.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error searching messages:", error);
      return { messages: [], error: error.message };
    }

    // Format messages (Supabase returns sender/receiver as arrays)
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      sender_profile_id: msg.sender_profile_id,
      receiver_profile_id: msg.receiver_profile_id,
      message: msg.message,
      is_read: msg.is_read,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
      receiver: Array.isArray(msg.receiver) ? msg.receiver[0] : msg.receiver,
    }));

    return { messages: formattedMessages as Message[] };
  } catch (error) {
    console.error("Error in searchMessages:", error);
    return {
      messages: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
