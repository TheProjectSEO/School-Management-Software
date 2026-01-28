"use client";

import { useState, useCallback, useRef } from "react";
import { clsx } from "clsx";
import Papa from "papaparse";

interface ColumnMapping {
  csvColumn: string;
  dbField: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

interface BulkImportWizardProps {
  title: string;
  requiredFields: { key: string; label: string; required: boolean }[];
  templateUrl?: string;
  onImport: (data: Record<string, string>[]) => Promise<ImportResult>;
  onClose: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";

export default function BulkImportWizard({
  title,
  requiredFields,
  templateUrl,
  onImport,
  onClose,
}: BulkImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      if (!selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file");
        return;
      }

      setFile(selectedFile);
      setError(null);

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing error: ${results.errors[0].message}`);
            return;
          }

          const headers = Object.keys(results.data[0] as object);
          setCsvHeaders(headers);
          setCsvData(results.data as Record<string, string>[]);

          // Auto-map columns
          const autoMapping: ColumnMapping[] = requiredFields.map((field) => {
            const matchedHeader = headers.find(
              (h) =>
                h.toLowerCase().replace(/[_\s]/g, "") ===
                field.key.toLowerCase().replace(/[_\s]/g, "")
            );
            return {
              csvColumn: matchedHeader || "",
              dbField: field.key,
            };
          });
          setMapping(autoMapping);
          setStep("mapping");
        },
        error: (err) => {
          setError(`Failed to parse CSV: ${err.message}`);
        },
      });
    },
    [requiredFields]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        const input = fileInputRef.current;
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(droppedFile);
          input.files = dataTransfer.files;
          handleFileSelect({
            target: input,
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    },
    [handleFileSelect]
  );

  const updateMapping = (dbField: string, csvColumn: string) => {
    setMapping((prev) =>
      prev.map((m) => (m.dbField === dbField ? { ...m, csvColumn } : m))
    );
  };

  const validateMapping = () => {
    const missingRequired = requiredFields
      .filter((f) => f.required)
      .filter((f) => !mapping.find((m) => m.dbField === f.key && m.csvColumn));

    if (missingRequired.length > 0) {
      setError(
        `Missing required fields: ${missingRequired
          .map((f) => f.label)
          .join(", ")}`
      );
      return false;
    }

    setError(null);
    return true;
  };

  const handlePreview = () => {
    if (validateMapping()) {
      setStep("preview");
    }
  };

  const getMappedData = (): Record<string, string>[] => {
    return csvData.map((row) => {
      const mappedRow: Record<string, string> = {};
      mapping.forEach((m) => {
        if (m.csvColumn) {
          mappedRow[m.dbField] = row[m.csvColumn] || "";
        }
      });
      return mappedRow;
    });
  };

  const handleImport = async () => {
    setStep("importing");
    try {
      const mappedData = getMappedData();
      const importResult = await onImport(mappedData);
      setResult(importResult);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    }
  };

  const steps = [
    { key: "upload", label: "Upload" },
    { key: "mapping", label: "Map Columns" },
    { key: "preview", label: "Preview" },
    { key: "complete", label: "Complete" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-gray-500">
                close
              </span>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      i <= currentStepIndex
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {i < currentStepIndex ? (
                      <span className="material-symbols-outlined text-lg">
                        check
                      </span>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={clsx(
                      "ml-2 text-sm font-medium",
                      i <= currentStepIndex ? "text-gray-900" : "text-gray-400"
                    )}
                  >
                    {s.label}
                  </span>
                  {i < steps.length - 1 && (
                    <div
                      className={clsx(
                        "w-16 h-0.5 mx-4",
                        i < currentStepIndex ? "bg-primary" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            {/* Upload Step */}
            {step === "upload" && (
              <div>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-primary transition-colors"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">
                    upload_file
                  </span>
                  <p className="text-gray-600 mb-2">
                    Drag and drop your CSV file here, or
                  </p>
                  <label className="cursor-pointer">
                    <span className="text-primary font-medium hover:underline">
                      browse to upload
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-4">
                    Only CSV files are supported
                  </p>
                </div>

                {templateUrl && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    <span className="text-gray-500">Need a template?</span>
                    <a
                      href={templateUrl}
                      download
                      className="text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-lg">
                        download
                      </span>
                      Download CSV Template
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Mapping Step */}
            {step === "mapping" && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Map your CSV columns to the required fields. File:{" "}
                  <strong>{file?.name}</strong> ({csvData.length} rows)
                </p>

                <div className="space-y-3">
                  {requiredFields.map((field) => {
                    const currentMapping = mapping.find(
                      (m) => m.dbField === field.key
                    );
                    return (
                      <div
                        key={field.key}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-1/3">
                          <span className="font-medium text-gray-700">
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-gray-400">
                          arrow_forward
                        </span>
                        <select
                          value={currentMapping?.csvColumn || ""}
                          onChange={(e) =>
                            updateMapping(field.key, e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="">Select column...</option>
                          {csvHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview Step */}
            {step === "preview" && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Review the data before importing. Showing first 10 rows of{" "}
                  {csvData.length}.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                          #
                        </th>
                        {requiredFields
                          .filter((f) =>
                            mapping.find((m) => m.dbField === f.key && m.csvColumn)
                          )
                          .map((field) => (
                            <th
                              key={field.key}
                              className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase"
                            >
                              {field.label}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getMappedData()
                        .slice(0, 10)
                        .map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                            {requiredFields
                              .filter((f) =>
                                mapping.find(
                                  (m) => m.dbField === f.key && m.csvColumn
                                )
                              )
                              .map((field) => (
                                <td
                                  key={field.key}
                                  className="px-3 py-2 text-gray-700"
                                >
                                  {row[field.key] || "-"}
                                </td>
                              ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Importing Step */}
            {step === "importing" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">
                  Importing data...
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Please wait while we process {csvData.length} records.
                </p>
              </div>
            )}

            {/* Complete Step */}
            {step === "complete" && result && (
              <div className="text-center py-8">
                <div
                  className={clsx(
                    "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                    result.failed === 0 ? "bg-green-100" : "bg-yellow-100"
                  )}
                >
                  <span
                    className={clsx(
                      "material-symbols-outlined text-3xl",
                      result.failed === 0
                        ? "text-green-600"
                        : "text-yellow-600"
                    )}
                  >
                    {result.failed === 0 ? "check_circle" : "warning"}
                  </span>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Import Complete
                </p>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="text-green-600">
                    <strong>{result.success}</strong> successful
                  </span>
                  {result.failed > 0 && (
                    <span className="text-red-600">
                      <strong>{result.failed}</strong> failed
                    </span>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-6 text-left">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Errors:
                    </p>
                    <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3">
                      {result.errors.slice(0, 20).map((err, i) => (
                        <p key={i} className="text-xs text-red-600 mb-1">
                          Row {err.row}: {err.message}
                        </p>
                      ))}
                      {result.errors.length > 20 && (
                        <p className="text-xs text-gray-500 mt-2">
                          And {result.errors.length - 20} more errors...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => {
                if (step === "mapping") setStep("upload");
                else if (step === "preview") setStep("mapping");
              }}
              disabled={step === "upload" || step === "importing" || step === "complete"}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              {step === "complete" ? (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  {step === "mapping" && (
                    <button
                      onClick={handlePreview}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
                    >
                      Continue
                    </button>
                  )}
                  {step === "preview" && (
                    <button
                      onClick={handleImport}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
                    >
                      Import {csvData.length} Records
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
