"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, FilterBar, ChartCard, ExportButton, StatCard } from "@/components/ui";
import type { FilterOption } from "@/components/ui/FilterBar";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Line,
} from "recharts";

interface ProgressRecord {
  id: string;
  section_name: string;
  grade_level: string;
  total_students: number;
  active_enrollments: number;
  completed_courses: number;
  avg_grade: number;
  avg_attendance: number;
  at_risk_count: number;
  honor_roll_count: number;
}

interface ProgressSummary {
  totalStudents: number;
  totalEnrollments: number;
  completionRate: number;
  atRiskRate: number;
  enrollmentTrend: { month: string; enrollments: number; completions: number }[];
  byGradeLevel: { grade: string; students: number; avgGrade: number; atRisk: number }[];
  performanceDistribution: { category: string; count: number; percentage: number }[];
}

interface PaginatedResult {
  data: ProgressRecord[];
  summary: ProgressSummary;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ProgressReportPage() {
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    gradeLevel: "",
    academicYear: "2024-2025",
    semester: "",
  });

  const fetchProgressData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.gradeLevel) params.set("gradeLevel", filters.gradeLevel);
      if (filters.academicYear) params.set("academicYear", filters.academicYear);
      if (filters.semester) params.set("semester", filters.semester);

      const response = await fetch(`/api/admin/reports/progress?${params}`);
      const result: PaginatedResult = await response.json();

      setRecords(result.data);
      setSummary(result.summary);
      setPagination((prev) => ({
        ...prev,
        total: result.total,
        totalPages: result.totalPages,
      }));
    } catch (error) {
      console.error("Failed to fetch progress data:", error);
      // Set mock data for demo
      setMockData();
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  const setMockData = () => {
    const mockRecords: ProgressRecord[] = [
      { id: "1", section_name: "Section A", grade_level: "10", total_students: 35, active_enrollments: 245, completed_courses: 12, avg_grade: 84.5, avg_attendance: 94.2, at_risk_count: 3, honor_roll_count: 8 },
      { id: "2", section_name: "Section B", grade_level: "10", total_students: 38, active_enrollments: 266, completed_courses: 14, avg_grade: 82.1, avg_attendance: 92.8, at_risk_count: 5, honor_roll_count: 6 },
      { id: "3", section_name: "Section A", grade_level: "9", total_students: 32, active_enrollments: 224, completed_courses: 10, avg_grade: 85.3, avg_attendance: 95.1, at_risk_count: 2, honor_roll_count: 9 },
      { id: "4", section_name: "Section C", grade_level: "11", total_students: 40, active_enrollments: 280, completed_courses: 16, avg_grade: 81.8, avg_attendance: 91.5, at_risk_count: 6, honor_roll_count: 5 },
      { id: "5", section_name: "Section A", grade_level: "12", total_students: 36, active_enrollments: 252, completed_courses: 18, avg_grade: 86.2, avg_attendance: 96.3, at_risk_count: 1, honor_roll_count: 12 },
    ];

    const mockSummary: ProgressSummary = {
      totalStudents: 1250,
      totalEnrollments: 8750,
      completionRate: 87.5,
      atRiskRate: 8.2,
      enrollmentTrend: [
        { month: "Aug", enrollments: 1200, completions: 0 },
        { month: "Sep", enrollments: 1250, completions: 120 },
        { month: "Oct", enrollments: 1248, completions: 580 },
        { month: "Nov", enrollments: 1245, completions: 1050 },
        { month: "Dec", enrollments: 1240, completions: 1480 },
        { month: "Jan", enrollments: 1250, completions: 2100 },
      ],
      byGradeLevel: [
        { grade: "Grade 7", students: 185, avgGrade: 83.2, atRisk: 15 },
        { grade: "Grade 8", students: 192, avgGrade: 82.5, atRisk: 18 },
        { grade: "Grade 9", students: 210, avgGrade: 84.1, atRisk: 12 },
        { grade: "Grade 10", students: 225, avgGrade: 83.8, atRisk: 20 },
        { grade: "Grade 11", students: 218, avgGrade: 82.9, atRisk: 22 },
        { grade: "Grade 12", students: 220, avgGrade: 85.5, atRisk: 15 },
      ],
      performanceDistribution: [
        { category: "Honor Roll", count: 312, percentage: 25 },
        { category: "Good Standing", count: 688, percentage: 55 },
        { category: "Needs Improvement", count: 148, percentage: 12 },
        { category: "At Risk", count: 102, percentage: 8 },
      ],
    };

    setRecords(mockRecords);
    setSummary(mockSummary);
    setPagination((prev) => ({ ...prev, total: 5, totalPages: 1 }));
  };

  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleReset = () => {
    setFilters({
      search: "",
      gradeLevel: "",
      academicYear: "2024-2025",
      semester: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleExport = async (exportFormat: "csv" | "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (filters.gradeLevel) params.set("gradeLevel", filters.gradeLevel);
    if (filters.academicYear) params.set("academicYear", filters.academicYear);
    params.set("format", exportFormat);

    const response = await fetch(`/api/admin/reports/progress/export?${params}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progress-report-${filters.academicYear}.${exportFormat === "excel" ? "xlsx" : exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filterOptions: FilterOption[] = [
    {
      key: "academicYear",
      label: "Academic Year",
      type: "select",
      placeholder: "Select Year",
      options: [
        { value: "2024-2025", label: "2024-2025" },
        { value: "2023-2024", label: "2023-2024" },
        { value: "2022-2023", label: "2022-2023" },
      ],
    },
    {
      key: "semester",
      label: "Semester",
      type: "select",
      placeholder: "All Semesters",
      options: [
        { value: "1", label: "First Semester" },
        { value: "2", label: "Second Semester" },
      ],
    },
    {
      key: "gradeLevel",
      label: "Grade Level",
      type: "select",
      placeholder: "All Grades",
      options: [
        { value: "7", label: "Grade 7" },
        { value: "8", label: "Grade 8" },
        { value: "9", label: "Grade 9" },
        { value: "10", label: "Grade 10" },
        { value: "11", label: "Grade 11" },
        { value: "12", label: "Grade 12" },
      ],
    },
  ];

  const columns: ColumnDef<ProgressRecord>[] = [
    {
      accessorKey: "section_name",
      header: "Section",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.section_name}</p>
          <p className="text-xs text-gray-500">Grade {row.original.grade_level}</p>
        </div>
      ),
    },
    {
      accessorKey: "total_students",
      header: "Students",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.total_students}</span>
      ),
    },
    {
      accessorKey: "active_enrollments",
      header: "Enrollments",
      cell: ({ row }) => (
        <span className="text-blue-600 font-medium">{row.original.active_enrollments}</span>
      ),
    },
    {
      accessorKey: "avg_grade",
      header: "Avg. Grade",
      cell: ({ row }) => {
        const grade = row.original.avg_grade;
        const color = grade >= 85 ? "text-green-600" : grade >= 75 ? "text-yellow-600" : "text-red-600";
        return <span className={`font-semibold ${color}`}>{grade.toFixed(1)}%</span>;
      },
    },
    {
      accessorKey: "avg_attendance",
      header: "Avg. Attendance",
      cell: ({ row }) => {
        const rate = row.original.avg_attendance;
        const color = rate >= 95 ? "text-green-600" : rate >= 90 ? "text-yellow-600" : "text-red-600";
        return <span className={`font-semibold ${color}`}>{rate.toFixed(1)}%</span>;
      },
    },
    {
      accessorKey: "at_risk_count",
      header: "At Risk",
      cell: ({ row }) => (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
          {row.original.at_risk_count} students
        </span>
      ),
    },
    {
      accessorKey: "honor_roll_count",
      header: "Honor Roll",
      cell: ({ row }) => (
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
          {row.original.honor_roll_count} students
        </span>
      ),
    },
  ];

  const performanceColors = {
    "Honor Roll": "#22c55e",
    "Good Standing": "#3b82f6",
    "Needs Improvement": "#eab308",
    "At Risk": "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Report</h1>
          <p className="text-gray-500 mt-1">Track enrollment trends and academic progress</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Students"
            value={summary.totalStudents.toLocaleString()}
            icon="groups"
            color="bg-primary"
          />
          <StatCard
            label="Total Enrollments"
            value={summary.totalEnrollments.toLocaleString()}
            icon="assignment_ind"
            color="bg-blue-500"
          />
          <StatCard
            label="Completion Rate"
            value={`${summary.completionRate.toFixed(1)}%`}
            icon="task_alt"
            color="bg-green-500"
          />
          <StatCard
            label="At-Risk Rate"
            value={`${summary.atRiskRate.toFixed(1)}%`}
            icon="warning"
            color="bg-red-500"
          />
        </div>
      )}

      {/* Charts Row 1 */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enrollment Trend */}
          <ChartCard title="Enrollment & Completion Trend" subtitle="Monthly progression through the academic year">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={summary.enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
                <Area
                  type="monotone"
                  dataKey="enrollments"
                  fill="#7B1113"
                  fillOpacity={0.1}
                  stroke="#7B1113"
                  strokeWidth={2}
                  name="Active Enrollments"
                />
                <Line
                  type="monotone"
                  dataKey="completions"
                  stroke="#FDB913"
                  strokeWidth={3}
                  dot={{ fill: "#FDB913", strokeWidth: 2 }}
                  name="Course Completions"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Performance Distribution */}
          <ChartCard title="Student Performance Distribution" subtitle="Categorized by academic standing">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.performanceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    const percentage = props?.payload?.percentage || 0
                    return [`${value} students (${percentage}%)`, "Count"]
                  }}
                />
                <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                  {summary.performanceDistribution.map((entry, index) => (
                    <Bar
                      key={`bar-${index}`}
                      dataKey="count"
                      fill={performanceColors[entry.category as keyof typeof performanceColors]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Custom Legend */}
            <div className="flex justify-center gap-4 mt-2">
              {summary.performanceDistribution.map((item) => (
                <div key={item.category} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: performanceColors[item.category as keyof typeof performanceColors] }}
                  />
                  <span className="text-xs text-gray-600">{item.category}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {/* Grade Level Analysis */}
      {summary && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Grade Level</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Grade Level</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Students</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Avg. Grade</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">At Risk</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summary.byGradeLevel.map((grade) => (
                  <tr key={grade.grade}>
                    <td className="py-3 px-4 font-medium text-gray-900">{grade.grade}</td>
                    <td className="py-3 px-4 text-center text-gray-600">{grade.students}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-semibold ${
                          grade.avgGrade >= 85 ? "text-green-600" : grade.avgGrade >= 75 ? "text-yellow-600" : "text-red-600"
                        }`}
                      >
                        {grade.avgGrade.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        {grade.atRisk}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${grade.avgGrade}%`,
                              backgroundColor: grade.avgGrade >= 85 ? "#22c55e" : grade.avgGrade >= 75 ? "#eab308" : "#ef4444",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Insights */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white">emoji_events</span>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Honor Roll Students</p>
                <p className="text-2xl font-bold text-green-900">312</p>
              </div>
            </div>
            <p className="text-sm text-green-700">25% of total student population</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white">trending_up</span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800">Average GPA</p>
                <p className="text-2xl font-bold text-blue-900">3.42</p>
              </div>
            </div>
            <p className="text-sm text-blue-700">Up 0.15 from last semester</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white">priority_high</span>
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">At-Risk Students</p>
                <p className="text-2xl font-bold text-red-900">102</p>
              </div>
            </div>
            <p className="text-sm text-red-700">Requires immediate intervention</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        filters={filterOptions}
        values={filters}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={records}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        loading={loading}
        emptyMessage="No progress records found"
        emptyIcon="trending_up"
        rowKey="id"
      />
    </div>
  );
}
