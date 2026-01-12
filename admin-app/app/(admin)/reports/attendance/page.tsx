"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, FilterBar, ChartCard, ExportButton, StatCard } from "@/components/ui";
import type { FilterOption } from "@/components/ui/FilterBar";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
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
} from "recharts";

interface AttendanceRecord {
  id: string;
  date: string;
  section_name: string;
  grade_level: string;
  course_name: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_rate: number;
}

interface AttendanceSummary {
  totalRecords: number;
  averageRate: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  trendData: { date: string; rate: number; present: number; absent: number }[];
  bySection: { name: string; rate: number; total: number }[];
}

interface PaginatedResult {
  data: AttendanceRecord[];
  summary: AttendanceSummary;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type GroupBy = "section" | "grade_level" | "course" | "date";

export default function AttendanceReportPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    dateFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    dateTo: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    gradeLevel: "",
    sectionId: "",
    courseId: "",
  });

  const [groupBy, setGroupBy] = useState<GroupBy>("section");

  const fetchAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        groupBy,
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.gradeLevel) params.set("gradeLevel", filters.gradeLevel);
      if (filters.sectionId) params.set("sectionId", filters.sectionId);
      if (filters.courseId) params.set("courseId", filters.courseId);

      const response = await fetch(`/api/admin/reports/attendance?${params}`);
      const result: PaginatedResult = await response.json();

      setRecords(result.data);
      setSummary(result.summary);
      setPagination((prev) => ({
        ...prev,
        total: result.total,
        totalPages: result.totalPages,
      }));
    } catch (error) {
      console.error("Failed to fetch attendance data:", error);
      // Set mock data for demo
      setMockData();
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters, groupBy]);

  const setMockData = () => {
    const mockRecords: AttendanceRecord[] = [
      { id: "1", date: "2024-01-15", section_name: "Section A", grade_level: "10", course_name: "Mathematics", total_students: 35, present: 32, absent: 2, late: 1, excused: 0, attendance_rate: 91.4 },
      { id: "2", date: "2024-01-15", section_name: "Section B", grade_level: "10", course_name: "Mathematics", total_students: 38, present: 36, absent: 1, late: 1, excused: 0, attendance_rate: 94.7 },
      { id: "3", date: "2024-01-15", section_name: "Section A", grade_level: "9", course_name: "Science", total_students: 32, present: 30, absent: 1, late: 0, excused: 1, attendance_rate: 93.8 },
      { id: "4", date: "2024-01-16", section_name: "Section A", grade_level: "10", course_name: "English", total_students: 35, present: 33, absent: 1, late: 1, excused: 0, attendance_rate: 94.3 },
      { id: "5", date: "2024-01-16", section_name: "Section C", grade_level: "11", course_name: "Filipino", total_students: 40, present: 38, absent: 2, late: 0, excused: 0, attendance_rate: 95.0 },
    ];

    const mockSummary: AttendanceSummary = {
      totalRecords: 5,
      averageRate: 93.8,
      totalPresent: 169,
      totalAbsent: 7,
      totalLate: 3,
      totalExcused: 1,
      trendData: [
        { date: "Jan 10", rate: 92.5, present: 850, absent: 65 },
        { date: "Jan 11", rate: 94.2, present: 875, absent: 54 },
        { date: "Jan 12", rate: 93.1, present: 860, absent: 64 },
        { date: "Jan 13", rate: 91.8, present: 840, absent: 75 },
        { date: "Jan 14", rate: 95.2, present: 890, absent: 45 },
        { date: "Jan 15", rate: 94.7, present: 880, absent: 50 },
        { date: "Jan 16", rate: 93.5, present: 865, absent: 60 },
      ],
      bySection: [
        { name: "Grade 10-A", rate: 94.5, total: 35 },
        { name: "Grade 10-B", rate: 93.2, total: 38 },
        { name: "Grade 9-A", rate: 95.1, total: 32 },
        { name: "Grade 11-C", rate: 92.8, total: 40 },
        { name: "Grade 9-B", rate: 94.0, total: 36 },
      ],
    };

    setRecords(mockRecords);
    setSummary(mockSummary);
    setPagination((prev) => ({ ...prev, total: 5, totalPages: 1 }));
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

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
      dateFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      dateTo: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      gradeLevel: "",
      sectionId: "",
      courseId: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleExport = async (exportFormat: "csv" | "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.gradeLevel) params.set("gradeLevel", filters.gradeLevel);
    params.set("groupBy", groupBy);
    params.set("format", exportFormat);

    const response = await fetch(`/api/admin/reports/attendance/export?${params}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.${exportFormat === "excel" ? "xlsx" : exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const setQuickDateRange = (range: "today" | "week" | "month" | "quarter") => {
    const today = new Date();
    let from: Date;
    let to: Date = today;

    switch (range) {
      case "today":
        from = today;
        break;
      case "week":
        from = subDays(today, 7);
        break;
      case "month":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "quarter":
        from = subDays(today, 90);
        break;
    }

    setFilters((prev) => ({
      ...prev,
      dateFrom: format(from, "yyyy-MM-dd"),
      dateTo: format(to, "yyyy-MM-dd"),
    }));
  };

  const filterOptions: FilterOption[] = [
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

  const columns: ColumnDef<AttendanceRecord>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm">{format(new Date(row.original.date), "MMM d, yyyy")}</span>
      ),
    },
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
      accessorKey: "course_name",
      header: "Course",
    },
    {
      accessorKey: "total_students",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.total_students}</span>
      ),
    },
    {
      accessorKey: "present",
      header: "Present",
      cell: ({ row }) => (
        <span className="text-green-600 font-medium">{row.original.present}</span>
      ),
    },
    {
      accessorKey: "absent",
      header: "Absent",
      cell: ({ row }) => (
        <span className="text-red-600 font-medium">{row.original.absent}</span>
      ),
    },
    {
      accessorKey: "late",
      header: "Late",
      cell: ({ row }) => (
        <span className="text-orange-600 font-medium">{row.original.late}</span>
      ),
    },
    {
      accessorKey: "attendance_rate",
      header: "Rate",
      cell: ({ row }) => {
        const rate = row.original.attendance_rate;
        const color = rate >= 95 ? "text-green-600" : rate >= 90 ? "text-yellow-600" : "text-red-600";
        return <span className={`font-semibold ${color}`}>{rate.toFixed(1)}%</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
          <p className="text-gray-500 mt-1">View and analyze attendance data across sections and courses</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Average Attendance Rate"
            value={`${summary.averageRate.toFixed(1)}%`}
            icon="percent"
            color="bg-primary"
          />
          <StatCard
            label="Total Present"
            value={summary.totalPresent.toLocaleString()}
            icon="check_circle"
            color="bg-green-500"
          />
          <StatCard
            label="Total Absent"
            value={summary.totalAbsent.toLocaleString()}
            icon="cancel"
            color="bg-red-500"
          />
          <StatCard
            label="Total Late"
            value={summary.totalLate.toLocaleString()}
            icon="schedule"
            color="bg-orange-500"
          />
        </div>
      )}

      {/* Charts */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trend */}
          <ChartCard title="Attendance Trend" subtitle="Daily attendance rate over time">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={summary.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis domain={[85, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#7B1113"
                  fill="#7B1113"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Attendance Rate (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Attendance by Section */}
          <ChartCard title="Attendance by Section" subtitle="Comparison across sections">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.bySection} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[85, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="rate" fill="#7B1113" name="Attendance Rate (%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Date Range & Group By Controls */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Quick Date Ranges */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Quick Range:</span>
            <div className="flex gap-1">
              {[
                { key: "today", label: "Today" },
                { key: "week", label: "Week" },
                { key: "month", label: "Month" },
                { key: "quarter", label: "Quarter" },
              ].map((range) => (
                <button
                  key={range.key}
                  onClick={() => setQuickDateRange(range.key as "today" | "week" | "month" | "quarter")}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Group By */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-gray-700">Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="section">Section</option>
              <option value="grade_level">Grade Level</option>
              <option value="course">Course</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>
      </div>

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
        emptyMessage="No attendance records found"
        emptyIcon="event_busy"
        rowKey="id"
      />
    </div>
  );
}
