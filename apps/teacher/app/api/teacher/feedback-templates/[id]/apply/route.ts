import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/teacher/feedback-templates/[id]/apply
 * Apply a feedback template to a submission context
 *
 * This endpoint:
 * 1. Fetches the template
 * 2. Replaces variables with actual values from the submission context
 * 3. Increments the usage count
 * 4. Returns the processed feedback text
 *
 * Variables supported:
 * - {{student_name}} - Student's full name
 * - {{first_name}} - Student's first name
 * - {{score}} - The score earned
 * - {{max_score}} - Maximum possible score
 * - {{percentage}} - Score as percentage
 * - {{assessment_title}} - Name of the assessment
 * - {{course_name}} - Name of the course
 * - {{date}} - Current date formatted
 * - {{grade_letter}} - Letter grade (A, B, C, etc.)
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      student_name,
      score,
      max_score,
      assessment_title,
      course_name,
      custom_variables = {},
    } = body;

    const supabase = await createClient();
    const teacherId = authResult.teacher.id;

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from("teacher_feedback_templates")
      .select("*")
      .eq("id", id)
      .eq("teacher_profile_id", teacherId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    // Calculate derived values
    const percentage = max_score > 0 ? Math.round((score / max_score) * 100) : 0;
    const gradeLetterValue = getLetterGrade(percentage);
    const firstName = student_name ? student_name.split(" ")[0] : "";

    // Build variable map
    const variables: Record<string, string> = {
      student_name: student_name || "Student",
      first_name: firstName || "Student",
      score: score?.toString() || "0",
      max_score: max_score?.toString() || "0",
      percentage: percentage.toString(),
      assessment_title: assessment_title || "Assessment",
      course_name: course_name || "Course",
      date: new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      grade_letter: gradeLetterValue,
      ...custom_variables,
    };

    // Replace variables in content
    let processedContent = template.content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      processedContent = processedContent.replace(regex, value);
    }

    // Increment usage count
    await supabase
      .from("teacher_feedback_templates")
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      feedback: processedContent,
      template_name: template.name,
      variables_used: Object.keys(variables).filter(k =>
        template.content.includes(`{{${k}}}`)
      ),
    });
  } catch (error) {
    console.error("Feedback template apply error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to apply feedback template" },
      { status: 500 }
    );
  }
}

// Helper function to calculate letter grade
function getLetterGrade(percentage: number): string {
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}
