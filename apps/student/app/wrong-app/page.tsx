"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WrongAppPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Wrong Application
        </h1>

        {/* Message */}
        <p className="text-slate-600 mb-6">
          You&apos;re logged in as a <span className="font-semibold text-blue-600">Teacher</span>,
          but this is the <span className="font-semibold text-emerald-600">Student App</span>.
        </p>

        <p className="text-sm text-slate-500 mb-8">
          Please use the Teacher App to access your dashboard, manage courses,
          and interact with students.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href="http://localhost:3001"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Go to Teacher App
          </a>

          <button
            onClick={handleLogout}
            className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-xs text-slate-400">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
