"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Section {
  id: string;
  name: string;
  grade_level: string;
}

interface GradingPeriod {
  id: string;
  name: string;
  academic_year: string;
  is_current: boolean;
}

interface ReportCardFiltersProps {
  sections: Section[];
  gradingPeriods: GradingPeriod[];
  selectedSectionId: string;
  selectedPeriodId: string;
}

export function ReportCardFilters({
  sections,
  gradingPeriods,
  selectedSectionId,
  selectedPeriodId,
}: ReportCardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSectionChange = (sectionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", sectionId);
    router.push(`?${params.toString()}`);
  };

  const handlePeriodChange = (periodId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", periodId);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      {/* Section Filter */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          Section
        </label>
        <select
          value={selectedSectionId}
          onChange={(e) => handleSectionChange(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name} ({section.grade_level})
            </option>
          ))}
        </select>
      </div>

      {/* Grading Period Filter */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          Grading Period
        </label>
        <select
          value={selectedPeriodId}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {gradingPeriods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name} ({period.academic_year})
              {period.is_current ? " - Current" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ReportCardFilters;
