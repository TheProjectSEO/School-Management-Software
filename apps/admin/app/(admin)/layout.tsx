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

      // Use SECURITY DEFINER RPC function to get admin profile
      // This bypasses RLS to avoid circular dependency issues
      const { data: adminData, error: adminError } = await supabase
        .rpc('get_admin_profile', { user_auth_id: user.id });

      if (adminError) {
        console.error("Admin profile RPC error:", adminError);
        router.push("/login");
        return;
      }

      if (!adminData || adminData.length === 0) {
        console.error("No admin profile found");
        router.push("/login");
        return;
      }

      const admin = adminData[0];
      setAdminData({
        adminName: admin.profile_full_name || "Admin",
        adminRole: admin.role,
        schoolName: admin.school_name || "MSU",
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
