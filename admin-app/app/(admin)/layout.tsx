"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "@/components/layout/AdminSidebar";

interface AdminData {
  adminName: string;
  adminRole: string;
  schoolName: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("auth_user_id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("Profile error:", profileError);
        router.push("/login");
        return;
      }

      // Get admin profile
      const { data: adminProfile, error: adminError } = await supabase
        .from("admin_profiles")
        .select("role, is_active, school_id")
        .eq("profile_id", profile.id)
        .eq("is_active", true)
        .single();

      if (adminError || !adminProfile) {
        console.error("Admin profile error:", adminError);
        router.push("/login");
        return;
      }

      // Get school
      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", adminProfile.school_id)
        .single();

      setAdminData({
        adminName: profile.full_name || "Admin",
        adminRole: adminProfile.role,
        schoolName: school?.name || "MSU",
      });
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f8]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7B1113] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!adminData) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#f6f7f8]">
      <AdminSidebar
        adminName={adminData.adminName}
        adminRole={adminData.adminRole}
        schoolName={adminData.schoolName}
      />
      <main className="flex-1 ml-64 p-6">{children}</main>
    </div>
  );
}
