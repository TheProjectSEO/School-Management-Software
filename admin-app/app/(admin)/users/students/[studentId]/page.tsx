import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserStatusBadge } from "@/components/ui";

interface StudentDetailPageProps {
  params: { studentId: string };
}

async function getStudentDetails(studentId: string) {
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from("students")
    .select(`
      id,
      profile_id,
      lrn,
      grade_level,
      section_id,
      status,
      created_at,
      updated_at,
      profiles (
        id,
        full_name,
        email,
        phone,
        avatar_url
      ),
      sections (
        id,
        name,
        grade_level
      )
    `)
    .eq("id", studentId)
    .single();

  if (error || !student) return null;

  // Get enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      id,
      status,
      enrolled_at,
      courses (
        id,
        name,
        code
      ),
      sections (
        id,
        name
      )
    `)
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: false });

  // Get grades summary
  const { data: grades } = await supabase
    .from("grades")
    .select(`
      id,
      score,
      grade_value,
      assessment_type,
      created_at,
      courses (name)
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get attendance summary
  const { data: attendance } = await supabase
    .from("attendance")
    .select("status, date")
    .eq("student_id", studentId)
    .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  // Calculate attendance stats
  const attendanceStats = {
    present: attendance?.filter((a) => a.status === "present").length || 0,
    late: attendance?.filter((a) => a.status === "late").length || 0,
    absent: attendance?.filter((a) => a.status === "absent").length || 0,
    excused: attendance?.filter((a) => a.status === "excused").length || 0,
    total: attendance?.length || 0,
  };

  // Get activity history
  const { data: activity } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("entity_type", "student")
    .eq("entity_id", studentId)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    ...student,
    enrollments: enrollments || [],
    grades: grades || [],
    attendanceStats,
    activity: activity || [],
  };
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const student = await getStudentDetails(params.studentId);

  if (!student) {
    notFound();
  }

  const profile = student.profiles as unknown as { full_name: string; email: string; phone?: string; avatar_url?: string };
  const section = student.sections as unknown as { name: string; grade_level: string } | null;

  const attendanceRate = student.attendanceStats.total > 0
    ? ((student.attendanceStats.present + student.attendanceStats.late) / student.attendanceStats.total * 100).toFixed(1)
    : "N/A";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/users/students"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Profile</h1>
            <p className="text-gray-500 mt-1">View and manage student information</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/users/students/${params.studentId}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-2xl text-white font-bold">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{profile.full_name}</h2>
                <p className="text-gray-500">{profile.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <InfoRow label="LRN" value={student.lrn || "Not assigned"} />
              <InfoRow label="Grade Level" value={`Grade ${student.grade_level || "-"}`} />
              <InfoRow label="Section" value={section?.name || "Not assigned"} />
              <InfoRow
                label="Status"
                value={<UserStatusBadge status={student.status as "active" | "inactive" | "suspended"} />}
              />
              <InfoRow label="Phone" value={profile.phone || "Not provided"} />
              <InfoRow
                label="Enrolled Since"
                value={new Date(student.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance (Last 30 Days)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{student.attendanceStats.present}</p>
                <p className="text-xs text-green-600">Present</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{student.attendanceStats.late}</p>
                <p className="text-xs text-yellow-600">Late</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{student.attendanceStats.absent}</p>
                <p className="text-xs text-red-600">Absent</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">{student.attendanceStats.excused}</p>
                <p className="text-xs text-gray-600">Excused</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Attendance Rate: <span className="font-semibold">{attendanceRate}%</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Enrollments, Grades, Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrolled Courses */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Enrolled Courses</h3>
              <Link
                href={`/enrollments?studentId=${params.studentId}`}
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            {student.enrollments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                  menu_book
                </span>
                No courses enrolled
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {student.enrollments.slice(0, 5).map((enrollment) => {
                  const course = enrollment.courses as unknown as { name: string; code: string };
                  const enrollSection = enrollment.sections as unknown as { name: string };
                  return (
                    <div key={enrollment.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{course?.name}</p>
                        <p className="text-sm text-gray-500">
                          {course?.code} - Section {enrollSection?.name}
                        </p>
                      </div>
                      <UserStatusBadge status={enrollment.status as "active" | "completed" | "dropped"} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Grades */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Grades</h3>
              <Link
                href={`/reports/grades?studentId=${params.studentId}`}
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            {student.grades.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                  grade
                </span>
                No grades recorded
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {student.grades.slice(0, 5).map((grade) => {
                  const gradeCourse = grade.courses as unknown as { name: string };
                  return (
                    <div key={grade.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{gradeCourse?.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{grade.assessment_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{grade.score}</p>
                        <p className="text-sm text-gray-500">{grade.grade_value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity History */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity History</h3>
            {student.activity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                  history
                </span>
                No activity recorded
              </div>
            ) : (
              <div className="space-y-4">
                {student.activity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-sm text-gray-500">
                        {log.action === "create" ? "add_circle" : log.action === "update" ? "edit" : "info"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium capitalize">{log.action}</span> - {log.entity_type}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
