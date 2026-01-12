import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/dal";
import {
  getStudentCourseGrades,
  getCurrentGPA,
  getGPATrend,
  getStudentGradingPeriods,
} from "@/lib/dal/grades";
import GradesClient from "./GradesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grades | MSU Student Portal",
  description:
    "View your grades, GPA, and academic standing at Mindanao State University.",
};

export const revalidate = 300; // 5 minutes - grades data

export default async function GradesPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch grades data in parallel
  const [grades, gpaData, gpaTrend, gradingPeriods] = await Promise.all([
    getStudentCourseGrades(student.id),
    getCurrentGPA(student.id),
    getGPATrend(student.id),
    getStudentGradingPeriods(student.id),
  ]);

  return (
    <GradesClient
      initialGrades={grades}
      initialGPA={gpaData}
      initialTrend={gpaTrend}
      gradingPeriods={gradingPeriods}
      studentId={student.id}
    />
  );
}
