import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { callOpenAIChatCompletions } from "@/lib/ai/openai";

/**
 * POST /api/admin/applications/ai-screen-bulk
 * Batch AI screening for multiple applications
 *
 * Request body:
 * - applicationIds: string[] - Array of application IDs to screen
 * - OR status: string - Screen all applications with this status (e.g., "pending")
 * - limit?: number - Max applications to process (default 10, max 25)
 *
 * Returns summary statistics and individual screening results
 */

interface BulkScreeningRequest {
  applicationIds?: string[];
  status?: string;
  limit?: number;
}

interface ScreeningResultSummary {
  id: string;
  full_name: string;
  email: string;
  applying_for_grade: string;
  completeness_score: number;
  recommendation: 'approve' | 'review' | 'flag';
  priority: 'high' | 'medium' | 'low';
  summary: string;
  risk_flags_count: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkScreeningRequest = await request.json();
    const { applicationIds, status, limit = 10 } = body;

    if (!applicationIds && !status) {
      return NextResponse.json(
        { success: false, error: "Either applicationIds or status is required" },
        { status: 400 }
      );
    }

    const maxLimit = Math.min(limit, 25);
    const supabase = createServiceClient();

    // Fetch applications
    let query = supabase
      .from("student_applications")
      .select("*")
      .limit(maxLimit);

    if (applicationIds && applicationIds.length > 0) {
      query = query.in("id", applicationIds.slice(0, maxLimit));
    } else if (status) {
      query = query.eq("status", status);
    }

    const { data: applications, error } = await query;

    if (error) {
      throw error;
    }

    if (!applications || applications.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        summary: {
          total_processed: 0,
          approve_count: 0,
          review_count: 0,
          flag_count: 0,
          avg_completeness: 0,
        },
        message: "No applications found to process",
      });
    }

    // Process each application
    const results: ScreeningResultSummary[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const application of applications) {
      try {
        const screening = await screenApplication(application);
        results.push({
          id: application.id,
          full_name: `${application.first_name} ${application.last_name}`,
          email: application.email,
          applying_for_grade: application.applying_for_grade,
          completeness_score: screening.completeness_score,
          recommendation: screening.recommendation,
          priority: screening.priority,
          summary: screening.summary,
          risk_flags_count: screening.risk_flags.length,
        });
      } catch (err) {
        errors.push({
          id: application.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Calculate summary statistics
    const summary = {
      total_processed: results.length,
      approve_count: results.filter(r => r.recommendation === 'approve').length,
      review_count: results.filter(r => r.recommendation === 'review').length,
      flag_count: results.filter(r => r.recommendation === 'flag').length,
      avg_completeness: results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.completeness_score, 0) / results.length)
        : 0,
      high_priority_count: results.filter(r => r.priority === 'high').length,
    };

    return NextResponse.json({
      success: true,
      results: results.sort((a, b) => {
        // Sort by priority (high first) then by recommendation (flag first)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const recOrder = { flag: 0, review: 1, approve: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return recOrder[a.recommendation] - recOrder[b.recommendation];
      }),
      summary,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        processed_at: new Date().toISOString(),
        requested_limit: maxLimit,
      },
    });
  } catch (error) {
    console.error("Bulk AI screening error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during bulk screening" },
      { status: 500 }
    );
  }
}

async function screenApplication(application: any): Promise<{
  completeness_score: number;
  recommendation: 'approve' | 'review' | 'flag';
  priority: 'high' | 'medium' | 'low';
  risk_flags: string[];
  summary: string;
}> {
  const context = buildApplicationContext(application);
  const prompt = buildScreeningPrompt(context);

  const completion = await callOpenAIChatCompletions({
    messages: [
      {
        role: "system",
        content: `You are an admissions screening assistant. Analyze the application and return a concise JSON response with:
{
  "completeness_score": <0-100>,
  "recommendation": "<approve|review|flag>",
  "priority": "<high|medium|low>",
  "risk_flags": ["<issue1>", "<issue2>"],
  "summary": "<1 sentence summary>"
}`,
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 500,
  });

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI did not return a response");
  }

  // Parse response
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Failed to parse AI response");
  }
}

function buildApplicationContext(application: any) {
  return {
    name: `${application.first_name} ${application.last_name}`,
    email: application.email || "",
    phone: application.phone || "",
    grade: application.applying_for_grade || "",
    previous_school: application.previous_school || "",
    guardian_name: application.guardian_name || "",
    guardian_phone: application.guardian_phone || "",
    has_birth_cert: !!application.birth_certificate_url,
    has_report_card: !!application.report_card_url,
    has_good_moral: !!application.good_moral_url,
    has_photo: !!application.photo_url,
    special_needs: application.special_needs || "",
    submitted_at: application.submitted_at,
  };
}

function buildScreeningPrompt(ctx: any): string {
  const missing: string[] = [];
  if (!ctx.email) missing.push("email");
  if (!ctx.phone) missing.push("phone");
  if (!ctx.guardian_name) missing.push("guardian name");
  if (!ctx.guardian_phone) missing.push("guardian phone");
  if (!ctx.has_birth_cert) missing.push("birth certificate");
  if (!ctx.has_report_card) missing.push("report card");

  return `Application for ${ctx.name}:
- Grade: ${ctx.grade}
- Email: ${ctx.email || "missing"}
- Phone: ${ctx.phone || "missing"}
- Previous School: ${ctx.previous_school || "not provided"}
- Guardian: ${ctx.guardian_name || "missing"} (${ctx.guardian_phone || "no phone"})
- Documents: Birth Cert ${ctx.has_birth_cert ? "Yes" : "No"}, Report Card ${ctx.has_report_card ? "Yes" : "No"}, Good Moral ${ctx.has_good_moral ? "Yes" : "No"}
- Special Needs: ${ctx.special_needs || "none"}
- Submitted: ${new Date(ctx.submitted_at).toLocaleDateString()}
${missing.length > 0 ? `\nMissing: ${missing.join(", ")}` : ""}

Analyze and return JSON.`;
}
