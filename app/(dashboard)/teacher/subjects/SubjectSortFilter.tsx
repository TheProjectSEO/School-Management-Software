'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const sortOptions = [
  { label: 'Name (A-Z)', value: 'name-asc' },
  { label: 'Name (Z-A)', value: 'name-desc' },
  { label: 'Most Students', value: 'students-desc' },
  { label: 'Most Modules', value: 'modules-desc' },
];

const filterOptions = [
  { label: 'All Grades', value: 'all' },
  { label: 'Grade 7', value: '7' },
  { label: 'Grade 8', value: '8' },
  { label: 'Grade 9', value: '9' },
  { label: 'Grade 10', value: '10' },
  { label: 'Grade 11', value: '11' },
  { label: 'Grade 12', value: '12' },
];

export function SubjectSortFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const currentSort = searchParams.get('sort') || 'name-asc';
  const currentGrade = searchParams.get('grade') || 'all';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSort(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all' && value !== 'name-asc') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.push(`/teacher/subjects${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Sort Dropdown */}
      <div className="relative" ref={sortRef}>
        <button
          onClick={() => { setShowSort(!showSort); setShowFilter(false); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-lg">sort</span>
          Sort
        </button>
        {showSort && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 py-1">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { updateParam('sort', opt.value); setShowSort(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  currentSort === opt.value
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Dropdown */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => { setShowFilter(!showFilter); setShowSort(false); }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold transition-colors ${
            currentGrade !== 'all'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-lg">filter_list</span>
          Filter{currentGrade !== 'all' ? `: Grade ${currentGrade}` : ''}
        </button>
        {showFilter && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 py-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { updateParam('grade', opt.value); setShowFilter(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  currentGrade === opt.value || (!currentGrade && opt.value === 'all')
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
