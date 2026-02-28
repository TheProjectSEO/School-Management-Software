"use client";

import { authFetch } from "@/lib/utils/authFetch";

import { useState, useEffect, useCallback } from "react";

interface Student {
  id: string;
  student_number: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface AttendanceRecord {
  student_id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  first_seen_at: string | null;
  last_seen_at: string | null;
  notes?: string;
}

interface StudentAttendance {
  student: Student;
  attendance: AttendanceRecord;
}

interface Section {
  id: string;
  name: string;
  grade_level: string;
}

interface AttendanceStats {
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface AttendanceDashboardProps {
  teacherId?: string;
  sectionId?: string;
  date?: Date;
}

export default function AttendanceDashboard({
  teacherId,
  sectionId: initialSectionId,
  date: initialDate = new Date(),
}: AttendanceDashboardProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSectionId || "");
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate.toISOString().split("T")[0]
  );
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch teacher's sections
  useEffect(() => {
    async function fetchSections() {
      try {
        const response = await authFetch("/api/teacher/subjects");
        if (response.ok) {
          const data = await response.json();
          // Extract unique sections from subjects
          const uniqueSections = new Map<string, Section>();
          data.subjects?.forEach((item: any) => {
            if (item.section && !uniqueSections.has(item.section.id)) {
              uniqueSections.set(item.section.id, {
                id: item.section.id,
                name: item.section.name,
                grade_level: item.section.grade_level || "",
              });
            }
          });
          const sectionsList = Array.from(uniqueSections.values());
          setSections(sectionsList);

          // Auto-select first section if none selected
          if (!selectedSectionId && sectionsList.length > 0) {
            setSelectedSectionId(sectionsList[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching sections:", err);
      }
    }
    fetchSections();
  }, []);

  // Fetch attendance data
  const fetchAttendance = useCallback(async () => {
    if (!selectedSectionId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sectionId: selectedSectionId,
        date: selectedDate,
      });

      const response = await authFetch(`/api/teacher/attendance/daily?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch attendance");
      }

      const data = await response.json();
      setAttendance(data.attendance || []);

      // Calculate stats
      const attendanceList = data.attendance || [];
      const newStats: AttendanceStats = {
        totalStudents: attendanceList.length,
        present: attendanceList.filter((a: StudentAttendance) => a.attendance.status === "present").length,
        absent: attendanceList.filter((a: StudentAttendance) => a.attendance.status === "absent").length,
        late: attendanceList.filter((a: StudentAttendance) => a.attendance.status === "late").length,
        excused: attendanceList.filter((a: StudentAttendance) => a.attendance.status === "excused").length,
      };
      setStats(newStats);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError("Unable to load attendance");
      setAttendance([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSectionId, selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Update attendance status
  const updateAttendance = async (studentId: string, status: string) => {
    if (!selectedSectionId) return;

    setIsSaving(studentId);

    try {
      const response = await authFetch("/api/teacher/attendance/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: selectedSectionId,
          date: selectedDate,
          studentId,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update attendance");
      }

      // Update local state
      setAttendance((prev) =>
        prev.map((item) =>
          item.student.id === studentId
            ? {
                ...item,
                attendance: { ...item.attendance, status: status as any },
              }
            : item
        )
      );

      // Recalculate stats
      setStats((prev) => {
        const oldStatus = attendance.find((a) => a.student.id === studentId)?.attendance.status;
        const newStats = { ...prev };
        if (oldStatus) {
          newStats[oldStatus as keyof Pick<AttendanceStats, 'present' | 'absent' | 'late' | 'excused'>]--;
        }
        newStats[status as keyof Pick<AttendanceStats, 'present' | 'absent' | 'late' | 'excused'>]++;
        return newStats;
      });
    } catch (err) {
      console.error("Error updating attendance:", err);
    } finally {
      setIsSaving(null);
    }
  };

  const getPercentage = (value: number) => {
    if (stats.totalStudents === 0) return 0;
    return Math.round((value / stats.totalStudents) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-500";
      case "absent":
        return "bg-red-500";
      case "late":
        return "bg-amber-500";
      case "excused":
        return "bg-blue-500";
      default:
        return "bg-slate-400";
    }
  };

  const getStatusButtonStyle = (status: string, currentStatus: string) => {
    const isActive = status === currentStatus;
    const baseStyle = "px-3 py-1.5 rounded-lg text-xs font-medium transition-all";

    switch (status) {
      case "present":
        return isActive
          ? `${baseStyle} bg-green-500 text-white`
          : `${baseStyle} bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400`;
      case "absent":
        return isActive
          ? `${baseStyle} bg-red-500 text-white`
          : `${baseStyle} bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400`;
      case "late":
        return isActive
          ? `${baseStyle} bg-amber-500 text-white`
          : `${baseStyle} bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400`;
      case "excused":
        return isActive
          ? `${baseStyle} bg-blue-500 text-white`
          : `${baseStyle} bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400`;
      default:
        return baseStyle;
    }
  };

  if (isLoading && !attendance.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with selectors */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Attendance Dashboard
          </h2>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name} {section.grade_level && `(Grade ${section.grade_level})`}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {selectedSectionId && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.present}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Present ({getPercentage(stats.present)}%)
              </p>
            </div>

            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.absent}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Absent ({getPercentage(stats.absent)}%)
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.late}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Late ({getPercentage(stats.late)}%)
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.excused}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Excused ({getPercentage(stats.excused)}%)
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Overall Attendance Rate
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {getPercentage(stats.present + stats.late)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${getPercentage(stats.present + stats.late)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Student attendance list */}
      {selectedSectionId && (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Student Attendance ({stats.totalStudents} students)
            </h3>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <p className="text-red-500 dark:text-red-400">{error}</p>
              <button
                onClick={fetchAttendance}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          ) : attendance.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                No students found in this section
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {attendance.map((item) => (
                <li
                  key={item.student.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${getStatusColor(item.attendance.status)}`}
                    />
                    {item.student.profile?.avatar_url ? (
                      <img
                        src={item.student.profile.avatar_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {item.student.profile?.full_name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {item.student.profile?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.student.student_number || "No ID"}
                        {item.attendance.first_seen_at && (
                          <span className="ml-2">
                            First seen: {new Date(item.attendance.first_seen_at).toLocaleTimeString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(["present", "absent", "late", "excused"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateAttendance(item.student.id, status)}
                        disabled={isSaving === item.student.id}
                        className={getStatusButtonStyle(status, item.attendance.status)}
                      >
                        {isSaving === item.student.id ? "..." : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!selectedSectionId && !isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-500 dark:text-slate-400">
            Select a section to view and manage attendance
          </p>
        </div>
      )}
    </div>
  );
}
