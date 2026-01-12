import { AppShell } from "@/components/layout";
import { getCurrentStudent } from "@/lib/dal/student";
import { createClient } from "@/lib/supabase/server";
import { RealtimeProvider } from "@/components/providers";
import { MessageNotificationProvider } from "@/components/providers/MessageNotificationProvider";
import { Toaster } from "@/components/ui/Toaster";

export const revalidate = 60; // 1 minute - profile data

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Try to get the full student profile from the database first
  const studentData = await getCurrentStudent();

  // Fallback to auth user metadata if student profile not found
  let userData: { name: string; role: string; avatar?: string } | undefined;
  let studentId: string | null = null;
  let profileId: string | null = null;

  if (studentData?.profile) {
    // Use profile data from the database (source of truth)
    userData = {
      name: studentData.profile.full_name || "Student",
      role: studentData.grade_level ? `Grade ${studentData.grade_level} Student` : "Student",
      avatar: studentData.profile.avatar_url || undefined,
    };
    studentId = studentData.id;
    profileId = studentData.profile_id;
  } else {
    // Fallback to auth user metadata if no profile exists yet
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      userData = {
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
        role: "Student",
        avatar: user.user_metadata?.avatar_url,
      };
    }
  }

  return (
    <RealtimeProvider initialStudentId={studentId}>
      <MessageNotificationProvider
        profileId={profileId}
        studentId={studentId}
        userName={userData?.name}
      >
        <AppShell user={userData} studentId={studentId}>{children}</AppShell>
        <Toaster />
      </MessageNotificationProvider>
    </RealtimeProvider>
  );
}
