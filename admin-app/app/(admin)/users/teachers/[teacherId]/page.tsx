import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserStatusBadge } from "@/components/ui";

interface TeacherDetailPageProps {
  params: { teacherId: string };
}

async function getTeacherDetails(teacherId: string) {
  const supabase = await createClient();

  const { data: teacher, error } = await supabase
    .from("teacher_profiles")
    .select(`
      id,
      profile_id,
      employee_id,
      department,
      specialization,
      is_active,
      created_at,
      updated_at,
      profiles (
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq("id", teacherId)
    .single();

  if (error || !teacher) return null;

  // Get assigned sections
  const { data: sectionAssignments } = await supabase
    .from("section_advisers")
    .select(`
      id,
      sections (
        id,
        name,
        grade_level
      )
    `)
    .eq("teacher_id", teacherId);

  // Get course assignments
  const { data: courseAssignments } = await supabase
    .from("teacher_course_sections")
    .select(`
      id,
      is_primary,
      courses (
        id,
        name,
        code
      ),
      sections (
        id,
        name,
        grade_level
      )
    `)
    .eq("teacher_id", teacherId);

  // Get schedule (mock data - would come from actual schedule table)
  const schedule = [
    { day: "Monday", time: "7:30 AM - 8:30 AM", subject: "Mathematics", section: "Grade 10-A" },
    { day: "Monday", time: "9:00 AM - 10:00 AM", subject: "Mathematics", section: "Grade 10-B" },
    { day: "Tuesday", time: "7:30 AM - 8:30 AM", subject: "Mathematics", section: "Grade 9-A" },
    { day: "Tuesday", time: "10:30 AM - 11:30 AM", subject: "Mathematics", section: "Grade 10-A" },
    { day: "Wednesday", time: "8:00 AM - 9:00 AM", subject: "Mathematics", section: "Grade 10-B" },
  ];

  // Get performance metrics
  const metrics = {
    totalStudents: 145,
    avgClassSize: 35,
    attendanceRate: 97.5,
    gradingCompletion: 92,
  };

  return {
    ...teacher,
    sectionAssignments: sectionAssignments || [],
    courseAssignments: courseAssignments || [],
    schedule,
    metrics,
  };
}

export default async function TeacherDetailPage({ params }: TeacherDetailPageProps) {
  const teacher = await getTeacherDetails(params.teacherId);

  if (!teacher) {
    notFound();
  }

  const profile = teacher.profiles as unknown as { full_name: string; email: string; phone?: string; avatar_url?: string };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/users/teachers"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Profile</h1>
            <p className="text-gray-500 mt-1">View and manage teacher information</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/users/teachers/${params.teacherId}/edit`}
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
              <InfoRow label="Employee ID" value={teacher.employee_id || "Not assigned"} />
              <InfoRow
                label="Department"
                value={
                  <span className="capitalize">
                    {teacher.department?.replace("_", " ") || "Not assigned"}
                  </span>
                }
              />
              <InfoRow label="Specialization" value={teacher.specialization || "Not specified"} />
              <InfoRow
                label="Status"
                value={<UserStatusBadge status={teacher.is_active ? "active" : "inactive"} />}
              />
              <InfoRow label="Phone" value={profile.phone || "Not provided"} />
              <InfoRow
                label="Joined"
                value={new Date(teacher.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{teacher.metrics.totalStudents}</p>
                <p className="text-xs text-blue-600">Total Students</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{teacher.metrics.avgClassSize}</p>
                <p className="text-xs text-green-600">Avg. Class Size</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{teacher.metrics.attendanceRate}%</p>
                <p className="text-xs text-purple-600">Attendance Rate</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{teacher.metrics.gradingCompletion}%</p>
                <p className="text-xs text-orange-600">Grading Complete</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Assignments and Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Courses/Sections */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Courses & Sections</h3>
            {teacher.courseAssignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                  menu_book
                </span>
                No course assignments
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Course</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Section</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {teacher.courseAssignments.map((assignment) => {
                      const course = assignment.courses as unknown as { name: string; code: string };
                      const section = assignment.sections as unknown as { name: string; grade_level: string };
                      return (
                        <tr key={assignment.id}>
                          <td className="py-2 px-3">
                            <div>
                              <p className="font-medium text-gray-900">{course?.name}</p>
                              <p className="text-xs text-gray-500">{course?.code}</p>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            Grade {section?.grade_level} - {section?.name}
                          </td>
                          <td className="py-2 px-3">
                            {assignment.is_primary ? (
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                Primary
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                Assistant
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Advisory Sections */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Advisory Sections</h3>
            {teacher.sectionAssignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
                  groups
                </span>
                No advisory sections assigned
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teacher.sectionAssignments.map((assignment) => {
                  const section = assignment.sections as unknown as { name: string; grade_level: string };
                  return (
                    <div
                      key={assignment.id}
                      className="p-3 border border-gray-100 rounded-lg flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">groups</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{section?.name}</p>
                        <p className="text-sm text-gray-500">Grade {section?.grade_level}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Teaching Schedule */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Teaching Schedule</h3>
              <span className="text-sm text-gray-500">This Week</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Day</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Time</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Subject</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Section</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {teacher.schedule.map((slot, index) => (
                    <tr key={index}>
                      <td className="py-2 px-3 font-medium text-gray-900">{slot.day}</td>
                      <td className="py-2 px-3 text-gray-600">{slot.time}</td>
                      <td className="py-2 px-3 text-gray-600">{slot.subject}</td>
                      <td className="py-2 px-3 text-gray-600">{slot.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
