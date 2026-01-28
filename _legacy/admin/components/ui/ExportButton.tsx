"use client";

import { useState } from "react";
import { clsx } from "clsx";

type ExportFormat = "csv" | "excel" | "pdf";

interface ExportButtonProps {
  onExport: (format: ExportFormat) => Promise<void>;
  formats?: ExportFormat[];
  disabled?: boolean;
}

export default function ExportButton({
  onExport,
  formats = ["csv", "excel"],
  disabled = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      await onExport(format);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  const formatLabels: Record<ExportFormat, { label: string; icon: string }> = {
    csv: { label: "CSV", icon: "description" },
    excel: { label: "Excel", icon: "table_chart" },
    pdf: { label: "PDF", icon: "picture_as_pdf" },
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          "flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium transition-colors",
          disabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-700 hover:bg-gray-50"
        )}
      >
        <span className="material-symbols-outlined text-lg">download</span>
        Export
        <span className="material-symbols-outlined text-lg">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 min-w-[140px]">
            {formats.map((format) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                disabled={exporting !== null}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {exporting === format ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-lg text-gray-400">
                    {formatLabels[format].icon}
                  </span>
                )}
                {formatLabels[format].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
