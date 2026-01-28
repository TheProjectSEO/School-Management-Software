"use client";

import { useState, useCallback } from "react";
import { clsx } from "clsx";

export interface FilterOption {
  key: string;
  label: string;
  type: "select" | "date" | "daterange" | "search";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterOption[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset?: () => void;
  onSearch?: (query: string) => void;
  className?: string;
}

export default function FilterBar({
  filters,
  values,
  onChange,
  onReset,
  onSearch,
  className = "",
}: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(() => {
    onSearch?.(searchQuery);
  }, [onSearch, searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div
      className={clsx(
        "bg-white rounded-xl p-4 shadow-sm border border-gray-100",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        {onSearch && (
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                search
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        )}

        {/* Filter Options */}
        {filters.map((filter) => (
          <div key={filter.key} className="min-w-[140px]">
            {filter.type === "select" && (
              <select
                value={values[filter.key] || ""}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">{filter.placeholder || filter.label}</option>
                {filter.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            {filter.type === "date" && (
              <input
                type="date"
                value={values[filter.key] || ""}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            )}
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onSearch && (
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Search
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
