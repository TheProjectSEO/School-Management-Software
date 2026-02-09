import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore the features of MSU School Management System",
};

const features = [
  {
    icon: "school",
    title: "Student Portal",
    description:
      "Students can view enrolled subjects, track progress, take assessments, and join live sessions.",
  },
  {
    icon: "person",
    title: "Teacher Dashboard",
    description:
      "Teachers can manage classes, create content, grade assessments, and conduct live sessions.",
  },
  {
    icon: "admin_panel_settings",
    title: "Admin Panel",
    description:
      "Administrators can manage users, enrollments, reports, and school-wide settings.",
  },
  {
    icon: "videocam",
    title: "Live Sessions",
    description:
      "Integrated video conferencing with recording, transcription, and Q&A features.",
  },
  {
    icon: "quiz",
    title: "Assessments",
    description:
      "Create quizzes, exams, and assignments with auto-grading and question banks.",
  },
  {
    icon: "auto_awesome",
    title: "AI-Powered Tools",
    description:
      "AI-assisted content generation, progress reports, and student alert systems.",
  },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <Link
          href="/"
          className="text-sm text-primary hover:underline mb-8 inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mt-4 mb-4">
          Features
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-12">
          Everything you need to run a modern educational institution.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-2xl">
                  {feature.icon}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
