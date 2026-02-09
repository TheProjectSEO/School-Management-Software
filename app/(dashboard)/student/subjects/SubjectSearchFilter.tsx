'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Not Started', value: 'not-started' },
];

export function SubjectSearchFilter({
  currentQuery,
  currentStatus,
}: {
  currentQuery: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery);

  const updateParams = useCallback(
    (newQuery?: string, newStatus?: string) => {
      const params = new URLSearchParams(searchParams.toString());

      const q = newQuery ?? query;
      const s = newStatus ?? currentStatus;

      if (q) {
        params.set('q', q);
      } else {
        params.delete('q');
      }

      if (s && s !== 'all') {
        params.set('status', s);
      } else {
        params.delete('status');
      }

      const qs = params.toString();
      router.push(`/student/subjects${qs ? `?${qs}` : ''}`);
    },
    [router, searchParams, query, currentStatus]
  );

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
      <div className="relative w-full md:w-96 group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-slate-400">search</span>
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 text-sm font-medium"
          placeholder="Search subjects, modules..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            updateParams(e.target.value, undefined);
          }}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
        {filterTabs.map((tab) => {
          const isActive = currentStatus === tab.value || (!currentStatus && tab.value === 'all');
          return (
            <button
              key={tab.value}
              onClick={() => updateParams(undefined, tab.value)}
              className={`flex shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 py-2 transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-sm hover:bg-[#5a0c0e]'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
