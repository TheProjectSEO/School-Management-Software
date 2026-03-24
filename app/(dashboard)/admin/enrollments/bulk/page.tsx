"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Section {
  id: string;
  name: string;
  grade_level: string;
  capacity: number;
  enrolled_count: number;
  course_count: number;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  grade_level: string;
  lrn?: string;
}

type Step = "select-grade" | "select-students" | "review" | "processing" | "complete";

interface EnrollmentResult {
  success: number;
  failed: number;
  errors: { studentId: string; studentName: string; message: string }[];
}

export default function BulkEnrollPage() {
  const [step, setStep] = useState<Step>("select-grade");
  const [loading, setLoading] = useState(false);

  // Grade/Section Selection
  const [gradeLevel, setGradeLevel] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  // Student Selection
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  // Results
  const [result, setResult] = useState<EnrollmentResult | null>(null);

  // Fetch sections when grade is selected
  useEffect(() => {
    if (gradeLevel) {
      fetchSections(gradeLevel);
      setSelectedSection(null);
    } else {
      setSections([]);
      setSelectedSection(null);
    }
  }, [gradeLevel]);

  // Fetch students when moving to student selection
  useEffect(() => {
    if (step === "select-students") {
      fetchStudents();
    }
  }, [step, studentSearch, gradeFilter]);

  const fetchSections = async (grade: string) => {
    try {
      const response = await authFetch(`/api/admin/sections?gradeLevel=${encodeURIComponent(grade)}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setSections(data);
      } else {
        setSections([]);
      }
    } catch (error) {
      console.error("Failed to fetch sections:", error);
      setSections([]);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (studentSearch) params.set("search", studentSearch);
      if (gradeFilter) params.set("gradeLevel", gradeFilter);
      params.set("status", "active");
      params.set("pageSize", "100");

      const response = await authFetch(`/api/admin/users/students?${params}`);
      const data = await response.json();

      if (Array.isArray(data.data)) {
        setStudents(data.data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (student: Student) => {
    setSelectedStudents((prev) => {
      const isSelected = prev.some((s) => s.id === student.id);
      if (isSelected) return prev.filter((s) => s.id !== student.id);
      return [...prev, student];
    });
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents([...students]);
    }
  };

  const handleEnroll = async () => {
    if (!selectedSection) return;

    setStep("processing");
    try {
      const response = await authFetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_enroll",
          sectionId: selectedSection.id,
          studentIds: selectedStudents.map((s) => s.id),
        }),
      });

      const data = await response.json();
      setResult(data);
      setStep("complete");
    } catch (error) {
      console.error("Bulk enrollment failed:", error);
      setResult({
        success: 0,
        failed: selectedStudents.length,
        errors: [{ studentId: "", studentName: "", message: "Enrollment failed. Please try again." }],
      });
      setStep("complete");
    }
  };

  const handleReset = () => {
    setStep("select-grade");
    setGradeLevel("");
    setSelectedSection(null);
    setSelectedStudents([]);
    setResult(null);
    setSections([]);
  };

  const stepProgress = {
    "select-grade": 25,
    "select-students": 50,
    "review": 75,
    "processing": 90,
    "complete": 100,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/enrollments"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-500">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Enrollment</h1>
          <p className="text-gray-500 mt-1">Enroll multiple students in a grade section</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{stepProgress[step]}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${stepProgress[step]}%` }}
          />
        </div>
        <div className="flex justify-between mt-4">
          {[
            { key: "select-grade", label: "Select Grade & Section" },
            { key: "select-students", label: "Select Students" },
            { key: "review", label: "Review" },
            { key: "complete", label: "Complete" },
          ].map((s, i) => (
            <div
              key={s.key}
              className={`flex items-center gap-2 ${
                stepProgress[step] >= (i + 1) * 25 ? "text-primary" : "text-gray-400"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  stepProgress[step] >= (i + 1) * 25
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {stepProgress[step] > (i + 1) * 25 ? (
                  <span className="material-symbols-outlined text-sm">check</span>
                ) : (
                  i + 1
                )}
              </div>
              <span className="text-sm font-medium hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
        {/* Step 1: Select Grade & Section */}
        {step === "select-grade" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Select Grade & Section</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select a grade level...</option>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                <select
                  value={selectedSection?.id || ""}
                  onChange={(e) => {
                    const section = sections.find((s) => s.id === e.target.value);
                    setSelectedSection(section || null);
                  }}
                  disabled={!gradeLevel}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!gradeLevel ? "Select grade first..." : "Select a section..."}
                  </option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.enrolled_count}/{section.capacity || "∞"} enrolled)
                    </option>
                  ))}
                </select>
                {gradeLevel && sections.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">No sections found for Grade {gradeLevel}.</p>
                )}
              </div>
            </div>

            {selectedSection && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600">info</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Section Info</p>
                    <p className="text-sm text-blue-600">
                      {selectedSection.capacity
                        ? `${selectedSection.capacity - selectedSection.enrolled_count} available slot${selectedSection.capacity - selectedSection.enrolled_count !== 1 ? "s" : ""} out of ${selectedSection.capacity}.`
                        : `${selectedSection.enrolled_count} students currently enrolled.`}
                    </p>
                    {selectedSection.course_count > 0 && (
                      <p className="text-sm text-blue-600 mt-0.5">
                        Students will be enrolled in {selectedSection.course_count} subject{selectedSection.course_count !== 1 ? "s" : ""} assigned to this section.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setStep("select-students")}
                disabled={!selectedSection}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Students */}
        {step === "select-students" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Select Students</h2>
              <span className="text-sm text-gray-500">{selectedStudents.length} selected</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Grades</option>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((grade) => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
              <button
                onClick={selectAllStudents}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="border border-gray-100 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading students...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">search_off</span>
                  <p>No students found</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-10 px-4 py-2"></th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Name</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">LRN</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((student) => (
                      <tr
                        key={student.id}
                        onClick={() => toggleStudentSelection(student)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedStudents.some((s) => s.id === student.id)}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium text-gray-900">{student.full_name}</p>
                            <p className="text-xs text-gray-500">{student.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono text-gray-600">{student.lrn || "-"}</td>
                        <td className="px-4 py-2 text-gray-600">Grade {student.grade_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep("select-grade")}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep("review")}
                disabled={selectedStudents.length === 0}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue ({selectedStudents.length} selected)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Review Enrollment</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Grade Level</h3>
                <p className="text-lg font-semibold text-gray-900">Grade {selectedSection?.grade_level}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Section</h3>
                <p className="text-lg font-semibold text-gray-900">{selectedSection?.name}</p>
                {selectedSection?.course_count != null && selectedSection.course_count > 0 && (
                  <p className="text-sm text-gray-600">{selectedSection.course_count} subject{selectedSection.course_count !== 1 ? "s" : ""}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Students to Enroll ({selectedStudents.length})
              </h3>
              <div className="border border-gray-100 rounded-lg max-h-[200px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Name</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Email</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-2 font-medium text-gray-900">{student.full_name}</td>
                        <td className="px-4 py-2 text-gray-600">{student.email}</td>
                        <td className="px-4 py-2 text-gray-600">Grade {student.grade_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-yellow-600">warning</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Confirm Enrollment</p>
                  <p className="text-sm text-yellow-600">
                    You are about to enroll {selectedStudents.length} student{selectedStudents.length !== 1 ? "s" : ""} in{" "}
                    Grade {selectedSection?.grade_level} — {selectedSection?.name}.
                    {selectedSection?.course_count != null && selectedSection.course_count > 0
                      ? ` They will be enrolled in all ${selectedSection.course_count} subjects assigned to this section.`
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep("select-students")}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleEnroll}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
              >
                Confirm Enrollment
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-900">Processing Enrollment...</p>
            <p className="text-sm text-gray-500 mt-2">
              Enrolling {selectedStudents.length} students. Please wait.
            </p>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && result && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  result.failed === 0 ? "bg-green-100" : "bg-yellow-100"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-3xl ${
                    result.failed === 0 ? "text-green-600" : "text-yellow-600"
                  }`}
                >
                  {result.failed === 0 ? "check_circle" : "warning"}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Enrollment Complete</h2>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-green-600">
                  <strong>{result.success}</strong> successfully enrolled
                </span>
                {result.failed > 0 && (
                  <span className="text-red-600">
                    <strong>{result.failed}</strong> failed
                  </span>
                )}
              </div>
            </div>

            {result.errors && Array.isArray(result.errors) && result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800 mb-2">Failed Enrollments</h3>
                <ul className="text-sm text-red-600 space-y-1">
                  {result.errors.map((error, i) => (
                    <li key={i}>
                      {error.studentName}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Enroll More Students
              </button>
              <Link
                href="/admin/enrollments"
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                View Enrollments
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
