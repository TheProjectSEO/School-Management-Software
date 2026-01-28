'use client';

/**
 * Dashboard Loading Skeleton
 * Displays placeholder cards while dashboard data is loading
 */

export function DashboardHeaderSkeleton() {
  return (
    <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="hidden sm:block text-right">
        <div className="h-5 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mt-1 h-4 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    </header>
  );
}

export function ContinueLearningSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
      <div className="h-48 w-full shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 animate-pulse" />
      <div className="flex flex-1 flex-col justify-center p-6 gap-4">
        <div className="h-6 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-2">
          <div className="h-2 w-full animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="flex gap-3 pt-2">
          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

export function AssessmentCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="mb-3 h-5 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="mb-4 h-4 w-64 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
        <div className="h-4 w-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-4 w-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}

export function ProgressStatsSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-[#1a2634] dark:border-slate-700">
      <div className="mb-4 h-6 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-6 w-12 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-2 w-full animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-6 w-8 mx-auto animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-12 mx-auto animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-[#1a2634] dark:border-slate-700">
      <div className="mb-4 h-6 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-5 w-5 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <DashboardHeaderSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Content Skeleton */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <ContinueLearningSkeleton />
          <div>
            <div className="mb-4 h-6 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <AssessmentCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <ProgressStatsSkeleton />
          <QuickActionsSkeleton />
        </div>
      </div>
    </>
  );
}
