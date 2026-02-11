import { NextRequest, NextResponse } from "next/server";
import { requireTeacherAPI } from "@/lib/auth/requireTeacherAPI";
import { callOpenAIChatCompletions } from "@/lib/ai/openai";

/**
 * POST /api/teacher/ai/generate-module
 * Generate module content using AI from topics or files
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
      learningObjectives,
      lessonCount,
      durationMinutes,
    } = body;

    // Validate required fields
    if (!topic || !lessonCount) {
      return NextResponse.json(
        { error: "Topic and lesson count are required" },
        { status: 400 }
      );
    }

    const systemPrompt = [
      "You are an AI assistant for K-12 STEM teachers.",
      "Return JSON only with keys: title, description, learning_objectives, lessons.",
      "Each lesson must have title, content, duration_minutes.",
      "Keep language age-appropriate and concise.",
    ].join(" ");

    const userPrompt = [
      `Topic: ${topic}`,
      courseName ? `Course: ${courseName}` : null,
      gradeLevel ? `Grade Level: ${gradeLevel}` : null,
      learningObjectives?.length
        ? `Learning objectives: ${learningObjectives.join("; ")}`
        : null,
      `Lesson count: ${lessonCount}`,
      durationMinutes ? `Target total duration (minutes): ${durationMinutes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Scale token budget: ~350 tokens per lesson + base overhead
    const tokenBudget = Math.max(2000, (lessonCount || 4) * 350 + 400);

    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
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

    // Find JSON object boundaries
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      content = content.slice(jsonStart, jsonEnd + 1);
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      // If JSON is truncated, try to recover partial lessons
      console.error("AI module JSON parse error, attempting recovery...");
      try {
        const lastComplete = content.lastIndexOf('},');
        if (lastComplete > 0) {
          const partialJson = content.slice(0, lastComplete + 1) + ']}';
          parsed = JSON.parse(partialJson);
          console.log(`Recovered ${parsed.lessons?.length || 0} lessons from truncated response`);
        }
      } catch (recoveryError) {
        console.error("Recovery failed:", recoveryError);
      }
    }

    if (!parsed || !parsed.title || !Array.isArray(parsed.lessons)) {
      return NextResponse.json(
        { error: "AI response was incomplete or invalid. Try reducing the number of lessons." },
        { status: 500 }
      );
    }

    const draftModule = {
      title: parsed.title,
      description: parsed.description || "",
      learning_objectives: Array.isArray(parsed.learning_objectives)
        ? parsed.learning_objectives
        : [],
      lessons: parsed.lessons.map((lesson: any, index: number) => ({
        title: lesson.title || `Lesson ${index + 1}`,
        content: lesson.content || "",
        duration_minutes: lesson.duration_minutes || null,
        order: index + 1,
      })),
      metadata: {
        generatedFrom: "topic",
        topic,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json({
      draft: draftModule,
      message: "Draft generated. Review and edit before saving.",
    });
  } catch (error: any) {
    console.error("AI module generation error:", error);
    const message = error?.message?.includes("OPENAI_API_KEY")
      ? "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable."
      : "An error occurred while generating the module.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
