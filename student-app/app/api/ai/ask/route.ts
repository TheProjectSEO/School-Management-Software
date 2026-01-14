import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { YoutubeTranscript } from "youtube-transcript";
import { getStudentContext } from "@/lib/ai/studentContext";
import { classifyIntent } from "@/lib/ai/intentClassifier";
import { buildPersonalizedPrompt, generateContextualFollowUps } from "@/lib/ai/promptBuilder";
import { QuestionIntent, ActionCards, ActionCardItem, StudentContext } from "@/lib/ai/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Cache for transcripts to avoid re-fetching
const transcriptCache = new Map<string, string>();

// Extract YouTube video ID from URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch YouTube transcript
async function getYouTubeTranscript(videoUrl: string): Promise<string | null> {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return null;

    // Check cache
    if (transcriptCache.has(videoId)) {
      return transcriptCache.get(videoId)!;
    }

    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = transcriptItems
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Cache the transcript (limit to 10000 chars to save memory)
    const truncatedTranscript = transcript.slice(0, 10000);
    transcriptCache.set(videoId, truncatedTranscript);

    return truncatedTranscript;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return null;
  }
}

// Get YouTube thumbnail URL
function getYouTubeThumbnail(videoUrl: string): string | null {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Format due date for display
function formatDueDate(daysUntilDue: number, isOverdue: boolean): string {
  if (isOverdue) {
    return `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? "s" : ""} overdue`;
  }
  if (daysUntilDue === 0) return "Due today";
  if (daysUntilDue === 1) return "Due tomorrow";
  if (daysUntilDue <= 7) return `Due in ${daysUntilDue} days`;
  return `Due in ${Math.ceil(daysUntilDue / 7)} week${Math.ceil(daysUntilDue / 7) !== 1 ? "s" : ""}`;
}

// Get badge color based on urgency
function getAssessmentBadgeColor(daysUntilDue: number, isOverdue: boolean): "red" | "orange" | "green" | "blue" {
  if (isOverdue) return "red";
  if (daysUntilDue <= 1) return "red";
  if (daysUntilDue <= 3) return "orange";
  if (daysUntilDue <= 7) return "blue";
  return "green";
}

// Get assessment type icon
function getAssessmentIcon(type: string): string {
  switch (type) {
    case "quiz": return "quiz";
    case "exam": return "assignment_late";
    case "assignment": return "assignment";
    case "project": return "folder_special";
    default: return "assignment";
  }
}

// Generate action cards based on intent and context
function generateActionCards(
  intent: QuestionIntent,
  context: StudentContext
): ActionCards | undefined {
  const { upcomingAssessments, incompleteModules, courses, recommendations } = context;

  // For schedule/assessment intents, show assessment cards
  if (intent === "schedule" || intent === "assessment") {
    if (upcomingAssessments.length === 0) return undefined;

    const items: ActionCardItem[] = upcomingAssessments.slice(0, 5).map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      subtitle: assessment.courseName,
      badge: assessment.type.toUpperCase(),
      badgeColor: getAssessmentBadgeColor(assessment.daysUntilDue, assessment.isOverdue),
      link: `/assessments/${assessment.id}`,
      icon: getAssessmentIcon(assessment.type),
      meta: formatDueDate(assessment.daysUntilDue, assessment.isOverdue),
    }));

    return {
      type: "assessment",
      items,
      title: "Your Assessments",
    };
  }

  // For progress/recommendation intents, show module cards
  if (intent === "progress" || intent === "recommendation") {
    // First try to show recommendations if available
    if (recommendations.length > 0) {
      const items: ActionCardItem[] = recommendations.slice(0, 4).map((rec) => {
        // Determine the link based on recommendation type
        let link = `/subjects/${rec.courseId}`;
        if (rec.moduleId) {
          link = `/subjects/${rec.courseId}/modules/${rec.moduleId}`;
        }
        if (rec.assessmentId) {
          link = `/assessments/${rec.assessmentId}`;
        }

        // Determine badge based on priority
        const badgeColor: "red" | "orange" | "green" = rec.priority === "high" ? "red" : rec.priority === "medium" ? "orange" : "green";

        return {
          id: rec.moduleId || rec.assessmentId || rec.courseId,
          title: rec.title,
          subtitle: rec.courseName,
          badge: rec.priority.toUpperCase(),
          badgeColor,
          link,
          icon: rec.type === "assessment" ? "assignment" : rec.type === "review" ? "rate_review" : "menu_book",
          meta: rec.description,
        };
      });

      return {
        type: "module",
        items,
        title: "Recommended Actions",
      };
    }

    // Fall back to incomplete modules
    if (incompleteModules.length > 0) {
      const items: ActionCardItem[] = incompleteModules.slice(0, 4).map((module) => ({
        id: module.id,
        title: module.title,
        subtitle: module.courseName,
        badge: `${module.progressPercent}%`,
        badgeColor: module.progressPercent >= 50 ? "blue" : module.progressPercent > 0 ? "orange" : "purple",
        link: `/subjects/${module.courseId}/modules/${module.id}`,
        icon: "menu_book",
        meta: `${module.totalLessons - module.completedLessons} lessons remaining`,
      }));

      return {
        type: "module",
        items,
        title: "Continue Learning",
      };
    }
  }

  // For planning intent, show a mix of assessments and modules
  if (intent === "planning") {
    const items: ActionCardItem[] = [];

    // Add upcoming assessments first
    upcomingAssessments.slice(0, 2).forEach((assessment) => {
      items.push({
        id: assessment.id,
        title: assessment.title,
        subtitle: assessment.courseName,
        badge: assessment.type.toUpperCase(),
        badgeColor: getAssessmentBadgeColor(assessment.daysUntilDue, assessment.isOverdue),
        link: `/assessments/${assessment.id}`,
        icon: getAssessmentIcon(assessment.type),
        meta: formatDueDate(assessment.daysUntilDue, assessment.isOverdue),
      });
    });

    // Add in-progress modules
    incompleteModules
      .filter((m) => m.progressPercent > 0)
      .slice(0, 2)
      .forEach((module) => {
        items.push({
          id: module.id,
          title: module.title,
          subtitle: module.courseName,
          badge: `${module.progressPercent}%`,
          badgeColor: "blue",
          link: `/subjects/${module.courseId}/modules/${module.id}`,
          icon: "menu_book",
          meta: `${module.totalLessons - module.completedLessons} lessons left`,
        });
      });

    if (items.length === 0) return undefined;

    return {
      type: "module",
      items,
      title: "Study Plan Items",
    };
  }

  // For summary intent, show courses
  if (intent === "summary" && courses.length > 0) {
    const items: ActionCardItem[] = courses.slice(0, 4).map((course) => ({
      id: course.id,
      title: course.name,
      subtitle: course.code || undefined,
      badge: `${course.progressPercent}%`,
      badgeColor: course.progressPercent >= 80 ? "green" : course.progressPercent >= 50 ? "blue" : "orange",
      link: `/subjects/${course.id}`,
      icon: "school",
      meta: `${course.completedLessons}/${course.totalLessons} lessons`,
    }));

    return {
      type: "course",
      items,
      title: "Your Courses",
    };
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, lessonId, courseId, conversationHistory } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    // Get student ID
    const { data: profile } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .single();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Classify the question intent
    const intentClassification = classifyIntent(question);
    const intent: QuestionIntent = intentClassification.intent;

    // Fetch comprehensive student context
    const studentContext = await getStudentContext(supabase, student.id, {
      includeLesson: lessonId && courseId ? { lessonId, courseId } : undefined,
    });

    // Fetch video transcript if lesson has a video
    let videoTranscript: string | null = null;
    let videoThumbnail: string | null = null;

    if (lessonId) {
      const { data: lesson } = await supabase
        .from("lessons")
        .select("video_url")
        .eq("id", lessonId)
        .single();

      if (lesson?.video_url) {
        videoThumbnail = getYouTubeThumbnail(lesson.video_url);

        // Only fetch transcript for lesson-related queries or if explicitly about video
        if (intent === "lesson" || question.toLowerCase().includes("video")) {
          videoTranscript = await getYouTubeTranscript(lesson.video_url);
        }
      }
    }

    // Build the personalized system prompt
    const systemPrompt = buildPersonalizedPrompt({
      context: studentContext,
      intent,
      lessonTranscript: videoTranscript || undefined,
    });

    // Build conversation messages for context
    const conversationMessages: { role: "user" | "assistant"; content: string }[] = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.slice(-4).forEach((msg: { role: string; content: string }) => {
        if (msg.role === "user" || msg.role === "assistant") {
          conversationMessages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        }
      });
    }

    // Build messages array
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...conversationMessages,
      { role: "user", content: question },
    ];

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2048,
    });

    const fullAnswer = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // Parse the response to extract follow-up questions
    let answer = fullAnswer;
    let followUpQuestions: string[] = [];

    // Try to extract follow-up questions from the response
    const followUpPatterns = [
      /---\s*\n\*\*Want to explore more\?\*\*\s*\n([\s\S]*?)$/,
      /---\s*\n\*\*Want to learn more\?\*\*\s*\n([\s\S]*?)$/,
      /---\s*\n\*\*Continue exploring:\*\*\s*\n([\s\S]*?)$/,
    ];

    for (const pattern of followUpPatterns) {
      const match = fullAnswer.match(pattern);
      if (match) {
        answer = fullAnswer.replace(match[0], "").trim();
        const questionsText = match[1];
        const questionMatches = questionsText.match(/\d+\.\s*(.+)/g);
        if (questionMatches) {
          followUpQuestions = questionMatches.map((q) =>
            q.replace(/^\d+\.\s*/, "").replace(/^\[|\]$/g, "").trim()
          );
        }
        break;
      }
    }

    // If no follow-ups were found in the response, generate contextual ones
    if (followUpQuestions.length === 0) {
      followUpQuestions = generateContextualFollowUps(studentContext, intent);
    }

    // Determine which context was used
    const contextUsed: string[] = ["profile"];
    if (studentContext.courses.length > 0) contextUsed.push("courses");
    if (studentContext.upcomingAssessments.length > 0) contextUsed.push("assessments");
    if (studentContext.notifications.unreadCount > 0) contextUsed.push("notifications");
    if (videoTranscript) contextUsed.push("transcript");

    // Generate action cards based on intent
    const actionCards = generateActionCards(intent, studentContext);

    return NextResponse.json({
      answer,
      followUpQuestions,
      intent,
      contextUsed,
      actionCards,
      videoThumbnail,
      videoTitle: studentContext.currentLesson?.title,
      hasTranscript: !!videoTranscript,
      studentName: studentContext.profile.name,
      model: "llama-3.3-70b-versatile",
    });
  } catch (error) {
    console.error("AI Ask error:", error);
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
