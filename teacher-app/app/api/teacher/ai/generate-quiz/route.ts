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

    const systemPrompt = [
      "You are an AI assistant for K-12 STEM teachers.",
      "Return JSON only with a top-level key 'questions'.",
      "Each question must include: question_text, question_type, points, explanation.",
      "For multiple_choice, include options with text and isCorrect.",
      "For true_false, include correct_answer as 'true' or 'false'.",
      "For short_answer, include correct_answer as a short phrase.",
    ].join(" ");

    const userPrompt = [
      `Topic: ${topic}`,
      courseName ? `Course: ${courseName}` : null,
      gradeLevel ? `Grade Level: ${gradeLevel}` : null,
      `Question count: ${questionCount}`,
      `Difficulty: ${difficulty || "medium"}`,
      `Allowed types: ${allowedTypes.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1600,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "AI did not return a response" },
        { status: 500 }
      );
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error("AI quiz JSON parse error:", error, content);
    }

    if (!parsed || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: "AI response format was invalid" },
        { status: 500 }
      );
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
  } catch (error) {
    console.error("AI quiz generation error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
