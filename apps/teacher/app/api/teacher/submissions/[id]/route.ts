// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * GET /api/teacher/submissions/[id]
 * Get submission detail for grading
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;
  const { id } = await params;

  try {
    const supabase = await createClient();

    // Get submission with all related data
    const { data: submission, error } = await supabase
      .from("submissions")
      .select(
        `
        *,
        student:students(
          id,
          student_number,
          profile:school_profiles(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        ),
        assessment:assessments(
          id,
          open_at,
          close_at,
          time_limit,
          template:teacher_assessment_templates(
            id,
            title,
            type,
            instructions,
            rubric_template_id
          ),
          section_subject:teacher_assignments(
            id,
            teacher_id,
            section:sections(id, name),
            subject:courses(id, name, code)
          )
        ),
        versions:teacher_submission_versions(
          id,
          version_no,
          payload_json,
          file_paths_json,
          created_at
        ),
        rubric_score:teacher_rubric_scores(
          id,
          scores_json,
          total_score,
          rubric_template:teacher_rubric_templates(
            id,
            title,
            criteria_json,
            levels_json
          ),
          graded_at,
          graded_by
        ),
        feedback:teacher_feedback(
          id,
          teacher_comment,
          inline_notes_json,
          released_at,
          released_by
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify teacher has access
    if (submission.assessment.section_subject.teacher_id !== teacherId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Submission GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
