"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Failed to get user information");
      setLoading(false);
      return;
    }

    // Use SECURITY DEFINER RPC function to check admin access
    // This bypasses RLS to avoid circular dependency issues
    const { data: adminData, error: adminError } = await supabase
      .rpc('get_admin_profile', { user_auth_id: user.id });

    if (adminError) {
      console.error("Admin profile RPC error:", adminError);
      setError("Failed to verify admin access. Please try again.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (!adminData || adminData.length === 0) {
      setError("You do not have admin access. Please contact your administrator.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const adminProfile = adminData[0];
    console.log("Admin verified:", adminProfile.role);

    console.log("Login successful, redirecting to dashboard...");
    // Successfully authenticated as admin
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#7B1113] to-[#5a0c0e]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#7B1113] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-white text-4xl">
              admin_panel_settings
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-gray-500 mt-1">Mindanao State University</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B1113] focus:border-transparent"
              placeholder="admin@msu.edu.ph"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B1113] focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7B1113] text-white py-3 rounded-lg font-semibold hover:bg-[#5a0c0e] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
