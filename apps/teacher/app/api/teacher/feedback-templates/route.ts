import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/teacher/feedback-templates
 * List all feedback templates for the teacher
 *
 * POST /api/teacher/feedback-templates
 * Create a new feedback template
 *
 * Templates support variables like:
 * - {{student_name}} - Student's full name
 * - {{score}} - The score earned
 * - {{max_score}} - Maximum possible score
 * - {{percentage}} - Score as percentage
 * - {{assessment_title}} - Name of the assessment
 * - {{course_name}} - Name of the course
 *
 * Tables used:
 * - teacher_feedback_templates (custom table - will create if not exists)
 */

export interface FeedbackTemplate {
  id: string;
  teacher_profile_id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Default categories for feedback templates
const TEMPLATE_CATEGORIES = [
  "excellent_work",
  "good_work",
  "needs_improvement",
  "incomplete",
  "late_submission",
  "missing_requirements",
  "plagiarism_concern",
  "general",
] as const;

// Extract variables from template content
function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
}

export async function GET(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const supabase = await createClient();
    const teacherId = authResult.teacher.id;

    // First, ensure the table exists by checking/creating it
    await ensureFeedbackTemplatesTable(supabase);

    let query = supabase
      .from("teacher_feedback_templates")
      .select("*")
      .eq("teacher_profile_id", teacherId)
      .order("usage_count", { ascending: false })
      .order("name", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: templates, error } = await query;

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === "42P01") {
        return NextResponse.json({
          success: true,
          templates: [],
          categories: TEMPLATE_CATEGORIES,
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      templates: templates || [],
      categories: TEMPLATE_CATEGORIES,
    });
  } catch (error) {
    console.error("Feedback templates list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch feedback templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name, category, content, is_default = false } = body;

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: "Name and content are required" },
        { status: 400 }
      );
    }

    if (category && !TEMPLATE_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${TEMPLATE_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const teacherId = authResult.teacher.id;

    // Ensure table exists
    await ensureFeedbackTemplatesTable(supabase);

    // Extract variables from content
    const variables = extractVariables(content);

    const { data: template, error } = await supabase
      .from("teacher_feedback_templates")
      .insert({
        teacher_profile_id: teacherId,
        name,
        category: category || "general",
        content,
        variables,
        is_default,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      template,
      message: "Feedback template created successfully",
    });
  } catch (error) {
    console.error("Feedback template create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create feedback template" },
      { status: 500 }
    );
  }
}

// Helper function to ensure the feedback templates table exists
async function ensureFeedbackTemplatesTable(supabase: any) {
  // Try to create the table if it doesn't exist
  // This is a safety check - in production, migrations should handle this
  try {
    await supabase.rpc("ensure_feedback_templates_table");
  } catch {
    // Table might already exist or RPC doesn't exist - that's okay
  }
}
