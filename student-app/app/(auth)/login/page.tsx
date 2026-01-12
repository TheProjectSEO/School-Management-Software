"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch {
      setError("An unexpected error occurred with Google login");
    }
  };

  return (
    <div className="relative z-10 w-full max-w-[480px] p-4">
      <div className="flex flex-col w-full bg-white dark:bg-[#18212f] rounded-xl shadow-xl border border-[#e7ecf3] dark:border-slate-800 overflow-hidden">
        {/* Header with Logo */}
        <div className="flex flex-col items-center pt-10 px-8 pb-6 text-center">
          <div className="mb-5">
            <BrandLogo size="lg" priority />
          </div>
          <h1 className="text-[#0d131b] dark:text-white text-[28px] font-bold leading-tight tracking-tight">
            Mindanao State University
          </h1>
          <p className="text-[#4c6c9a] dark:text-slate-400 text-base font-normal leading-normal mt-2 max-w-[320px]">
            Student Portal Login
          </p>
        </div>

        {/* Login Form */}
        <div className="flex flex-col px-8 pb-10">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <label className="flex flex-col gap-2">
              <span className="text-[#0d131b] dark:text-slate-200 text-sm font-bold leading-normal">
                Email or Student ID
              </span>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-[#4c6c9a] dark:text-slate-500 select-none">
                  person
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="form-input flex w-full min-w-0 resize-none overflow-hidden rounded-lg text-[#0d131b] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#cfd9e7] dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-primary h-12 pl-12 pr-4 placeholder:text-[#4c6c9a] dark:placeholder:text-slate-500 text-base font-normal leading-normal transition-all"
                  placeholder="student@msu.edu.ph"
                  required
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[#0d131b] dark:text-slate-200 text-sm font-bold leading-normal">
                  Password
                </span>
                <Link
                  href="#"
                  className="text-primary text-sm font-bold hover:text-[#5a0c0e] transition-colors"
                  tabIndex={-1}
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-[#4c6c9a] dark:text-slate-500 select-none">
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="form-input flex w-full min-w-0 resize-none overflow-hidden rounded-lg text-[#0d131b] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#cfd9e7] dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:border-primary h-12 pl-12 pr-12 placeholder:text-[#4c6c9a] dark:placeholder:text-slate-500 text-base font-normal leading-normal transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-[#4c6c9a] dark:text-slate-500 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary hover:bg-[#961517] active:bg-[#5a0c0e] transition-colors text-white text-base font-bold leading-normal tracking-[0.015em] shadow-md shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="truncate">
                {loading ? "Logging in..." : "Log In"}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-wider">
              Or continue with
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cfd9e7] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-[#0d131b] dark:text-slate-200 text-sm font-bold">
                Google
              </span>
            </button>
            <button
              type="button"
              disabled
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cfd9e7] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors opacity-50 cursor-not-allowed"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z" />
                <path fill="#00A4EF" d="M1 13h10v10H1z" />
                <path fill="#7FBA00" d="M13 1h10v10H13z" />
                <path fill="#FFB900" d="M13 13h10v10H13z" />
              </svg>
              <span className="text-[#0d131b] dark:text-slate-200 text-sm font-bold">
                Microsoft
              </span>
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-[#0d131b] dark:text-slate-400 text-sm font-normal">
              New student?
              <Link
                href="/register"
                className="text-primary font-bold hover:text-[#5a0c0e] transition-colors ml-1"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Help Link */}
      <div className="mt-6 text-center">
        <Link
          href="/help"
          className="text-[#4c6c9a] dark:text-slate-500 text-sm font-medium hover:text-primary transition-colors flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">help</span>
          Need help logging in?
        </Link>
      </div>
    </div>
  );
}
