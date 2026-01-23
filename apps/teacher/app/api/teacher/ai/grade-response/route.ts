import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { callOpenAIChatCompletions } from "@/lib/ai/openai";
import { getQueueItem, getQuestionDetails } from "@/lib/dal/grading-queue";

/**
 * POST /api/teacher/ai/grade-response
 * Generate AI-suggested grading for essay/short answer questions
 *
 * Tables used:
 * - teacher_grading_queue (read): Get item details
 * - teacher_assessment_questions (read): Get question and rubric context
 *
 * Returns AI suggestions - does NOT auto-save. Teacher must review and approve.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { queueItemId } = body;

    if (!queueItemId) {
      return NextResponse.json(
        { success: false, error: "Queue item ID is required" },
        { status: 400 }
      );
    }

    // Fetch the grading queue item with full context
    const queueItem = await getQueueItem(queueItemId);

    if (!queueItem) {
      return NextResponse.json(
        { success: false, error: "Queue item not found" },
        { status: 404 }
      );
    }

    // Only process essay and short_answer types
    if (!["essay", "short_answer"].includes(queueItem.question_type)) {
      return NextResponse.json(
        { success: false, error: "AI grading only available for essay and short answer questions" },
        { status: 400 }
      );
    }

    // Get question details for answer key reference
    const questionDetails = await getQuestionDetails(queueItem.question_id);

    // Build the grading context
    const rubric = queueItem.rubric_json || null;
    const answerKey = questionDetails?.answer_key_json || null;
    const maxPoints = queueItem.max_points;

    // Construct the AI prompt
    const systemPrompt = buildSystemPrompt(maxPoints, rubric);
    const userPrompt = buildUserPrompt({
      questionText: queueItem.question_text || "",
      studentResponse: queueItem.student_response || "",
      maxPoints,
      rubric,
      answerKey,
      assessmentTitle: queueItem.assessment_title,
      courseName: queueItem.course_name,
    });

    // Call OpenAI for grading suggestion
    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent grading
      max_tokens: 1200,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { success: false, error: "AI did not return a response" },
        { status: 500 }
      );
    }

    // Parse the AI response
    let aiGrading;
    try {
      aiGrading = JSON.parse(content);
    } catch {
      // If JSON parsing fails, try to extract from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          aiGrading = JSON.parse(jsonMatch[1]);
        } catch {
          console.error("Failed to parse AI grading response:", content);
          return NextResponse.json(
            { success: false, error: "Failed to parse AI response" },
            { status: 500 }
          );
        }
      } else {
        console.error("AI response not in expected format:", content);
        return NextResponse.json(
          { success: false, error: "AI response format was invalid" },
          { status: 500 }
        );
      }
    }

    // Validate and normalize the response
    const suggestedPoints = Math.min(
      Math.max(0, Number(aiGrading.suggested_points) || 0),
      maxPoints
    );

    return NextResponse.json({
      success: true,
      suggestion: {
        suggested_points: suggestedPoints,
        max_points: maxPoints,
        percentage: Math.round((suggestedPoints / maxPoints) * 100),
        feedback: aiGrading.feedback || "",
        strengths: aiGrading.strengths || [],
        improvements: aiGrading.improvements || [],
        rubric_scores: aiGrading.rubric_scores || null,
        confidence: aiGrading.confidence || "medium",
        reasoning: aiGrading.reasoning || "",
      },
      metadata: {
        question_type: queueItem.question_type,
        generated_at: new Date().toISOString(),
        has_rubric: !!rubric,
        has_answer_key: !!answerKey,
      },
      message: "AI grading suggestion generated. Please review before applying.",
    });
  } catch (error) {
    console.error("AI grading error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during AI grading" },
      { status: 500 }
    );
  }
}

/**
 * Build the system prompt for grading
 */
function buildSystemPrompt(maxPoints: number, rubric: any): string {
  const basePrompt = `You are an expert K-12 teacher assistant helping to grade student responses.
Your task is to evaluate the student's answer and provide:
1. A suggested point score (0 to ${maxPoints})
2. Constructive feedback for the student
3. Specific strengths in the response
4. Areas for improvement

Be fair, constructive, and educational in your feedback. Focus on learning outcomes.

Return your response as valid JSON with this structure:
{
  "suggested_points": <number between 0 and ${maxPoints}>,
  "feedback": "<constructive feedback paragraph for the student>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "confidence": "<high|medium|low>",
  "reasoning": "<brief explanation of your grading decision>"${rubric ? ',\n  "rubric_scores": { "<criterion_name>": <points>, ... }' : ''}
}`;

  if (rubric) {
    const rubricDescription = formatRubricForPrompt(rubric);
    return `${basePrompt}

GRADING RUBRIC:
${rubricDescription}

When grading, evaluate the response against each rubric criterion and include scores in rubric_scores.`;
  }

  return basePrompt;
}

/**
 * Build the user prompt with question and response context
 */
function buildUserPrompt(context: {
  questionText: string;
  studentResponse: string;
  maxPoints: number;
  rubric: any;
  answerKey: any;
  assessmentTitle?: string;
  courseName?: string;
}): string {
  const parts: string[] = [];

  if (context.courseName) {
    parts.push(`Course: ${context.courseName}`);
  }
  if (context.assessmentTitle) {
    parts.push(`Assessment: ${context.assessmentTitle}`);
  }

  parts.push(`\nQUESTION (${context.maxPoints} points):`);
  parts.push(context.questionText);

  if (context.answerKey) {
    const keyText = typeof context.answerKey === 'string'
      ? context.answerKey
      : context.answerKey.correct_text || context.answerKey.expected_answer || JSON.stringify(context.answerKey);
    parts.push(`\nEXPECTED ANSWER/KEY POINTS:`);
    parts.push(keyText);
  }

  parts.push(`\nSTUDENT'S RESPONSE:`);
  parts.push(context.studentResponse || "(No response provided)");

  parts.push(`\nPlease evaluate this response and provide your grading suggestion as JSON.`);

  return parts.join("\n");
}

/**
 * Format rubric for inclusion in the prompt
 */
function formatRubricForPrompt(rubric: any): string {
  if (!rubric) return "";

  // Handle different rubric formats
  if (Array.isArray(rubric.criteria)) {
    return rubric.criteria.map((c: any) =>
      `- ${c.name} (${c.weight || c.points} points): ${c.description || ""}`
    ).join("\n");
  }

  if (Array.isArray(rubric)) {
    return rubric.map((c: any) =>
      `- ${c.name} (${c.points || c.weight} points): ${c.description || ""}`
    ).join("\n");
  }

  // If it's a simple object, try to format it
  if (typeof rubric === 'object') {
    return Object.entries(rubric)
      .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
      .join("\n");
  }

  return String(rubric);
}
