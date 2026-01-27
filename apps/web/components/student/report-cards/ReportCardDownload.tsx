"use client";

import { useState } from "react";
import type { ReportCard } from "@/lib/types/report-card";

interface ReportCardDownloadProps {
  reportCard: ReportCard;
  className?: string;
}

/**
 * Report Card Download Component
 *
 * Provides download and share options for a report card:
 * - Direct PDF download
 * - Share via native share API
 * - Copy link to clipboard
 */
export function ReportCardDownload({
  reportCard,
  className = "",
}: ReportCardDownloadProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const { pdf_url, grading_period } = reportCard;
  const reportCardName = `Report Card - ${grading_period?.name || "Unknown Period"}`;

  // Handle direct PDF download
  const handleDownload = async () => {
    if (!pdf_url) {
      alert("PDF is not available for this report card.");
      return;
    }

    try {
      // Open PDF in new tab for download
      window.open(pdf_url, "_blank");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  // Handle share via native share API
  const handleShare = async () => {
    if (!navigator.share) {
      // Fallback to copy link
      await handleCopyLink();
      return;
    }

    setIsSharing(true);

    try {
      await navigator.share({
        title: reportCardName,
        text: `${reportCard.student_info.full_name}'s Report Card for ${grading_period?.name || "the grading period"}`,
        url: pdf_url || window.location.href,
      });
    } catch (error) {
      // User cancelled share or error occurred
      if ((error as Error).name !== "AbortError") {
        console.error("Error sharing:", error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Handle copy link to clipboard
  const handleCopyLink = async () => {
    const linkToCopy = pdf_url || window.location.href;

    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying link:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = linkToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle print
  const handlePrint = () => {
    if (pdf_url) {
      // Open PDF in new window and print
      const printWindow = window.open(pdf_url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      // Print current page
      window.print();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Actions */}
      <div className="flex items-center gap-2">
        {/* Download Button */}
        {pdf_url && (
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-[#5a0c0e] transition-colors shadow-sm"
            title="Download PDF"
          >
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        )}

        {/* More Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="More options"
          >
            <span className="material-symbols-outlined text-[20px]">
              more_vert
            </span>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a2634] rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-20 py-2">
                {/* Share */}
                <button
                  onClick={() => {
                    handleShare();
                    setShowDropdown(false);
                  }}
                  disabled={isSharing}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">
                    share
                  </span>
                  <span className="text-sm font-medium">
                    {isSharing ? "Sharing..." : "Share"}
                  </span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={() => {
                    handleCopyLink();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">
                    {copied ? "check_circle" : "link"}
                  </span>
                  <span className="text-sm font-medium">
                    {copied ? "Copied!" : "Copy Link"}
                  </span>
                </button>

                {/* Print */}
                <button
                  onClick={() => {
                    handlePrint();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">
                    print
                  </span>
                  <span className="text-sm font-medium">Print</span>
                </button>

                {/* Divider */}
                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                {/* View Full Report */}
                <a
                  href={`/report-cards/${reportCard.id}`}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">
                    open_in_full
                  </span>
                  <span className="text-sm font-medium">View Full Report</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Copy Success Toast */}
      {copied && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg shadow-lg z-30 animate-fade-in">
          Link copied!
        </div>
      )}
    </div>
  );
}

/**
 * Compact download button for use in lists
 */
export function ReportCardDownloadButton({
  pdfUrl,
  className = "",
}: {
  pdfUrl?: string;
  className?: string;
}) {
  if (!pdfUrl) return null;

  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-[#5a0c0e] transition-colors ${className}`}
    >
      <span className="material-symbols-outlined text-[18px]">download</span>
      Download PDF
    </a>
  );
}

export default ReportCardDownload;
