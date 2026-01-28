import { getCurrentStudent, getNotes } from "@/lib/dal";
import { getStudentSubjects } from "@/lib/dal";
import { redirect } from "next/navigation";
import NotesClient from "./NotesClient";

export const revalidate = 120; // 2 minutes - notes

export default async function NotesPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/login");
  }

  // Fetch notes from Supabase
  const notes = await getNotes(student.id);

  // Fetch enrolled courses for the sidebar
  const enrollments = await getStudentSubjects(student.id);
  const courses = enrollments.map((enrollment) => ({
    id: enrollment.course?.id || enrollment.course_id,
    name: enrollment.course?.name || "Unknown Course",
  }));

  return <NotesClient notes={notes} courses={courses} />;
}
