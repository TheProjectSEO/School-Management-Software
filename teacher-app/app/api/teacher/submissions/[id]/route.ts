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
      .from("n8n_content_creation.submissions")
      .select(
        `
        *,
        student:n8n_content_creation.student_profiles(
          id,
          student_number,
          profile:profiles(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        ),
        assessment:n8n_content_creation.assessment_instances(
          id,
          open_at,
          close_at,
          time_limit,
          template:n8n_content_creation.assessment_templates(
            id,
            title,
            type,
            instructions,
            rubric_template_id
          ),
          section_subject:n8n_content_creation.section_subjects(
            id,
            teacher_id,
            section:n8n_content_creation.sections(id, name),
            subject:n8n_content_creation.subjects(id, name, code)
          )
        ),
        versions:n8n_content_creation.submission_versions(
          id,
          version_no,
          payload_json,
          file_paths_json,
          created_at
        ),
        rubric_score:n8n_content_creation.rubric_scores(
          id,
          scores_json,
          total_score,
          rubric_template:n8n_content_creation.rubric_templates(
            id,
            title,
            criteria_json,
            levels_json
          ),
          graded_at,
          graded_by
        ),
        feedback:n8n_content_creation.feedback(
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
