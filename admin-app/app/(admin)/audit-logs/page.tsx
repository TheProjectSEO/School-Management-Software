"use client";

import { useState, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable, FilterBar, ExportButton, StatCard } from "@/components/ui";
import type { FilterOption } from "@/components/ui/FilterBar";
import { format, formatDistanceToNow, subDays } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  action_type: "create" | "update" | "delete" | "login" | "logout" | "export" | "import" | "view";
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AuditSummary {
  totalLogs: number;
  todayLogs: number;
  uniqueUsers: number;
  actionBreakdown: { action: string; count: number }[];
}

interface PaginatedResult {
  data: AuditLog[];
  summary: AuditSummary;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ACTION_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  create: { icon: "add_circle", bg: "bg-green-100", color: "text-green-600" },
  update: { icon: "edit", bg: "bg-blue-100", color: "text-blue-600" },
  delete: { icon: "delete", bg: "bg-red-100", color: "text-red-600" },
  login: { icon: "login", bg: "bg-purple-100", color: "text-purple-600" },
  logout: { icon: "logout", bg: "bg-gray-100", color: "text-gray-600" },
  export: { icon: "download", bg: "bg-orange-100", color: "text-orange-600" },
  import: { icon: "upload", bg: "bg-cyan-100", color: "text-cyan-600" },
  view: { icon: "visibility", bg: "bg-yellow-100", color: "text-yellow-600" },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    actionType: "",
    entityType: "",
    userId: "",
    dateFrom: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filters.search) params.set("search", filters.search);
      if (filters.actionType) params.set("actionType", filters.actionType);
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const result: PaginatedResult = await response.json();

      setLogs(result.data);
      setSummary(result.summary);
      setPagination((prev) => ({
        ...prev,
        total: result.total,
        totalPages: result.totalPages,
      }));
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      // Set mock data for demo
      setMockData();
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  const setMockData = () => {
    const mockLogs: AuditLog[] = [
      {
        id: "1",
        action: "Created new student account",
        action_type: "create",
        entity_type: "student",
        entity_id: "stu-001",
        entity_name: "Juan Dela Cruz",
        user_id: "admin-001",
        user_name: "Admin User",
        user_email: "admin@msu.edu.ph",
        user_role: "admin",
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        metadata: { student_email: "juan@msu.edu.ph", grade_level: "10" },
        created_at: new Date().toISOString(),
      },
      {
        id: "2",
        action: "Updated course information",
        action_type: "update",
        entity_type: "course",
        entity_id: "course-math10",
        entity_name: "Mathematics 10",
        user_id: "admin-001",
        user_name: "Admin User",
        user_email: "admin@msu.edu.ph",
        user_role: "admin",
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        metadata: { changes: { description: "Updated course description" } },
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "3",
        action: "User logged in",
        action_type: "login",
        entity_type: "session",
        entity_id: null,
        entity_name: null,
        user_id: "teacher-001",
        user_name: "Maria Santos",
        user_email: "maria.santos@msu.edu.ph",
        user_role: "teacher",
        ip_address: "192.168.1.50",
        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
        metadata: { login_method: "password" },
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "4",
        action: "Exported student data",
        action_type: "export",
        entity_type: "report",
        entity_id: null,
        entity_name: "Students Export",
        user_id: "admin-001",
        user_name: "Admin User",
        user_email: "admin@msu.edu.ph",
        user_role: "admin",
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        metadata: { format: "csv", records: 250 },
        created_at: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: "5",
        action: "Deleted enrollment record",
        action_type: "delete",
        entity_type: "enrollment",
        entity_id: "enr-005",
        entity_name: "Pedro Reyes - Science 10",
        user_id: "admin-002",
        user_name: "Registrar Staff",
        user_email: "registrar@msu.edu.ph",
        user_role: "registrar",
        ip_address: "192.168.1.75",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0",
        metadata: { reason: "Student request", former_section: "Section A" },
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    const mockSummary: AuditSummary = {
      totalLogs: 1250,
      todayLogs: 45,
      uniqueUsers: 12,
      actionBreakdown: [
        { action: "create", count: 320 },
        { action: "update", count: 480 },
        { action: "delete", count: 85 },
        { action: "login", count: 215 },
        { action: "logout", count: 95 },
        { action: "export", count: 35 },
        { action: "view", count: 20 },
      ],
    };

    setLogs(mockLogs);
    setSummary(mockSummary);
    setPagination((prev) => ({ ...prev, total: 5, totalPages: 1 }));
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
      actionType: "",
      entityType: "",
      userId: "",
      dateFrom: format(subDays(new Date(), 7), "yyyy-MM-dd"),
      dateTo: format(new Date(), "yyyy-MM-dd"),
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleExport = async (exportFormat: "csv" | "excel" | "pdf") => {
    const params = new URLSearchParams();
    if (filters.actionType) params.set("actionType", filters.actionType);
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    params.set("format", exportFormat);

    const response = await fetch(`/api/admin/audit-logs/export?${params}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.${exportFormat === "excel" ? "xlsx" : exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const setQuickDateRange = (range: "today" | "week" | "month" | "all") => {
    const today = new Date();
    let from: Date;

    switch (range) {
      case "today":
        from = today;
        break;
      case "week":
        from = subDays(today, 7);
        break;
      case "month":
        from = subDays(today, 30);
        break;
      case "all":
        from = subDays(today, 365);
        break;
    }

    setFilters((prev) => ({
      ...prev,
      dateFrom: format(from, "yyyy-MM-dd"),
      dateTo: format(today, "yyyy-MM-dd"),
    }));
  };

  const filterOptions: FilterOption[] = [
    {
      key: "actionType",
      label: "Action Type",
      type: "select",
      placeholder: "All Actions",
      options: [
        { value: "create", label: "Create" },
        { value: "update", label: "Update" },
        { value: "delete", label: "Delete" },
        { value: "login", label: "Login" },
        { value: "logout", label: "Logout" },
        { value: "export", label: "Export" },
        { value: "import", label: "Import" },
        { value: "view", label: "View" },
      ],
    },
    {
      key: "entityType",
      label: "Entity Type",
      type: "select",
      placeholder: "All Entities",
      options: [
        { value: "student", label: "Student" },
        { value: "teacher", label: "Teacher" },
        { value: "course", label: "Course" },
        { value: "section", label: "Section" },
        { value: "enrollment", label: "Enrollment" },
        { value: "grade", label: "Grade" },
        { value: "attendance", label: "Attendance" },
        { value: "session", label: "Session" },
        { value: "report", label: "Report" },
        { value: "settings", label: "Settings" },
      ],
    },
  ];

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: "action_type",
      header: "Action",
      cell: ({ row }) => {
        const actionType = row.original.action_type;
        const config = ACTION_ICONS[actionType] || ACTION_ICONS.view;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.bg}`}>
              <span className={`material-symbols-outlined text-lg ${config.color}`}>
                {config.icon}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{row.original.action}</p>
              <p className="text-xs text-gray-500 capitalize">{actionType}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "entity_type",
      header: "Entity",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900 capitalize">{row.original.entity_type}</p>
          {row.original.entity_name && (
            <p className="text-xs text-gray-500">{row.original.entity_name}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "user_name",
      header: "User",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.user_name}</p>
          <p className="text-xs text-gray-500">{row.original.user_role}</p>
        </div>
      ),
    },
    {
      accessorKey: "ip_address",
      header: "IP Address",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-gray-600">{row.original.ip_address}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-gray-900">
            {format(new Date(row.original.created_at), "MMM d, yyyy")}
          </p>
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
          </p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedLog(row.original)}
          className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
          title="View Details"
        >
          <span className="material-symbols-outlined text-lg">info</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all system activities and changes</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton onExport={handleExport} />
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Logs"
            value={summary.totalLogs.toLocaleString()}
            icon="history"
            color="bg-primary"
          />
          <StatCard
            label="Today's Activity"
            value={summary.todayLogs.toString()}
            icon="today"
            color="bg-blue-500"
          />
          <StatCard
            label="Active Users"
            value={summary.uniqueUsers.toString()}
            icon="people"
            color="bg-green-500"
          />
          <StatCard
            label="Most Common"
            value="Updates"
            icon="trending_up"
            color="bg-purple-500"
          />
        </div>
      )}

      {/* Action Breakdown */}
      {summary && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {summary.actionBreakdown.map((item) => {
              const config = ACTION_ICONS[item.action] || ACTION_ICONS.view;
              return (
                <div
                  key={item.action}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${config.bg}`}>
                    <span className={`material-symbols-outlined text-sm ${config.color}`}>
                      {config.icon}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 capitalize">{item.action}</span>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Date Range Controls */}
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
                { key: "all", label: "All Time" },
              ].map((range) => (
                <button
                  key={range.key}
                  onClick={() => setQuickDateRange(range.key as "today" | "week" | "month" | "all")}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Inputs */}
          <div className="flex items-center gap-2 ml-auto">
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
        data={logs}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        loading={loading}
        emptyMessage="No audit logs found"
        emptyIcon="history"
        rowKey="id"
      />

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedLog(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      ACTION_ICONS[selectedLog.action_type]?.bg || "bg-gray-100"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${
                        ACTION_ICONS[selectedLog.action_type]?.color || "text-gray-600"
                      }`}
                    >
                      {ACTION_ICONS[selectedLog.action_type]?.icon || "info"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Audit Log Details</h2>
                    <p className="text-sm text-gray-500 capitalize">{selectedLog.action_type} action</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Action</p>
                    <p className="font-medium text-gray-900">{selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Timestamp</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(selectedLog.created_at), "MMM d, yyyy HH:mm:ss")}
                    </p>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Entity Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedLog.entity_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Entity ID</p>
                    <p className="font-medium text-gray-900 font-mono">
                      {selectedLog.entity_id || "-"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Entity Name</p>
                    <p className="font-medium text-gray-900">{selectedLog.entity_name || "-"}</p>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">User</p>
                    <p className="font-medium text-gray-900">{selectedLog.user_name}</p>
                    <p className="text-xs text-gray-500">{selectedLog.user_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedLog.user_role}</p>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">IP Address</p>
                    <p className="font-medium text-gray-900 font-mono">{selectedLog.ip_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User Agent</p>
                    <p className="font-medium text-gray-900 text-xs truncate" title={selectedLog.user_agent}>
                      {selectedLog.user_agent}
                    </p>
                  </div>
                </div>

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <>
                    <hr className="border-gray-100" />
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Additional Data</p>
                      <pre className="p-3 bg-gray-50 rounded-lg text-xs font-mono text-gray-700 overflow-x-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
