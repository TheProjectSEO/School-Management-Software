/**
 * Intent Classifier
 * Classifies user messages into intent categories for contextual AI responses
 */

import type { QuestionIntent, IntentClassification } from "./types";

/**
 * Intent patterns with keywords and phrases
 */
const intentPatterns: Record<QuestionIntent, { keywords: string[]; phrases: string[] }> = {
  grades: {
    keywords: [
      "grade", "grades", "score", "scores", "gpa", "mark", "marks",
      "performance", "result", "results", "rating", "points", "standing",
      "average", "passing", "failing", "fail", "pass", "transmutation",
    ],
    phrases: [
      "how am i doing", "how did i do", "what grade", "my grades",
      "check my grade", "show my grades", "academic performance",
      "am i passing", "am i failing", "my score", "my scores",
      "what is my grade", "what are my grades", "grade in",
    ],
  },
  schedule: {
    keywords: [
      "schedule", "calendar", "when", "date", "dates", "time", "times",
      "deadline", "deadlines", "timetable", "class", "classes",
      "today", "tomorrow", "week", "month", "upcoming", "next",
    ],
    phrases: [
      "when is", "what time", "due date", "due dates", "what's next",
      "my schedule", "class schedule", "when do i have", "coming up",
      "what's coming", "this week", "next week", "today's schedule",
    ],
  },
  assessment: {
    keywords: [
      "quiz", "quizzes", "exam", "exams", "test", "tests", "assignment",
      "assignments", "homework", "project", "projects", "task", "tasks",
      "submission", "submit", "attempt", "take", "answer", "question",
    ],
    phrases: [
      "take a quiz", "start the quiz", "my assignments", "pending assignments",
      "upcoming quiz", "upcoming exam", "do i have any", "assessment",
      "what assessments", "any homework", "submit my", "how to submit",
    ],
  },
  lesson: {
    keywords: [
      "lesson", "lessons", "video", "content", "material", "topic",
      "concept", "explain", "understand", "learn", "learning", "teach",
      "meaning", "definition", "example", "examples", "tutorial",
    ],
    phrases: [
      "explain this", "what does this mean", "help me understand",
      "in the video", "from the lesson", "current lesson", "this topic",
      "can you explain", "what is", "how does", "why does", "tell me about",
      "more about", "in the lecture", "the transcript",
    ],
  },
  progress: {
    keywords: [
      "progress", "completion", "complete", "completed", "finish", "finished",
      "done", "remaining", "left", "status", "track", "tracking", "overview",
    ],
    phrases: [
      "my progress", "how much have i", "what have i completed",
      "how far", "am i done", "remaining lessons", "left to finish",
      "track my progress", "progress report", "where am i",
    ],
  },
  recommendation: {
    keywords: [
      "recommend", "recommendation", "recommendations", "suggest", "suggestion",
      "suggestions", "should", "advice", "tips", "focus", "priority",
      "important", "start", "begin", "best", "optimal",
    ],
    phrases: [
      "what should i", "where should i", "what do you recommend",
      "can you suggest", "what's important", "what to focus on",
      "help me decide", "give me advice", "study tips", "what next",
      "prioritize", "start with",
    ],
  },
  planning: {
    keywords: [
      "plan", "planning", "study", "studying", "prepare", "preparation",
      "review", "organize", "manage", "time", "strategy", "strategies",
      "routine", "habit", "effective", "efficient",
    ],
    phrases: [
      "study plan", "help me plan", "how to study", "prepare for",
      "study schedule", "time management", "organize my", "study tips",
      "effective studying", "how should i prepare", "review plan",
    ],
  },
  summary: {
    keywords: [
      "summary", "summarize", "overview", "brief", "briefly", "recap",
      "review", "highlight", "highlights", "main", "key", "important",
      "essence", "gist", "outline",
    ],
    phrases: [
      "give me a summary", "summarize", "in summary", "brief overview",
      "main points", "key takeaways", "can you recap", "quick summary",
      "what's the gist", "outline of", "high level",
    ],
  },
  help: {
    keywords: [
      "help", "how", "guide", "navigate", "find", "where", "show",
      "tutorial", "instructions", "use", "using", "access", "feature",
      "button", "click", "menu",
    ],
    phrases: [
      "how do i", "how can i", "help me", "where can i find",
      "show me how", "guide me", "i need help", "i'm stuck",
      "how to use", "where is", "can you help", "i don't know how",
    ],
  },
  general: {
    keywords: [],
    phrases: [],
  },
};

/**
 * Classify user message intent
 *
 * @param message - The user's message
 * @returns Intent classification with confidence score
 */
export function classifyIntent(message: string): IntentClassification {
  const normalizedMessage = message.toLowerCase().trim();

  // Score each intent
  const scores: { intent: QuestionIntent; score: number; matchedKeywords: string[] }[] = [];

  for (const [intent, patterns] of Object.entries(intentPatterns) as [QuestionIntent, { keywords: string[]; phrases: string[] }][]) {
    if (intent === "general") continue; // Skip general, it's the fallback

    let score = 0;
    const matchedKeywords: string[] = [];

    // Check keywords (1 point each)
    for (const keyword of patterns.keywords) {
      if (normalizedMessage.includes(keyword)) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }

    // Check phrases (2 points each, more specific)
    for (const phrase of patterns.phrases) {
      if (normalizedMessage.includes(phrase)) {
        score += 2;
        matchedKeywords.push(phrase);
      }
    }

    if (score > 0) {
      scores.push({ intent, score, matchedKeywords });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // If no matches, return general
  if (scores.length === 0) {
    return {
      intent: "general",
      confidence: 0.3,
      keywords: [],
    };
  }

  // Calculate confidence based on score and separation from next intent
  const topScore = scores[0];
  const secondScore = scores[1]?.score || 0;
  const scoreDiff = topScore.score - secondScore;

  // Base confidence on absolute score and relative difference
  let confidence = Math.min(0.95, 0.5 + (topScore.score * 0.1) + (scoreDiff * 0.05));

  // Boost confidence if multiple keywords matched
  if (topScore.matchedKeywords.length >= 3) {
    confidence = Math.min(0.95, confidence + 0.1);
  }

  return {
    intent: topScore.intent,
    confidence,
    keywords: topScore.matchedKeywords,
  };
}

/**
 * Get human-readable intent description
 *
 * @param intent - The classified intent
 * @returns Human-readable description
 */
export function getIntentDescription(intent: QuestionIntent): string {
  const descriptions: Record<QuestionIntent, string> = {
    grades: "Question about grades and academic performance",
    schedule: "Question about schedule, dates, or deadlines",
    assessment: "Question about quizzes, exams, or assignments",
    lesson: "Question about lesson content or concepts",
    progress: "Question about learning progress",
    recommendation: "Request for study recommendations",
    planning: "Request for study planning help",
    summary: "Request for summary or overview",
    help: "Request for help or navigation assistance",
    general: "General question or conversation",
  };

  return descriptions[intent];
}

/**
 * Check if intent requires specific context
 *
 * @param intent - The classified intent
 * @returns Object indicating what context is needed
 */
export function getRequiredContext(intent: QuestionIntent): {
  needsGrades: boolean;
  needsSchedule: boolean;
  needsAssessments: boolean;
  needsProgress: boolean;
  needsLesson: boolean;
} {
  return {
    needsGrades: ["grades", "progress", "summary"].includes(intent),
    needsSchedule: ["schedule", "planning", "assessment"].includes(intent),
    needsAssessments: ["assessment", "schedule", "recommendation", "planning"].includes(intent),
    needsProgress: ["progress", "recommendation", "summary", "planning"].includes(intent),
    needsLesson: ["lesson"].includes(intent),
  };
}
