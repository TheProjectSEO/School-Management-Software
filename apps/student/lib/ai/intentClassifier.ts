import { QuestionIntent, IntentClassification } from "./types";

// Intent keyword mappings with weights
const intentPatterns: Record<QuestionIntent, { keywords: string[]; phrases: string[] }> = {
  progress: {
    keywords: [
      "progress", "doing", "performance", "grades", "status", "completion",
      "percentage", "complete", "finished", "done", "standing", "track"
    ],
    phrases: [
      "how am i doing", "my progress", "course progress", "how far",
      "my courses", "my grades", "am i on track", "my performance",
      "how much have i", "what's my progress", "show my progress"
    ],
  },
  schedule: {
    keywords: [
      "due", "deadline", "upcoming", "exam", "quiz", "test", "when",
      "schedule", "calendar", "date", "tomorrow", "today", "week", "soon"
    ],
    phrases: [
      "what's due", "upcoming exams", "when is", "any deadlines",
      "what exams", "tests coming up", "schedule this week",
      "due this week", "due dates", "next exam", "next quiz",
      "what do i have coming up", "any assessments"
    ],
  },
  recommendation: {
    keywords: [
      "should", "recommend", "suggest", "next", "priority", "focus",
      "start", "study", "improve", "better", "advice", "tip"
    ],
    phrases: [
      "what should i", "study next", "recommend me", "what to study",
      "where should i", "suggest a", "what's next", "priority",
      "focus on", "how to improve", "what do you recommend",
      "help me decide", "what would you suggest"
    ],
  },
  summary: {
    keywords: [
      "summarize", "summary", "overview", "brief", "update", "recap",
      "notifications", "announcements", "news", "new"
    ],
    phrases: [
      "summarize my", "give me a summary", "quick overview",
      "what's new", "any notifications", "any announcements",
      "update me", "brief me", "what did i miss", "catch me up",
      "summary of", "overview of my"
    ],
  },
  assessment: {
    keywords: [
      "score", "scored", "result", "results", "grade", "graded",
      "feedback", "marks", "points", "quiz", "test", "exam", "assignment"
    ],
    phrases: [
      "how did i do", "my score", "quiz result", "test result",
      "my grades", "assignment feedback", "exam score", "did i pass",
      "what did i get", "my results", "assessment results"
    ],
  },
  personal: {
    keywords: [
      "my notes", "notes", "strengths", "weaknesses", "weak", "strong",
      "profile", "about me", "history", "activity", "downloads"
    ],
    phrases: [
      "my notes on", "show my notes", "my strengths", "my weaknesses",
      "what am i good at", "where do i struggle", "my learning history",
      "my profile", "about me", "my activity", "my downloads"
    ],
  },
  planning: {
    keywords: [
      "plan", "schedule", "organize", "manage", "time", "prepare",
      "strategy", "approach", "routine", "weekly", "daily"
    ],
    phrases: [
      "plan my", "study plan", "create a plan", "help me plan",
      "how should i prepare", "study schedule", "weekly plan",
      "organize my", "time management", "study strategy",
      "how to prepare for"
    ],
  },
  lesson: {
    keywords: [
      "explain", "what is", "how does", "define", "meaning", "concept",
      "understand", "clarify", "example", "examples", "tell me about",
      "teach", "learn", "topic", "subject"
    ],
    phrases: [
      "explain this", "what is a", "how does", "can you explain",
      "help me understand", "give me an example", "what does",
      "tell me about", "teach me", "i don't understand",
      "clarify", "what are the", "how do i"
    ],
  },
  general: {
    keywords: [],
    phrases: [],
  },
};

// Greetings that should be handled specially
const greetingPatterns = [
  "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
  "what's up", "how are you", "greetings"
];

export function classifyIntent(question: string): IntentClassification {
  const normalizedQuestion = question.toLowerCase().trim();

  // Check for greetings first - route to general with personal touch
  for (const greeting of greetingPatterns) {
    if (normalizedQuestion.startsWith(greeting) || normalizedQuestion === greeting) {
      return {
        intent: "general",
        confidence: 0.9,
        keywords: [greeting],
      };
    }
  }

  // Score each intent
  const scores: Record<QuestionIntent, { score: number; matches: string[] }> = {
    progress: { score: 0, matches: [] },
    schedule: { score: 0, matches: [] },
    recommendation: { score: 0, matches: [] },
    summary: { score: 0, matches: [] },
    assessment: { score: 0, matches: [] },
    personal: { score: 0, matches: [] },
    planning: { score: 0, matches: [] },
    lesson: { score: 0, matches: [] },
    general: { score: 0, matches: [] },
  };

  // Score based on phrase matches (higher weight)
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    for (const phrase of patterns.phrases) {
      if (normalizedQuestion.includes(phrase)) {
        scores[intent as QuestionIntent].score += 3;
        scores[intent as QuestionIntent].matches.push(phrase);
      }
    }
  }

  // Score based on keyword matches
  const words = normalizedQuestion.split(/\s+/);
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    for (const keyword of patterns.keywords) {
      if (words.some((word) => word.includes(keyword) || keyword.includes(word))) {
        scores[intent as QuestionIntent].score += 1;
        if (!scores[intent as QuestionIntent].matches.includes(keyword)) {
          scores[intent as QuestionIntent].matches.push(keyword);
        }
      }
    }
  }

  // Find the highest scoring intent
  let highestScore = 0;
  let bestIntent: QuestionIntent = "lesson"; // Default to lesson for educational questions
  let bestMatches: string[] = [];

  for (const [intent, data] of Object.entries(scores)) {
    if (data.score > highestScore) {
      highestScore = data.score;
      bestIntent = intent as QuestionIntent;
      bestMatches = data.matches;
    }
  }

  // Calculate confidence
  const maxPossibleScore = 10; // Rough estimate
  const confidence = Math.min(highestScore / maxPossibleScore, 1);

  // If confidence is too low, default to lesson or general
  if (confidence < 0.2) {
    // Check if it seems like a question about the lesson content
    const isLikelyLessonQuestion =
      normalizedQuestion.includes("?") ||
      normalizedQuestion.startsWith("what") ||
      normalizedQuestion.startsWith("how") ||
      normalizedQuestion.startsWith("why") ||
      normalizedQuestion.startsWith("can you") ||
      normalizedQuestion.startsWith("explain");

    return {
      intent: isLikelyLessonQuestion ? "lesson" : "general",
      confidence: 0.5,
      keywords: [],
    };
  }

  return {
    intent: bestIntent,
    confidence,
    keywords: bestMatches,
  };
}

// Helper to determine which context data is needed based on intent
export function getRequiredContextForIntent(intent: QuestionIntent): {
  needsProfile: boolean;
  needsCourses: boolean;
  needsModules: boolean;
  needsAssessments: boolean;
  needsSubmissions: boolean;
  needsNotifications: boolean;
  needsStats: boolean;
  needsRecommendations: boolean;
  needsLesson: boolean;
} {
  const baseContext = {
    needsProfile: true, // Always include profile for personalization
    needsCourses: false,
    needsModules: false,
    needsAssessments: false,
    needsSubmissions: false,
    needsNotifications: false,
    needsStats: false,
    needsRecommendations: false,
    needsLesson: false,
  };

  switch (intent) {
    case "progress":
      return {
        ...baseContext,
        needsCourses: true,
        needsModules: true,
        needsStats: true,
      };
    case "schedule":
      return {
        ...baseContext,
        needsAssessments: true,
        needsNotifications: true,
      };
    case "recommendation":
      return {
        ...baseContext,
        needsCourses: true,
        needsModules: true,
        needsAssessments: true,
        needsStats: true,
        needsRecommendations: true,
      };
    case "summary":
      return {
        ...baseContext,
        needsCourses: true,
        needsAssessments: true,
        needsNotifications: true,
        needsStats: true,
      };
    case "assessment":
      return {
        ...baseContext,
        needsAssessments: true,
        needsSubmissions: true,
      };
    case "personal":
      return {
        ...baseContext,
        needsCourses: true,
        needsStats: true,
      };
    case "planning":
      return {
        ...baseContext,
        needsCourses: true,
        needsModules: true,
        needsAssessments: true,
        needsStats: true,
        needsRecommendations: true,
      };
    case "lesson":
      return {
        ...baseContext,
        needsLesson: true,
        needsCourses: true,
      };
    case "general":
    default:
      return {
        ...baseContext,
        needsCourses: true,
        needsStats: true,
        needsNotifications: true,
      };
  }
}
