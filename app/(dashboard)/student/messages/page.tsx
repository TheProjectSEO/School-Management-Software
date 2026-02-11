import { redirect } from "next/navigation";
import {
  getCurrentStudent,
  getStudentConversations,
  getUnreadMessageCount,
  getAvailableTeachers,
  getAvailablePeers,
} from "@/lib/dal";
import { createServiceClient } from "@/lib/supabase/service";
import { MessagesClient } from "./MessagesClient";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MessagesPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch conversations, unread count, available teachers, available peers, and group chats
  const supabase = createServiceClient();

  const [conversations, unreadCount, availableTeachers, availablePeers, groupChatsResult] =
    await Promise.all([
      getStudentConversations(student.id),
      getUnreadMessageCount(student.id),
      getAvailableTeachers(student.id),
      getAvailablePeers(student.id),
      supabase.rpc("get_user_group_chats", { p_profile_id: student.profile_id }),
    ]);

  const groupChats = groupChatsResult.data || [];

  return (
    <MessagesClient
      conversations={conversations}
      unreadCount={unreadCount}
      availableTeachers={availableTeachers}
      availablePeers={availablePeers}
      groupChats={groupChats}
      schoolId={student.school_id}
      profileId={student.profile_id}
    />
  );
}
