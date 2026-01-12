"use client";

import { useState } from "react";
import Link from "next/link";
import { BulkImportWizard } from "@/components/ui";

type ImportType = "students" | "teachers" | null;

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>(null);

  const studentFields = [
    { key: "full_name", label: "Full Name", required: true },
    { key: "email", label: "Email", required: true },
    { key: "lrn", label: "LRN (Learner Reference Number)", required: false },
    { key: "grade_level", label: "Grade Level", required: true },
    { key: "section", label: "Section", required: false },
    { key: "phone", label: "Phone Number", required: false },
    { key: "birth_date", label: "Birth Date", required: false },
    { key: "gender", label: "Gender", required: false },
    { key: "address", label: "Address", required: false },
    { key: "guardian_name", label: "Guardian Name", required: false },
    { key: "guardian_phone", label: "Guardian Phone", required: false },
  ];

  const teacherFields = [
    { key: "full_name", label: "Full Name", required: true },
    { key: "email", label: "Email", required: true },
    { key: "employee_id", label: "Employee ID", required: true },
    { key: "department", label: "Department", required: false },
    { key: "specialization", label: "Specialization", required: false },
    { key: "phone", label: "Phone Number", required: false },
    { key: "hire_date", label: "Hire Date", required: false },
  ];

  const handleStudentImport = async (data: Record<string, string>[]): Promise<ImportResult> => {
    const response = await fetch("/api/admin/users/students/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: data }),
    });

    if (!response.ok) {
      throw new Error("Import failed");
    }

    return response.json();
  };

  const handleTeacherImport = async (data: Record<string, string>[]): Promise<ImportResult> => {
    const response = await fetch("/api/admin/users/teachers/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teachers: data }),
    });

    if (!response.ok) {
      throw new Error("Import failed");
    }

    return response.json();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/users/students"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-500">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Users</h1>
          <p className="text-gray-500 mt-1">Bulk import students or teachers from CSV files</p>
        </div>
      </div>

      {/* Import Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Students Import Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-blue-600">school</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Students</h2>
              <p className="text-sm text-gray-500">Upload a CSV file with student data</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Import multiple students at once. The CSV should include full name, email, grade level,
            and optionally LRN, section, and contact information.
          </p>
          <div className="flex items-center justify-between">
            <a
              href="/templates/students-template.csv"
              download
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Download Template
            </a>
            <button
              onClick={() => setImportType("students")}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Start Import
            </button>
          </div>
        </div>

        {/* Teachers Import Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-green-600">person</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Teachers</h2>
              <p className="text-sm text-gray-500">Upload a CSV file with teacher data</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Import multiple teachers at once. The CSV should include full name, email, employee ID,
            and optionally department and specialization.
          </p>
          <div className="flex items-center justify-between">
            <a
              href="/templates/teachers-template.csv"
              download
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Download Template
            </a>
            <button
              onClick={() => setImportType("teachers")}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Start Import
            </button>
          </div>
        </div>
      </div>

      {/* Import Guidelines */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">File Requirements</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                CSV format (.csv files only)
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                First row must contain column headers
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                UTF-8 encoding for special characters
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                Maximum 1,000 records per import
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Best Practices</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-500 text-lg">lightbulb</span>
                Download and use the provided templates
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-500 text-lg">lightbulb</span>
                Verify email addresses are unique
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-500 text-lg">lightbulb</span>
                Use consistent date formats (YYYY-MM-DD)
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-500 text-lg">lightbulb</span>
                Preview data before confirming import
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Imports */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Imports</h3>
        <div className="text-center py-8 text-gray-500">
          <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
            history
          </span>
          <p className="text-sm">No recent imports</p>
        </div>
      </div>

      {/* Import Wizard Modals */}
      {importType === "students" && (
        <BulkImportWizard
          title="Import Students"
          requiredFields={studentFields}
          templateUrl="/templates/students-template.csv"
          onImport={handleStudentImport}
          onClose={() => setImportType(null)}
        />
      )}

      {importType === "teachers" && (
        <BulkImportWizard
          title="Import Teachers"
          requiredFields={teacherFields}
          templateUrl="/templates/teachers-template.csv"
          onImport={handleTeacherImport}
          onClose={() => setImportType(null)}
        />
      )}
    </div>
  );
}
