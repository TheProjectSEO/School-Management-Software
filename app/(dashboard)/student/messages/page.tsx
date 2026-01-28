import { redirect } from "next/navigation";
import {
  getCurrentStudent,
  getStudentConversations,
  getUnreadMessageCount,
  getAvailableTeachers,
  getAvailableAdmins,
} from "@/lib/dal";
import { MessagesClient } from "./MessagesClient";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MessagesPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch conversations, unread count, available teachers, and admins
  const [conversations, unreadCount, availableTeachers, availableAdmins] = await Promise.all([
    getStudentConversations(student.id),
    getUnreadMessageCount(student.id),
    getAvailableTeachers(student.id),
    getAvailableAdmins(student.school_id),
  ]);

  return (
    <MessagesClient
      conversations={conversations}
      unreadCount={unreadCount}
      availableTeachers={availableTeachers}
      availableAdmins={availableAdmins}
      studentId={student.id}
      schoolId={student.school_id}
      profileId={student.profile_id}
    />
  );
}
