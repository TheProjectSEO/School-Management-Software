/**
 * Generic page skeleton — used as fallback in loading.tsx files.
 * Renders a pulsing header + card grid that fits most list pages.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-4 w-72 bg-gray-100 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>

      {/* Content cards */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Compact table skeleton — for list/table pages */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-gray-200 rounded-lg" />
        <div className="h-9 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2">
        <div className="h-9 w-36 bg-gray-100 rounded-lg" />
        <div className="h-9 w-28 bg-gray-100 rounded-lg" />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="h-10 bg-gray-50 border-b" />
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-14 bg-white border-b last:border-0 px-4 flex items-center gap-4">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
