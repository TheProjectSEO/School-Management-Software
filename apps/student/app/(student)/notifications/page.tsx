import { redirect } from "next/navigation";
import { getCurrentStudent, getNotifications, getUnreadNotificationCount } from "@/lib/dal";
import { NotificationsClient } from "./NotificationsClient";

// Force dynamic rendering - no caching for real-time updates
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificationsPage() {
  // Get current student, redirect if not authenticated
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch notifications and unread count
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(student.id, { pageSize: 20 }),
    getUnreadNotificationCount(student.id),
  ]);

  return (
    <NotificationsClient
      notifications={notifications}
      unreadCount={unreadCount}
      studentId={student.id}
    />
  );
}
