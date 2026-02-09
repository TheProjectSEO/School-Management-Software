import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTeacherProfile, getTeacherSections } from '@/lib/dal/teacher'
import { createServiceClient } from '@/lib/supabase/service'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export const metadata = {
  title: 'Students | MSU Teacher Portal',
  description: 'View and manage your students'
}

interface Student {
  id: string
  lrn: string | null
  grade_level: string
  section_id: string
  profile: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  section: {
    id: string
    name: string
  }
}

async function getTeacherStudents(teacherId: string): Promise<Student[]> {
  const supabase = createServiceClient()

  // Get all sections the teacher is assigned to
  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('section_id')
    .eq('teacher_profile_id', teacherId)

  if (!assignments || assignments.length === 0) {
    return []
  }

  const sectionIds = [...new Set(assignments.map(a => a.section_id))]

  // Get all students in those sections
  const { data: students, error } = await supabase
    .from('students')
    .select(`
      id,
      lrn,
      grade_level,
      section_id,
      profile:school_profiles!inner(
        id,
        full_name,
        avatar_url
      ),
      section:sections!inner(
        id,
        name
      )
    `)
    .in('section_id', sectionIds)
    .order('profile(full_name)', { ascending: true })

  if (error) {
    console.error('Error fetching students:', error)
    return []
  }

  return (students || []) as unknown as Student[]
}

async function StudentsContent() {
  const teacherProfile = await getTeacherProfile()

  if (!teacherProfile) {
    redirect('/login')
  }

  const [students, sections] = await Promise.all([
    getTeacherStudents(teacherProfile.id),
    getTeacherSections(teacherProfile.id)
  ])

  if (students.length === 0) {
    return (
      <EmptyState
        icon="school"
        title="No students found"
        description="You don't have any students in your assigned sections yet."
      />
    )
  }

  // Group students by section
  const studentsBySection = students.reduce((acc, student) => {
    const sectionId = student.section_id
    if (!acc[sectionId]) {
      acc[sectionId] = {
        section: student.section,
        students: []
      }
    }
    acc[sectionId].students.push(student)
    return acc
  }, {} as Record<string, { section: { id: string; name: string }; students: Student[] }>)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {Object.entries(studentsBySection).map(([sectionId, { section, students }]) => (
        <Card key={sectionId}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">groups</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {section.name}
                </h2>
                <p className="text-sm text-slate-500">{students.length} students</p>
              </div>
            </div>
            <Link
              href={`/teacher/classes/${sectionId}`}
              className="text-sm text-primary hover:underline"
            >
              View Section →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/teacher/students/${student.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {student.profile.avatar_url ? (
                  <img
                    src={student.profile.avatar_url}
                    alt={student.profile.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {getInitials(student.profile.full_name)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {student.profile.full_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {student.lrn ? `LRN: ${student.lrn}` : `Grade ${student.grade_level}`}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-400">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Students
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            View and manage students in your classes
          </p>
        </div>
      </div>

      {/* Students List */}
      <Suspense fallback={<LoadingSpinner />}>
        <StudentsContent />
      </Suspense>
    </div>
  )
}
