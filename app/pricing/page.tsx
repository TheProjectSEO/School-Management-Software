import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "MSU School Management System pricing plans",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <Link
          href="/"
          className="text-sm text-primary hover:underline mb-8 inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mt-4 mb-4">
          Pricing
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-12">
          MSU School Management System is provided free of charge to accredited
          departments and units of Mindanao State University.
        </p>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
          <div className="text-5xl font-bold text-primary mb-2">Free</div>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            For all MSU departments and affiliated institutions
          </p>
          <ul className="text-left max-w-md mx-auto space-y-3 text-slate-700 dark:text-slate-300 mb-8">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 text-lg">
                check_circle
              </span>
              Unlimited students and teachers
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 text-lg">
                check_circle
              </span>
              Live sessions with recording
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 text-lg">
                check_circle
              </span>
              Full assessment and grading suite
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 text-lg">
                check_circle
              </span>
              AI-powered tools and analytics
            </li>
          </ul>
          <Link
            href="/apply"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-sm font-bold text-white hover:bg-[#5a0c0e] transition-colors"
          >
            Apply for Access
          </Link>
        </div>
      </div>
    </main>
  );
}
