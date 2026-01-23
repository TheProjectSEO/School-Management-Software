import { callOpenAIChatCompletions } from "@/lib/ai/openai";

type SubjectiveQuestion = {
  id: string;
  prompt: string;
  answer: string;
  maxPoints: number;
  type: string;
};

export type DraftAIEvaluation = {
  subjectivePointsAwarded: number;
  feedback: string;
};

export async function generateAiDraftEvaluation(args: {
  assessmentTitle: string;
  courseName?: string | null;
  subjectiveQuestions: SubjectiveQuestion[];
  totalSubjectivePoints: number;
}): Promise<DraftAIEvaluation | null> {
  if (args.subjectiveQuestions.length === 0 || args.totalSubjectivePoints <= 0) {
    return null;
  }

  const questionsBlock = args.subjectiveQuestions
    .map(
      (q, index) =>
        `Q${index + 1} (${q.type}, ${q.maxPoints} pts): ${q.prompt}\nStudent Answer: ${q.answer}`
    )
    .join("\n\n");

  const systemPrompt = [
    "You are a K-12 STEM grading assistant.",
    "Provide a draft evaluation for subjective questions only.",
    "Return JSON with keys: subjective_points_awarded (number), feedback (string).",
    "subjective_points_awarded must be between 0 and the total subjective points.",
    "Do not include any extra text outside the JSON.",
  ].join(" ");

  const userPrompt = [
    `Assessment: ${args.assessmentTitle}`,
    args.courseName ? `Course: ${args.courseName}` : null,
    `Total subjective points: ${args.totalSubjectivePoints}`,
    "Subjective questions and answers:",
    questionsBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const completion = await callOpenAIChatCompletions({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 500,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      subjective_points_awarded?: number;
      feedback?: string;
    };

    if (typeof parsed.subjective_points_awarded !== "number") {
      return null;
    }

    const clamped = Math.max(
      0,
      Math.min(args.totalSubjectivePoints, parsed.subjective_points_awarded)
    );

    return {
      subjectivePointsAwarded: clamped,
      feedback:
        typeof parsed.feedback === "string"
          ? parsed.feedback.slice(0, 2000)
          : "Draft evaluation generated.",
    };
  } catch (error) {
    console.error("AI draft grading failed:", error);
    return null;
  }
}
