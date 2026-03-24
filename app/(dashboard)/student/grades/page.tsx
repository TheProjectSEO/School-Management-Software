import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/dal";
import { getStudentDepEdGrades } from "@/lib/dal/deped-grades";
import { createServiceClient } from "@/lib/supabase/service";
import GradesClient from "./GradesClient";
import { RealtimeRefresher } from '@/components/shared/RealtimeRefresher';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grades | MSU Student Portal",
  description:
    "View your grades and academic performance at Mindanao State University.",
};

export const revalidate = 300; // 5 minutes

export default async function GradesPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Get available academic years for this student
  const supabase = createServiceClient();
  const { data: yearRows } = await supabase
    .from("deped_final_grades")
    .select("academic_year")
    .eq("student_id", student.id)
    .eq("is_released", true)
    .order("academic_year", { ascending: false });

  const academicYears = [
    ...new Set((yearRows ?? []).map((r) => r.academic_year)),
  ];

  // Default to most recent year
  const latestYear = academicYears[0];
  const depedReport = await getStudentDepEdGrades(student.id, latestYear);

  // Fetch released quarterly grades from course_grades (teacher-released, available earlier than admin final grades)
  async function fetchReleasedQuarterlyGrades(studentId: string) {
    // Flat selects only — NO FK joins (critical rule in this codebase)
    const { data: quarterlyRows } = await supabase
      .from('course_grades')
      .select('id, course_id, grading_period_id, quarterly_grade, ww_percentage_score, pt_percentage_score, qa_percentage_score')
      .eq('student_id', studentId)
      .eq('is_released', true)
      .not('quarterly_grade', 'is', null)

    if (!quarterlyRows?.length) return []

    const courseIds = [...new Set(quarterlyRows.map((g) => g.course_id))]
    const periodIds = [...new Set(quarterlyRows.map((g) => g.grading_period_id))]

    const [{ data: courses }, { data: periods }] = await Promise.all([
      supabase.from('courses').select('id, name').in('id', courseIds),
      supabase.from('grading_periods').select('id, name, period_number').in('id', periodIds),
    ])

    const courseMap = new Map((courses ?? []).map((c) => [c.id, c.name]))
    const periodMap = new Map((periods ?? []).map((p) => [p.id, p]))

    // Group by course, produce per-course row with Q1-Q4
    const byCourse = new Map<string, { course_id: string; course_name: string; q1: number | null; q2: number | null; q3: number | null; q4: number | null }>()

    for (const row of quarterlyRows) {
      const period = periodMap.get(row.grading_period_id)
      if (!period) continue
      if (!byCourse.has(row.course_id)) {
        byCourse.set(row.course_id, {
          course_id: row.course_id,
          course_name: courseMap.get(row.course_id) ?? 'Unknown',
          q1: null, q2: null, q3: null, q4: null,
        })
      }
      const entry = byCourse.get(row.course_id)!
      if (period.period_number === 1) entry.q1 = row.quarterly_grade
      else if (period.period_number === 2) entry.q2 = row.quarterly_grade
      else if (period.period_number === 3) entry.q3 = row.quarterly_grade
      else if (period.period_number === 4) entry.q4 = row.quarterly_grade
    }

    return [...byCourse.values()]
  }

  const quarterlyGrades = await fetchReleasedQuarterlyGrades(student.id)

  return (
    <>
      <RealtimeRefresher tables={['grades', 'grade_components']} debounceMs={1500} />
      <GradesClient
        depedReport={depedReport}
        academicYears={academicYears}
        studentId={student.id}
        quarterlyGrades={quarterlyGrades}
      />
    </>
  );
}
