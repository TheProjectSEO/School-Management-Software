// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * POST /api/teacher/submissions/[id]/grade
 * Grade a submission with rubric scores and feedback
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId, userId } = authResult.context;
  const { id } = await params;

  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      rubricTemplateId,
      scores,
      totalScore,
      teacherComment,
      inlineNotes,
      autoRelease,
    } = body;

    // Get submission with access check
    const { data: submission, error: fetchError } = await supabase
      .from("n8n_content_creation.submissions")
      .select(
        `
        *,
        assessment:n8n_content_creation.assessment_instances(
          section_subject:n8n_content_creation.section_subjects(
            teacher_id
          )
        )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify access
    if (submission.assessment.section_subject.teacher_id !== teacherId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if submission is in a gradeable state
    if (submission.status !== "submitted" && submission.status !== "graded") {
      return NextResponse.json(
        { error: "Submission is not in a gradeable state" },
        { status: 400 }
      );
    }

    // Validate rubric scores if provided
    if (!rubricTemplateId || !scores || totalScore === undefined) {
      return NextResponse.json(
        { error: "Rubric template ID, scores, and total score are required" },
        { status: 400 }
      );
    }

    // Create or update rubric score
    const { data: existingScore } = await supabase
      .from("n8n_content_creation.rubric_scores")
      .select("id")
      .eq("submission_id", id)
      .single();

    if (existingScore) {
      // Update existing score
      const { error: updateError } = await supabase
        .from("n8n_content_creation.rubric_scores")
        .update({
          rubric_template_id: rubricTemplateId,
          scores_json: scores,
          total_score: totalScore,
          graded_by: userId,
          graded_at: new Date().toISOString(),
        })
        .eq("id", existingScore.id);

      if (updateError) {
        console.error("Error updating rubric score:", updateError);
        return NextResponse.json(
          { error: "Failed to update grade" },
          { status: 500 }
        );
      }
    } else {
      // Create new score
      const { error: createError } = await supabase
        .from("n8n_content_creation.rubric_scores")
        .insert({
          submission_id: id,
          rubric_template_id: rubricTemplateId,
          scores_json: scores,
          total_score: totalScore,
          graded_by: userId,
          graded_at: new Date().toISOString(),
        });

      if (createError) {
        console.error("Error creating rubric score:", createError);
        return NextResponse.json(
          { error: "Failed to save grade" },
          { status: 500 }
        );
      }
    }

    // Create or update feedback
    const { data: existingFeedback } = await supabase
      .from("n8n_content_creation.feedback")
      .select("id")
      .eq("submission_id", id)
      .single();

    const feedbackData: any = {
      teacher_comment: teacherComment?.trim() || null,
      inline_notes_json: inlineNotes || null,
    };

    // Auto-release if specified
    if (autoRelease) {
      feedbackData.released_at = new Date().toISOString();
      feedbackData.released_by = userId;
    }

    if (existingFeedback) {
      // Update existing feedback
      const { error: updateError } = await supabase
        .from("n8n_content_creation.feedback")
        .update(feedbackData)
        .eq("id", existingFeedback.id);

      if (updateError) {
        console.error("Error updating feedback:", updateError);
        return NextResponse.json(
          { error: "Failed to update feedback" },
          { status: 500 }
        );
      }
    } else {
      // Create new feedback
      feedbackData.submission_id = id;
      const { error: createError } = await supabase
        .from("n8n_content_creation.feedback")
        .insert(feedbackData);

      if (createError) {
        console.error("Error creating feedback:", createError);
        return NextResponse.json(
          { error: "Failed to save feedback" },
          { status: 500 }
        );
      }
    }

    // Update submission status
    const newStatus = autoRelease ? "released" : "graded";
    const { error: statusError } = await supabase
      .from("n8n_content_creation.submissions")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (statusError) {
      console.error("Error updating submission status:", statusError);
    }

    // TODO: Create notification for student if auto-released

    return NextResponse.json({
      success: true,
      message: autoRelease
        ? "Submission graded and released"
        : "Submission graded successfully",
      status: newStatus,
    });
  } catch (error) {
    console.error("Submission grade error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
