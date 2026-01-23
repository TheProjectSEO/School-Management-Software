'use client';

import Link from "next/link";

/**
 * Empty and error state components for dashboard
 */

export function NoCoursesContinueCard() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center dark:bg-[#1a2634] dark:border-slate-700">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <span className="material-symbols-outlined text-3xl text-slate-400">
          school
        </span>
      </div>
      <h3 className="mb-2 font-display text-xl font-bold text-slate-900 dark:text-white">
        No courses yet
      </h3>
      <p className="mb-4 text-slate-500 dark:text-slate-400">
        Start exploring your subjects to begin learning
      </p>
      <Link
        href="/subjects"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-white transition-transform hover:scale-[1.02] hover:bg-[#5d0016]"
      >
        Browse Subjects
      </Link>
    </div>
  );
}

export function NoUpcomingAssessmentsCard() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center dark:bg-[#1a2634] dark:border-slate-700">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <span className="material-symbols-outlined text-2xl text-slate-400">
          task_alt
        </span>
      </div>
      <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
        No upcoming assessments
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        You're all caught up! Check back later for new assignments.
      </p>
    </div>
  );
}

export function DataLoadingError() {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/10">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400">
            error_outline
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-200">
            Unable to load dashboard
          </h3>
          <p className="text-sm text-red-800/80 dark:text-red-300/80 mt-1">
            We're having trouble loading your dashboard data. Please try refreshing the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}

export function NoDataAvailable() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center dark:bg-[#1a2634] dark:border-slate-700">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <span className="material-symbols-outlined text-3xl text-slate-400">
          dashboard
        </span>
      </div>
      <h3 className="mb-2 font-display text-xl font-bold text-slate-900 dark:text-white">
        Dashboard loading
      </h3>
      <p className="mb-4 text-slate-500 dark:text-slate-400">
        We're preparing your dashboard. This should only take a moment...
      </p>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-100" />
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-200" />
      </div>
    </div>
  );
}

export function ProfileDataMissing() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/30 dark:bg-amber-900/10">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">
            info
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-200">
            Completing your profile
          </h3>
          <p className="text-sm text-amber-800/80 dark:text-amber-300/80 mt-1">
            Your dashboard is ready, but we're still loading some of your information. This is normal and will resolve shortly.
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          >
            <span className="material-symbols-outlined text-sm">person</span>
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
