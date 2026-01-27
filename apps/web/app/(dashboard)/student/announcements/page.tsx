import { redirect } from "next/navigation";
import { getCurrentStudent, getStudentAnnouncements, getUnreadAnnouncementCount } from "@/lib/dal";
import { AnnouncementsClient } from "./AnnouncementsClient";

// Force dynamic rendering - no caching for real-time updates
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnnouncementsPage() {
  // Get current student, redirect if not authenticated
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch announcements and unread count
  const [announcements, unreadCount] = await Promise.all([
    getStudentAnnouncements(student.id, { pageSize: 20 }),
    getUnreadAnnouncementCount(student.id),
  ]);

  return (
    <AnnouncementsClient
      announcements={announcements}
      unreadCount={unreadCount}
      studentId={student.id}
    />
  );
}
