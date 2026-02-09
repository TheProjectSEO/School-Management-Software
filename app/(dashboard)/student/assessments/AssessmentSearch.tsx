'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function AssessmentSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const handleChange = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    router.push(`/student/assessments${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="relative flex-1">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
        <span className="material-symbols-outlined">search</span>
      </span>
      <input
        className="w-full pl-10 pr-4 py-3 rounded-lg border-none bg-white dark:bg-[#1a2634] shadow-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary"
        placeholder="Search assessments by course or title..."
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}
