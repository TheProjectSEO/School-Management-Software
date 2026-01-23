import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTeacherProfile, getTeacherSubjects } from "@/lib/dal/teacher";
import {
  getSectionReportCardsList,
  countReportCardsByStatus,
  getGradingPeriods,
} from "@/lib/dal/report-cards";
import { ReportCardsList } from "@/components/report-cards";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";

export const metadata = {
  title: "Report Cards | MSU Teacher Portal",
  description: "View and manage student report cards for your sections",
};

interface ReportCardsPageProps {
  searchParams: Promise<{
    section?: string;
    period?: string;
  }>;
}

async function ReportCardsContent({
  searchParams,
}: {
  searchParams: { section?: string; period?: string };
}) {
  const teacherProfile = await getTeacherProfile();

  if (!teacherProfile) {
    redirect("/login");
  }

  // Get teacher's subjects to find sections
  const subjects = await getTeacherSubjects(teacherProfile.id);

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon="school"
        title="No sections assigned"
        description="You don't have any sections assigned yet. Contact your administrator to get course assignments."
      />
    );
  }

  // Get unique sections from subjects
  const sectionsMap = new Map<
    string,
    { id: string; name: string; grade_level: string }
  >();
  subjects.forEach((subject) => {
    if (subject.section_id && !sectionsMap.has(subject.section_id)) {
      sectionsMap.set(subject.section_id, {
        id: subject.section_id,
        name: subject.section_name,
        grade_level: subject.grade_level,
      });
    }
  });
  const sections = Array.from(sectionsMap.values());

  // Get grading periods
  const gradingPeriods = await getGradingPeriods(teacherProfile.school_id);

  // Get selected section or default to first
  const selectedSectionId = searchParams.section || sections[0]?.id;
  const selectedPeriodId =
    searchParams.period || gradingPeriods.find((p) => p.is_current)?.id;

  // Get report cards for selected section
  let reportCards: Awaited<ReturnType<typeof getSectionReportCardsList>> = [];
  if (selectedSectionId) {
    reportCards = await getSectionReportCardsList(
      selectedSectionId,
      selectedPeriodId
    );
  }

  // Get status counts
  const statusCounts = await countReportCardsByStatus(
    teacherProfile.id,
    selectedPeriodId
  );

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">
          Report Cards
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base mt-2">
          View and manage student report cards for your sections.
        </p>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatusCard
          label="Draft"
          count={statusCounts.draft}
          icon="edit_note"
          color="slate"
        />
        <StatusCard
          label="Pending Review"
          count={statusCounts.pending_review}
          icon="hourglass_empty"
          color="amber"
        />
        <StatusCard
          label="Approved"
          count={statusCounts.approved}
          icon="check_circle"
          color="blue"
        />
        <StatusCard
          label="Released"
          count={statusCounts.released}
          icon="visibility"
          color="green"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Section Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Section
          </label>
          <select
            defaultValue={selectedSectionId}
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set("section", e.target.value);
              window.location.href = url.toString();
            }}
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
            defaultValue={selectedPeriodId}
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set("period", e.target.value);
              window.location.href = url.toString();
            }}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2634] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {gradingPeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({period.academic_year})
                {period.is_current && " - Current"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Cards List */}
      <ReportCardsList
        reportCards={reportCards}
        onSubmitForReview={async (ids) => {
          "use server";
          // Server action would go here
          console.log("Submitting for review:", ids);
        }}
      />
    </>
  );
}

function StatusCard({
  label,
  count,
  icon,
  color,
}: {
  label: string;
  count: number;
  icon: string;
  color: "slate" | "amber" | "blue" | "green";
}) {
  const colorClasses = {
    slate: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
    amber:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    green:
      "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[#1a2634] dark:border-slate-700">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {count}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default async function ReportCardsPage(props: ReportCardsPageProps) {
  const searchParams = await props.searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <ReportCardsContent searchParams={searchParams} />
    </Suspense>
  );
}
