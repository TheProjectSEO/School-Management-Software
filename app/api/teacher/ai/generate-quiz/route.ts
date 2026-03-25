import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { callOpenAIChatCompletions } from "@/lib/ai/openai";

/**
 * POST /api/teacher/ai/generate-quiz
 * Generate quiz questions from module content using AI
 */
export async function POST(request: NextRequest) {
  const authResult = await requireTeacherAPI();
  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();

    const {
      topic,
      courseName,
      gradeLevel,
      questionCount,
      difficulty,
      questionTypes,
      includeTags,
      moduleTitle,
      moduleDescription,
      moduleLearningObjectives,
      lessonTitle,
      lessonContent,
    } = body;

    // Validate required fields
    if (!topic || !questionCount) {
      return NextResponse.json(
        { error: "Topic and question count are required" },
        { status: 400 }
      );
    }

    const allowedTypes = Array.isArray(questionTypes) && questionTypes.length > 0
      ? questionTypes
      : ["multiple_choice", "true_false", "short_answer"];

    const hasModuleContext = moduleTitle || lessonTitle || lessonContent;

    const systemPrompt = [
      "You are an AI assistant for K-12 STEM teachers.",
      "Return ONLY valid JSON with a top-level key 'questions'. No markdown, no code blocks.",
      "Each question must include: question_text, question_type, points, explanation.",
      "For multiple_choice, include options array with text and isCorrect boolean.",
      "For true_false, include correct_answer as 'true' or 'false' string.",
      "For short_answer, include correct_answer as a short phrase.",
      "Keep explanations concise (1-2 sentences max).",
      hasModuleContext
        ? "Generate questions that are directly based on the provided module/lesson content. Questions must be answerable from that content alone."
        : null,
    ].filter(Boolean).join(" ");

    const userPrompt = [
      `Topic: ${topic}`,
      courseName ? `Course: ${courseName}` : null,
      gradeLevel ? `Grade Level: ${gradeLevel}` : null,
      moduleTitle ? `Module: ${moduleTitle}` : null,
      moduleDescription ? `Module Description: ${moduleDescription}` : null,
      moduleLearningObjectives?.length
        ? `Module Objectives: ${moduleLearningObjectives.join("; ")}` : null,
      lessonTitle ? `Lesson/Topic: ${lessonTitle}` : null,
      lessonContent ? `Lesson Content:\n${lessonContent.slice(0, 3000)}` : null,
      `Question count: ${questionCount}`,
      `Difficulty: ${difficulty || "medium"}`,
      `Allowed types: ${allowedTypes.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Calculate token budget based on question count (approx 200 tokens per question)
    const tokenBudget = Math.max(2000, questionCount * 250);

    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: tokenBudget,
      context: "teacher",
    });

    let content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "AI did not return a response" },
        { status: 500 }
      );
    }

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }

    // Try to find JSON object boundaries
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      content = content.slice(jsonStart, jsonEnd + 1);
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      // If JSON is truncated, try to recover partial questions
      console.error("AI quiz JSON parse error, attempting recovery...");
      try {
        // Find last complete question object
        const lastCompleteQuestion = content.lastIndexOf('},');
        if (lastCompleteQuestion > 0) {
          const partialJson = content.slice(0, lastCompleteQuestion + 1) + ']}';
          parsed = JSON.parse(partialJson);
          console.log(`Recovered ${parsed.questions?.length || 0} questions from truncated response`);
        }
      } catch (recoveryError) {
        console.error("Recovery failed:", recoveryError);
      }
    }

    if (!parsed || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: "AI response was incomplete or invalid. Try reducing the number of questions." },
        { status: 500 }
      );
    }

    if (parsed.questions.length === 0) {
      return NextResponse.json(
        { error: "AI generated 0 questions. Try a different topic or increase the question count." },
        { status: 500 }
      );
    }

    // Warn if we got fewer questions than requested
    if (parsed.questions.length < questionCount) {
      console.warn(`Requested ${questionCount} questions but only got ${parsed.questions.length}`);
    }

    const draftQuestions = parsed.questions.map((q: any, index: number) => ({
      question_text: q.question_text || `Question ${index + 1}`,
      question_type: q.question_type || "multiple_choice",
      points: q.points || 1,
      explanation: q.explanation || "",
      correct_answer: q.correct_answer || null,
      options: Array.isArray(q.options)
        ? q.options.map((opt: any) => ({
            text: opt.text || "Option",
            isCorrect: Boolean(opt.isCorrect),
          }))
        : [],
      tags: includeTags ? ["ai-generated", "draft"] : [],
      difficulty: difficulty || "medium",
    }));

    return NextResponse.json({
      questions: draftQuestions,
      metadata: {
        generatedFrom: "topic",
        questionCount: draftQuestions.length,
        difficulty,
        timestamp: new Date().toISOString(),
      },
      message:
        "Draft questions generated. Review and edit before saving.",
    });
  } catch (error: any) {
    console.error("AI quiz generation error:", error);
    const message = error?.message?.includes("OPENAI_API_KEY")
      ? "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable."
      : "An error occurred while generating the assessment.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
