import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/dal/student";
import { getAssessmentForQuiz, canTakeAssessment } from "@/lib/dal";
import QuizClient from "./QuizClient";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Get current student
  const student = await getCurrentStudent();
  if (!student) {
    redirect("/login");
  }

  // Get assessment
  const assessment = await getAssessmentForQuiz(id);
  if (!assessment) {
    redirect("/assessments");
  }

  // Check if student can take the assessment
  const { canTake, reason, attemptCount } = await canTakeAssessment(id, student.id);

  if (!canTake) {
    // Redirect to assessment page with error message
    redirect(`/assessments/${id}?error=${encodeURIComponent(reason || "Cannot take assessment")}`);
  }

  return (
    <QuizClient
      assessmentId={id}
      studentId={student.id}
      assessmentTitle={assessment.title}
      courseName={assessment.course?.name}
      timeLimitMinutes={assessment.time_limit_minutes}
      totalPoints={assessment.total_points}
      attemptNumber={attemptCount + 1}
      maxAttempts={assessment.max_attempts || 1}
    />
  );
}
