import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getTeacherProfile } from "@/lib/dal/teacher";
import { getReportCard } from "@/lib/dal/report-cards";
import { ReportCardDetail } from "@/components/report-cards";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Metadata } from "next";

interface ReportCardDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ReportCardDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const reportCard = await getReportCard(id);

  if (!reportCard) {
    return { title: "Report Card Not Found | MSU Teacher Portal" };
  }

  return {
    title: `${reportCard.student_info.full_name} - ${reportCard.grading_period?.name || "Report Card"} | MSU Teacher Portal`,
    description: `View report card for ${reportCard.student_info.full_name}`,
  };
}

async function ReportCardContent({ id }: { id: string }) {
  const teacherProfile = await getTeacherProfile();

  if (!teacherProfile) {
    redirect("/login");
  }

  const reportCard = await getReportCard(id);

  if (!reportCard) {
    notFound();
  }

  // Check if teacher can edit (only drafts)
  const canEdit = reportCard.status === "draft";

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link
          href="/teacher/report-cards"
          className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-msu-gold"
        >
          Report Cards
        </Link>
        <span className="material-symbols-outlined text-slate-400 text-[16px]">
          chevron_right
        </span>
        <span className="text-slate-900 dark:text-white font-medium truncate max-w-[200px]">
          {reportCard.student_info.full_name}
        </span>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Link
          href="/teacher/report-cards"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Back to List
        </Link>

        <div className="flex items-center gap-2">
          {reportCard.pdf_url && (
            <a
              href={`/api/teacher/report-cards/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                download
              </span>
              Download PDF
            </a>
          )}
          {canEdit && (
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-[#5a0c0e] transition-colors">
              <span className="material-symbols-outlined text-[18px]">
                send
              </span>
              Submit for Review
            </button>
          )}
        </div>
      </div>

      {/* Report Card Detail */}
      <ReportCardDetail
        reportCard={reportCard}
        canEdit={canEdit}
        onAddRemarks={async (remarks, subject) => {
          "use server";
          // This would call the API to add remarks
          console.log("Adding remarks:", { remarks, subject });
        }}
      />
    </>
  );
}

export default async function ReportCardDetailPage({
  params,
}: ReportCardDetailPageProps) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <ReportCardContent id={id} />
    </Suspense>
  );
}
