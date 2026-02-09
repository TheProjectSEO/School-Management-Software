import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about MSU School Management System",
};

export default function AboutPage() {
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
          About MSU School Management System
        </h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            The MSU School Management System is a unified platform designed for
            Mindanao State University to streamline the management of students,
            teachers, and administrators. Our mission is to provide a modern,
            accessible, and efficient educational experience.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">
            Our Mission
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            To empower educational institutions with tools that enhance teaching
            and learning while reducing administrative burden through technology.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">
            Key Features
          </h2>
          <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
            <li>Student enrollment and progress tracking</li>
            <li>Live class sessions with recording capabilities</li>
            <li>Comprehensive assessment and grading tools</li>
            <li>Real-time attendance management</li>
            <li>AI-powered content generation and analytics</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
