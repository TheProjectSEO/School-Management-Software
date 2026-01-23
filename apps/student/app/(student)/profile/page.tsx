import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentStudent } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";
import AvatarUpload from "./AvatarUpload";

export const revalidate = 300; // 5 minutes - profile

const settingsMenu = [
  { name: "My Profile", icon: "person", active: true, href: "/profile" },
  { name: "Language", icon: "language", active: false, href: "#" },
  { name: "Data Saver", icon: "data_saver_on", active: false, href: "#" },
  { name: "Downloads", icon: "download", active: false, href: "/downloads" },
  { name: "Accessibility", icon: "accessibility_new", active: false, href: "#" },
];

export default async function ProfilePage() {
  // Fetch current student from Supabase
  const student = await getCurrentStudent();

  // Redirect to login if not authenticated
  if (!student) {
    redirect("/login");
  }

  // Get user email from auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Extract data from student and profile
  const profileData = {
    fullName: student.profile.full_name || "",
    studentId: student.lrn || student.id.slice(0, 8).toUpperCase(),
    email: user?.email || "",
    phone: student.profile.phone || "",
    gradeLevel: student.grade_level || "Not assigned",
    sectionId: student.section_id || "",
    avatarUrl: student.profile.avatar_url,
    profileId: student.profile.id,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 -mx-4 sm:-mx-6 lg:-mx-8 -my-8 min-h-[calc(100vh-4rem)]">
      {/* Settings Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634] p-4 overflow-y-auto">
        <div className="flex flex-col h-full justify-between">
          <div className="flex flex-col gap-2">
            <div className="pl-3 pb-4 pt-6">
              <h1 className="text-primary dark:text-msu-gold text-xs font-bold uppercase tracking-wider">
                Settings Menu
              </h1>
            </div>
            {settingsMenu.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active
                    ? "bg-primary/10 text-primary dark:bg-primary/30 dark:text-white border-l-4 border-primary"
                    : "hover:bg-slate-100 dark:hover:bg-slate-700 border-l-4 border-transparent hover:border-msu-gold text-slate-600 dark:text-slate-300"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    item.active ? "" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {item.icon}
                </span>
                <p className={`text-sm ${item.active ? "font-bold" : "font-medium"}`}>
                  {item.name}
                </p>
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-1 mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-primary hover:bg-primary/5 dark:hover:bg-slate-700 transition-colors w-full text-left">
              <span className="material-symbols-outlined">logout</span>
              <p className="text-sm font-bold">Logout</p>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0f1a24]">
        <div className="max-w-4xl mx-auto pb-20 p-4 sm:p-6 lg:p-8">
          {/* Profile Header Card */}
          <div className="bg-white dark:bg-[#1a2634] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 overflow-hidden">
            {/* Banner */}
            <div className="h-32 bg-gradient-to-r from-primary to-[#5a0c0e] relative">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-msu-gold"></div>
            </div>

            {/* Profile Info */}
            <div className="px-6 sm:px-8 pb-8 relative">
              <AvatarUpload
                currentAvatarUrl={profileData.avatarUrl}
                fullName={profileData.fullName}
              />

              {/* Academic Info below avatar */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-msu-gold text-lg">
                    school
                  </span>
                  <p className="text-msu-gold text-base font-semibold">
                    {profileData.gradeLevel}
                  </p>
                </div>
                {profileData.studentId && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    ID: {profileData.studentId}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Card - Client Component for interactivity */}
          <ProfileForm profileData={profileData} />
        </div>
      </main>
    </div>
  );
}
