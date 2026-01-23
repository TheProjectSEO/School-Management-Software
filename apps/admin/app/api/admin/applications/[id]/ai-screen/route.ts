import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { callOpenAIChatCompletions } from "@/lib/ai/openai";

/**
 * POST /api/admin/applications/[id]/ai-screen
 * AI-powered application screening for admissions
 *
 * This analyzes a student application and provides:
 * - Completeness score (are all required fields filled?)
 * - Risk flags (potential issues to review)
 * - Recommendation (approve, review, or flag)
 * - Suggested priority level
 * - Key points to verify
 *
 * Tables used:
 * - student_applications (read): Get application details
 */

export interface AIScreeningResult {
  completeness_score: number; // 0-100
  recommendation: 'approve' | 'review' | 'flag';
  priority: 'high' | 'medium' | 'low';
  risk_flags: string[];
  strengths: string[];
  verification_needed: string[];
  summary: string;
  detailed_analysis: string;
  confidence: number; // 0-100
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Fetch the application
    const { data: application, error } = await supabase
      .from("student_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // Build the screening context
    const applicationContext = buildApplicationContext(application);

    // Generate the AI screening
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(applicationContext);

    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { success: false, error: "AI did not return a response" },
        { status: 500 }
      );
    }

    // Parse the AI response
    let screening: AIScreeningResult;
    try {
      screening = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          screening = JSON.parse(jsonMatch[1]);
        } catch {
          console.error("Failed to parse AI screening response:", content);
          return NextResponse.json(
            { success: false, error: "Failed to parse AI response" },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: "Invalid AI response format" },
          { status: 500 }
        );
      }
    }

    // Validate and normalize the response
    const normalizedScreening: AIScreeningResult = {
      completeness_score: Math.min(100, Math.max(0, Number(screening.completeness_score) || 0)),
      recommendation: ['approve', 'review', 'flag'].includes(screening.recommendation)
        ? screening.recommendation
        : 'review',
      priority: ['high', 'medium', 'low'].includes(screening.priority)
        ? screening.priority
        : 'medium',
      risk_flags: Array.isArray(screening.risk_flags) ? screening.risk_flags : [],
      strengths: Array.isArray(screening.strengths) ? screening.strengths : [],
      verification_needed: Array.isArray(screening.verification_needed) ? screening.verification_needed : [],
      summary: screening.summary || "",
      detailed_analysis: screening.detailed_analysis || "",
      confidence: Math.min(100, Math.max(0, Number(screening.confidence) || 50)),
    };

    // Store the screening result (optional - can be stored in a screening_results table)
    // For now, we'll just return it

    return NextResponse.json({
      success: true,
      screening: normalizedScreening,
      application: {
        id: application.id,
        full_name: `${application.first_name} ${application.last_name}`,
        email: application.email,
        applying_for_grade: application.applying_for_grade,
        status: application.status,
        submitted_at: application.submitted_at,
      },
      metadata: {
        screened_at: new Date().toISOString(),
        model_confidence: normalizedScreening.confidence,
      },
    });
  } catch (error) {
    console.error("AI application screening error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during screening" },
      { status: 500 }
    );
  }
}

interface ApplicationContext {
  applicant: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    birth_date: string | null;
    gender: string | null;
    address: string | null;
  };
  academic: {
    applying_for_grade: string;
    previous_school: string | null;
    preferred_track: string | null;
    academic_year: string | null;
  };
  guardian: {
    name: string | null;
    relationship: string | null;
    phone: string | null;
    email: string | null;
    occupation: string | null;
  };
  documents: {
    birth_certificate: boolean;
    report_card: boolean;
    good_moral: boolean;
    photos: boolean;
  };
  additional: {
    special_needs: string | null;
    medical_conditions: string | null;
    how_heard_about: string | null;
  };
  status: string;
  submitted_at: string;
}

function buildApplicationContext(application: any): ApplicationContext {
  return {
    applicant: {
      first_name: application.first_name || "",
      last_name: application.last_name || "",
      email: application.email || "",
      phone: application.phone || "",
      birth_date: application.birth_date || null,
      gender: application.gender || null,
      address: application.address || null,
    },
    academic: {
      applying_for_grade: application.applying_for_grade || "",
      previous_school: application.previous_school || null,
      preferred_track: application.preferred_track || null,
      academic_year: application.academic_year || null,
    },
    guardian: {
      name: application.guardian_name || null,
      relationship: application.guardian_relationship || null,
      phone: application.guardian_phone || null,
      email: application.guardian_email || null,
      occupation: application.guardian_occupation || null,
    },
    documents: {
      birth_certificate: !!application.birth_certificate_url,
      report_card: !!application.report_card_url,
      good_moral: !!application.good_moral_url,
      photos: !!application.photo_url,
    },
    additional: {
      special_needs: application.special_needs || null,
      medical_conditions: application.medical_conditions || null,
      how_heard_about: application.how_heard_about || null,
    },
    status: application.status || "pending",
    submitted_at: application.submitted_at || new Date().toISOString(),
  };
}

function buildSystemPrompt(): string {
  return `You are an admissions screening assistant for a K-12 school. Your role is to analyze student applications and provide objective assessments to help admissions staff make informed decisions.

Guidelines:
- Be thorough but fair in your assessment
- Flag potential issues objectively without bias
- Consider completeness of required information
- Identify documents that need verification
- Note any inconsistencies in the application
- Be helpful to admissions staff without making final decisions

Return your response as valid JSON with this exact structure:
{
  "completeness_score": <number 0-100>,
  "recommendation": "<approve|review|flag>",
  "priority": "<high|medium|low>",
  "risk_flags": ["<potential issue 1>", "<potential issue 2>"],
  "strengths": ["<strength 1>", "<strength 2>"],
  "verification_needed": ["<item to verify 1>", "<item to verify 2>"],
  "summary": "<1-2 sentence summary>",
  "detailed_analysis": "<2-3 paragraph detailed analysis>",
  "confidence": <number 0-100>
}

Recommendation guidelines:
- "approve": Application appears complete and ready for enrollment
- "review": Application needs manual review for minor issues
- "flag": Application has significant issues requiring attention

Priority guidelines:
- "high": Urgent issues or time-sensitive (deadline approaching)
- "medium": Standard processing appropriate
- "low": Can wait, no urgency`;
}

function buildUserPrompt(context: ApplicationContext): string {
  const parts: string[] = [];

  parts.push("Please screen the following student application:\n");

  // Applicant Info
  parts.push("=== APPLICANT INFORMATION ===");
  parts.push(`Name: ${context.applicant.first_name} ${context.applicant.last_name}`);
  parts.push(`Email: ${context.applicant.email || "Not provided"}`);
  parts.push(`Phone: ${context.applicant.phone || "Not provided"}`);
  parts.push(`Birth Date: ${context.applicant.birth_date || "Not provided"}`);
  parts.push(`Gender: ${context.applicant.gender || "Not provided"}`);
  parts.push(`Address: ${context.applicant.address || "Not provided"}`);

  // Academic Info
  parts.push("\n=== ACADEMIC INFORMATION ===");
  parts.push(`Applying for Grade: ${context.academic.applying_for_grade || "Not specified"}`);
  parts.push(`Previous School: ${context.academic.previous_school || "Not provided"}`);
  parts.push(`Preferred Track: ${context.academic.preferred_track || "Not specified"}`);
  parts.push(`Academic Year: ${context.academic.academic_year || "Not specified"}`);

  // Guardian Info
  parts.push("\n=== GUARDIAN INFORMATION ===");
  parts.push(`Guardian Name: ${context.guardian.name || "Not provided"}`);
  parts.push(`Relationship: ${context.guardian.relationship || "Not provided"}`);
  parts.push(`Guardian Phone: ${context.guardian.phone || "Not provided"}`);
  parts.push(`Guardian Email: ${context.guardian.email || "Not provided"}`);
  parts.push(`Occupation: ${context.guardian.occupation || "Not provided"}`);

  // Documents
  parts.push("\n=== DOCUMENTS SUBMITTED ===");
  parts.push(`Birth Certificate: ${context.documents.birth_certificate ? "Yes" : "No"}`);
  parts.push(`Report Card: ${context.documents.report_card ? "Yes" : "No"}`);
  parts.push(`Good Moral Certificate: ${context.documents.good_moral ? "Yes" : "No"}`);
  parts.push(`ID Photos: ${context.documents.photos ? "Yes" : "No"}`);

  // Additional Info
  parts.push("\n=== ADDITIONAL INFORMATION ===");
  parts.push(`Special Needs: ${context.additional.special_needs || "None reported"}`);
  parts.push(`Medical Conditions: ${context.additional.medical_conditions || "None reported"}`);
  parts.push(`How Heard About Us: ${context.additional.how_heard_about || "Not specified"}`);

  // Status
  parts.push("\n=== APPLICATION STATUS ===");
  parts.push(`Current Status: ${context.status}`);
  parts.push(`Submitted: ${new Date(context.submitted_at).toLocaleDateString()}`);

  parts.push("\n\nPlease analyze this application and provide your screening assessment as JSON.");

  return parts.join("\n");
}
