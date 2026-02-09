import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the MSU School Management System team",
};

export default function ContactPage() {
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

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mt-4 mb-6">
          Contact Us
        </h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            Have questions or need support? Reach out to us through any of the
            channels below.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Email
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                support@klase.ph
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Office Hours
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Monday - Friday, 8:00 AM - 5:00 PM PHT
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
