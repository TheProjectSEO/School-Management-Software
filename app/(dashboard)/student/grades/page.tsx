import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/dal";
import { getStudentDepEdGrades } from "@/lib/dal/deped-grades";
import { createServiceClient } from "@/lib/supabase/service";
import GradesClient from "./GradesClient";
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

  return (
    <GradesClient
      depedReport={depedReport}
      academicYears={academicYears}
      studentId={student.id}
    />
  );
}
