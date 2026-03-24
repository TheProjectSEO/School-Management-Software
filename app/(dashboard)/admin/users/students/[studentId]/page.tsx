export const dynamic = 'force-dynamic';
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserStatusBadge } from "@/components/admin/ui";

interface StudentDetailPageProps {
  params: Promise<{ studentId: string }>;
}

async function getStudentDetails(studentId: string) {
  const supabase = createAdminClient();

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
      school_profiles (
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

  // Get section adviser
  let sectionAdviser: { full_name: string; avatar_url: string | null; employee_id?: string } | null = null;
  if (student.section_id) {
    const { data: adviserRow } = await supabase
      .from("section_advisers")
      .select("teacher_profile_id")
      .eq("section_id", student.section_id)
      .limit(1)
      .maybeSingle();

    if (adviserRow?.teacher_profile_id) {
      const { data: teacherProfile } = await supabase
        .from("teacher_profiles")
        .select("employee_id, profile_id")
        .eq("id", adviserRow.teacher_profile_id)
        .maybeSingle();

      if (teacherProfile?.profile_id) {
        const { data: adviserSchoolProfile } = await supabase
          .from("school_profiles")
          .select("full_name, avatar_url")
          .eq("id", teacherProfile.profile_id)
          .maybeSingle();

        if (adviserSchoolProfile) {
          sectionAdviser = {
            full_name: adviserSchoolProfile.full_name,
            avatar_url: adviserSchoolProfile.avatar_url,
            employee_id: teacherProfile.employee_id ?? undefined,
          };
        }
      }
    }
  }

  // Get teachers assigned to this student's courses
  const courseIds = (enrollments || [])
    .map((e) => {
      const c = e.courses as unknown as { id: string } | null;
      return c?.id;
    })
    .filter(Boolean) as string[];

  let courseTeachers: { name: string; avatar_url: string | null; course_name: string; employee_id?: string }[] = [];
  if (courseIds.length > 0) {
    const { data: assignments } = await supabase
      .from("teacher_assignments")
      .select("course_id, teacher_profile_id")
      .in("course_id", courseIds);

    if (assignments && assignments.length > 0) {
      const teacherProfileIds = [...new Set(assignments.map((a) => a.teacher_profile_id).filter(Boolean))];
      const { data: teacherProfiles } = await supabase
        .from("teacher_profiles")
        .select("id, profile_id, employee_id")
        .in("id", teacherProfileIds);

      const profileIds2 = (teacherProfiles || []).map((t) => t.profile_id).filter(Boolean);
      const { data: teacherSchoolProfiles } = await supabase
        .from("school_profiles")
        .select("id, full_name, avatar_url")
        .in("id", profileIds2);

      const profileMap2: Record<string, { full_name: string; avatar_url: string | null }> = {};
      (teacherSchoolProfiles || []).forEach((p) => {
        profileMap2[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });

      const teacherMap: Record<string, { name: string; avatar_url: string | null; employee_id?: string }> = {};
      (teacherProfiles || []).forEach((t) => {
        const sp = profileMap2[t.profile_id];
        if (sp) {
          teacherMap[t.id] = { name: sp.full_name, avatar_url: sp.avatar_url, employee_id: t.employee_id ?? undefined };
        }
      });

      const { data: coursesForTeachers } = await supabase
        .from("courses")
        .select("id, name")
        .in("id", courseIds);
      const courseNameMap: Record<string, string> = {};
      (coursesForTeachers || []).forEach((c) => { courseNameMap[c.id] = c.name; });

      const seen = new Set<string>();
      for (const a of assignments) {
        const teacher = teacherMap[a.teacher_profile_id];
        if (teacher && !seen.has(a.teacher_profile_id)) {
          seen.add(a.teacher_profile_id);
          courseTeachers.push({
            name: teacher.name,
            avatar_url: teacher.avatar_url,
            employee_id: teacher.employee_id,
            course_name: courseNameMap[a.course_id] || "Unknown Course",
          });
        }
      }
    }
  }

  return {
    ...student,
    enrollments: enrollments || [],
    grades: grades || [],
    attendanceStats,
    activity: activity || [],
    sectionAdviser,
    courseTeachers,
  };
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { studentId } = await params;
  const student = await getStudentDetails(studentId);

  if (!student) {
    notFound();
  }

  const profile = student.school_profiles as unknown as { full_name: string; email?: string; phone?: string; avatar_url?: string };
  const section = student.sections as unknown as { name: string; grade_level: string } | null;
  const { sectionAdviser, courseTeachers } = student as unknown as {
    sectionAdviser: { full_name: string; avatar_url: string | null; employee_id?: string } | null;
    courseTeachers: { name: string; avatar_url: string | null; course_name: string; employee_id?: string }[];
  };

  const attendanceRate = student.attendanceStats.total > 0
    ? ((student.attendanceStats.present + student.attendanceStats.late) / student.attendanceStats.total * 100).toFixed(1)
    : "N/A";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/users/students"
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
            href={`/admin/users/students/${studentId}/edit`}
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
                <p className="text-gray-500">LRN: {student.lrn || "Not assigned"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <InfoRow label="LRN" value={student.lrn || "Not assigned"} />
              <InfoRow label="Email" value={profile.email || "Not provided"} />
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

          {/* Adviser & Teachers */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adviser & Teachers</h3>
            {sectionAdviser && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Section Adviser</p>
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  {sectionAdviser.avatar_url ? (
                    <img src={sectionAdviser.avatar_url} alt={sectionAdviser.full_name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm text-white font-bold">{sectionAdviser.full_name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{sectionAdviser.full_name}</p>
                    {sectionAdviser.employee_id && (
                      <p className="text-xs text-gray-500">{sectionAdviser.employee_id}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {courseTeachers.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subject Teachers</p>
                <div className="space-y-2">
                  {courseTeachers.map((teacher, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                      {teacher.avatar_url ? (
                        <img src={teacher.avatar_url} alt={teacher.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-gray-600">{teacher.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{teacher.name}</p>
                        <p className="text-xs text-gray-500 truncate">{teacher.course_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !sectionAdviser ? (
              <p className="text-sm text-gray-400 text-center py-4">No adviser or teachers assigned</p>
            ) : null}
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
              <h3 className="text-lg font-semibold text-gray-900">Enrolled Subjects</h3>
              <Link
                href={`/admin/enrollments?studentId=${studentId}`}
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
                href={`/admin/reports/grades?studentId=${studentId}`}
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
