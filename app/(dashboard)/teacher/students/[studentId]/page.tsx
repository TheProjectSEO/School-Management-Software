export const dynamic = 'force-dynamic';
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { createServiceClient } from '@/lib/supabase/service'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export const metadata = {
  title: 'Student Profile | MSU Teacher Portal',
  description: 'View student details and academic performance'
}

interface StudentDetails {
  id: string
  lrn: string | null
  grade_level: string
  section_id: string
  profile: {
    id: string
    full_name: string
    avatar_url: string | null
    email: string | null
  }
  section: {
    id: string
    name: string
    grade_level: string
  }
}

async function getStudentDetails(studentId: string, teacherId: string): Promise<StudentDetails | null> {
  const supabase = createServiceClient()

  // Get student flat columns (no FK joins — they silently return 0 rows)
  const { data: student, error } = await supabase
    .from('students')
    .select('id, lrn, grade_level, section_id, profile_id')
    .eq('id', studentId)
    .single()

  if (error || !student) {
    console.error('Error fetching student:', error)
    return null
  }

  // Fetch profile separately
  const { data: profile } = await supabase
    .from('school_profiles')
    .select('id, full_name, avatar_url, email')
    .eq('id', student.profile_id)
    .single()

  if (!profile) {
    console.error('Profile not found for student:', studentId)
    return null
  }

  // Fetch section separately
  let section: { id: string; name: string; grade_level: string } | null = null
  if (student.section_id) {
    const { data: sec } = await supabase
      .from('sections')
      .select('id, name, grade_level')
      .eq('id', student.section_id)
      .single()
    section = sec
  }

  // Verify teacher has access to this student's section
  const { count } = await supabase
    .from('teacher_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_profile_id', teacherId)
    .eq('section_id', student.section_id)

  if (!count || count === 0) {
    return null
  }

  return {
    id: student.id,
    lrn: student.lrn,
    grade_level: student.grade_level,
    section_id: student.section_id,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      email: profile.email,
    },
    section: section || { id: student.section_id, name: 'Unknown Section', grade_level: student.grade_level },
  }
}

async function getStudentGrades(studentId: string) {
  const supabase = createServiceClient()

  // Fetch grades flat (no FK joins)
  const { data: grades } = await supabase
    .from('grades')
    .select('id, score, total_points, percentage, letter_grade, graded_at, assessment_id')
    .eq('student_id', studentId)
    .order('graded_at', { ascending: false })
    .limit(10)

  if (!grades || grades.length === 0) return []

  // Fetch assessments separately
  const assessmentIds = [...new Set(grades.map(g => g.assessment_id).filter(Boolean))]
  let assessmentMap: Record<string, { id: string; title: string; type: string; course_id: string }> = {}
  if (assessmentIds.length > 0) {
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, title, type, course_id')
      .in('id', assessmentIds)
    if (assessments) {
      assessments.forEach(a => { assessmentMap[a.id] = a })
    }
  }

  // Fetch courses separately
  const courseIds = [...new Set(Object.values(assessmentMap).map(a => a.course_id).filter(Boolean))]
  let courseMap: Record<string, { name: string; subject_code: string }> = {}
  if (courseIds.length > 0) {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, name, subject_code')
      .in('id', courseIds)
    if (courses) {
      courses.forEach(c => { courseMap[c.id] = { name: c.name, subject_code: c.subject_code } })
    }
  }

  return grades.map(g => {
    const assessment = g.assessment_id ? assessmentMap[g.assessment_id] : null
    const course = assessment?.course_id ? courseMap[assessment.course_id] : null
    return {
      ...g,
      assessment: assessment ? { id: assessment.id, title: assessment.title, type: assessment.type, course: course } : null,
    }
  })
}

async function getStudentAttendance(studentId: string) {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('attendance_records')
    .select('id, status, date, remarks')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(20)

  return data || []
}

async function StudentProfileContent({ studentId }: { studentId: string }) {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  const student = await getStudentDetails(studentId, teacherProfile.id)

  if (!student) {
    notFound()
  }

  const [grades, attendance] = await Promise.all([
    getStudentGrades(studentId),
    getStudentAttendance(studentId)
  ])

  // Calculate attendance stats
  const attendanceStats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    excused: attendance.filter(a => a.status === 'excused').length,
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'absent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'late': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'excused': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {student.profile.avatar_url ? (
            <img
              src={student.profile.avatar_url}
              alt={student.profile.full_name}
              className="w-20 h-20 rounded-xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {getInitials(student.profile.full_name)}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {student.profile.full_name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {student.section.name} - Grade {student.grade_level}
            </p>
            {student.lrn && (
              <p className="text-sm text-slate-500 dark:text-slate-500">
                LRN: {student.lrn}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/messages?studentId=${student.profile.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-lg">chat</span>
            Message
          </Link>
          <Link
            href={`/teacher/classes/${student.section_id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Class
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{attendanceStats.present}</p>
              <p className="text-sm text-slate-500">Present</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-2xl">cancel</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{attendanceStats.absent}</p>
              <p className="text-sm text-slate-500">Absent</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-600 text-2xl">schedule</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{attendanceStats.late}</p>
              <p className="text-sm text-slate-500">Late</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-2xl">assignment</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{grades.length}</p>
              <p className="text-sm text-slate-500">Graded Items</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Grades */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recent Grades</h2>
            <Badge variant="info">{grades.length} items</Badge>
          </div>
          {grades.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              No grades recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {grades.slice(0, 5).map((grade: any) => (
                <div
                  key={grade.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {grade.assessment?.title || 'Unknown Assessment'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {grade.assessment?.course?.name || 'Unknown Course'} - {grade.assessment?.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-slate-900 dark:text-slate-100">
                      {grade.score}/{grade.total_points}
                    </p>
                    <p className="text-sm text-slate-500">
                      {grade.percentage}% ({grade.letter_grade})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Attendance */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recent Attendance</h2>
            <Badge variant="success">{attendance.length} records</Badge>
          </div>
          {attendance.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              No attendance records yet.
            </p>
          ) : (
            <div className="space-y-2">
              {attendance.slice(0, 8).map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                    <span className="text-slate-900 dark:text-slate-100">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  {record.remarks && (
                    <span className="text-sm text-slate-500 truncate max-w-[150px]">
                      {record.remarks}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <StudentProfileContent studentId={studentId} />
    </Suspense>
  )
}
