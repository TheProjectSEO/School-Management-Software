// @ts-nocheck - Uses n8n_content_creation schema with complex queries
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";

/**
 * GET /api/teacher/submissions
 * Get submissions (grading inbox)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireTeacher();
  if (!authResult.success) {
    return authResult.response;
  }

  const { teacherId } = authResult.context;
  const { searchParams } = new URL(request.url);
  const assessmentId = searchParams.get("assessmentId");
  const sectionId = searchParams.get("sectionId");
  const status = searchParams.get("status") || "submitted"; // submitted, graded, released
  const pending = searchParams.get("pending") === "true";

  try {
    const supabase = await createClient();

    // Get teacher's section subjects
    const { data: teacherSectionSubjects } = await supabase
      .from("teacher_assignments")
      .select("id, section_id")
      .eq("teacher_id", teacherId);

    if (!teacherSectionSubjects || teacherSectionSubjects.length === 0) {
      return NextResponse.json({ submissions: [] });
    }

    const sectionSubjectIds = teacherSectionSubjects.map((ss) => ss.id);

    // Build query for assessment instances
    let instanceQuery = supabase
      .from("assessments")
      .select("id")
      .in("section_subject_id", sectionSubjectIds);

    if (assessmentId) {
      instanceQuery = instanceQuery.eq("id", assessmentId);
    }

    if (sectionId) {
      const filteredIds = teacherSectionSubjects
        .filter((ss) => ss.section_id === sectionId)
        .map((ss) => ss.id);
      instanceQuery = instanceQuery.in("section_subject_id", filteredIds);
    }

    const { data: instances } = await instanceQuery;
    const instanceIds = instances?.map((i) => i.id) || [];

    if (instanceIds.length === 0) {
      return NextResponse.json({ submissions: [] });
    }

    // Get submissions
    let submissionQuery = supabase
      .from("submissions")
      .select(
        `
        *,
        student:students(
          id,
          profile:school_profiles(
            first_name,
            last_name,
            avatar_url
          )
        ),
        assessment:assessments(
          id,
          open_at,
          close_at,
          template:teacher_assessment_templates(
            id,
            title,
            type
          ),
          section_subject:teacher_assignments(
            section:sections(id, name),
            subject:courses(id, name, code)
          )
        ),
        latest_version:teacher_submission_versions(
          version_no,
          payload_json,
          file_paths_json,
          created_at
        ),
        rubric_score:teacher_rubric_scores(
          id,
          total_score,
          graded_at,
          graded_by
        ),
        feedback:teacher_feedback(
          id,
          teacher_comment,
          released_at
        )
      `
      )
      .in("assessment_instance_id", instanceIds)
      .order("submitted_at", { ascending: false });

    if (pending) {
      // Only show submissions that need grading
      submissionQuery = submissionQuery.eq("status", "submitted");
    } else if (status) {
      submissionQuery = submissionQuery.eq("status", status);
    }

    const { data: submissions, error } = await submissionQuery;

    if (error) {
      console.error("Error fetching submissions:", error);
      return NextResponse.json(
        { error: "Failed to fetch submissions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Submissions GET error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
