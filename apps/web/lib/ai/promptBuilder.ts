/**
 * Prompt Builder
 * Builds personalized system and user prompts for AI interactions
 */

import type {
  StudentContext,
  QuestionIntent,
  PromptBuilderOptions,
} from "./types";

/**
 * Build personalized system prompt based on student context and intent
 *
 * @param options - Options including context, intent, and optional transcript
 * @returns Complete system prompt string
 */
export function buildPersonalizedPrompt(options: PromptBuilderOptions): string {
  const { context, intent, lessonTranscript } = options;

  const sections: string[] = [
    buildBasePersonality(context),
    buildContextSection(context, intent),
    buildIntentGuidelines(intent),
    buildResponseGuidelines(),
  ];

  // Add transcript section if available
  if (lessonTranscript) {
    sections.push(buildTranscriptSection(lessonTranscript));
  }

  // Add follow-up instructions
  sections.push(buildFollowUpInstructions(intent));

  return sections.join("\n\n");
}

/**
 * Build base personality section
 */
function buildBasePersonality(context: StudentContext): string {
  const { profile } = context;

  return `You are Klase AI, a friendly and supportive AI learning assistant for ${profile.name}${profile.gradeLevel ? ` (Grade ${profile.gradeLevel})` : ""}. You help students with their studies, answer questions about their courses, and provide personalized guidance.

Your personality:
- Friendly, encouraging, and patient
- Clear and concise in explanations
- Supportive without being condescending
- Proactive in offering helpful suggestions
- Culturally aware (this is for Filipino students)

Address the student by their first name (${profile.name.split(" ")[0]}) occasionally to make the conversation feel personal.`;
}

/**
 * Build context section based on student data
 */
function buildContextSection(context: StudentContext, intent: QuestionIntent): string {
  const parts: string[] = ["## Student Context"];

  // Add course information
  if (context.courses.length > 0) {
    parts.push("\n### Enrolled Courses:");
    context.courses.forEach(course => {
      parts.push(`- ${course.name}${course.code ? ` (${course.code})` : ""}: ${course.progressPercent}% complete (${course.completedLessons}/${course.totalLessons} lessons)`);
    });
  }

  // Add upcoming assessments (relevant for schedule, assessment, planning intents)
  if (["schedule", "assessment", "planning", "recommendation"].includes(intent) && context.upcomingAssessments.length > 0) {
    parts.push("\n### Upcoming Assessments:");
    context.upcomingAssessments.slice(0, 5).forEach(assessment => {
      const status = assessment.isOverdue
        ? `OVERDUE by ${Math.abs(assessment.daysUntilDue)} day(s)`
        : assessment.daysUntilDue === 0
        ? "Due TODAY"
        : assessment.daysUntilDue === 1
        ? "Due tomorrow"
        : `Due in ${assessment.daysUntilDue} days`;
      const submissionStatus = assessment.hasSubmission ? " (submitted)" : "";
      parts.push(`- ${assessment.title} (${assessment.type}) in ${assessment.courseName}: ${status}${submissionStatus}`);
    });
  }

  // Add progress summary (relevant for progress, summary, recommendation intents)
  if (["progress", "summary", "recommendation", "grades"].includes(intent)) {
    parts.push("\n### Progress Overview:");
    parts.push(`- Overall progress: ${context.overallProgress.averagePercent}% across ${context.overallProgress.totalCourses} courses`);
    if (context.overallProgress.completedCourses > 0) {
      parts.push(`- Completed courses: ${context.overallProgress.completedCourses}`);
    }
  }

  // Add incomplete modules (relevant for progress, recommendation intents)
  if (["progress", "recommendation", "planning"].includes(intent) && context.incompleteModules.length > 0) {
    parts.push("\n### In-Progress Modules:");
    context.incompleteModules.slice(0, 4).forEach(module => {
      parts.push(`- ${module.title} (${module.courseName}): ${module.progressPercent}% complete, ${module.totalLessons - module.completedLessons} lessons remaining`);
    });
  }

  // Add recommendations
  if (["recommendation", "planning"].includes(intent) && context.recommendations.length > 0) {
    parts.push("\n### Recommendations:");
    context.recommendations.slice(0, 4).forEach(rec => {
      parts.push(`- [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`);
    });
  }

  // Add current lesson context
  if (context.currentLesson && ["lesson", "help"].includes(intent)) {
    parts.push("\n### Current Lesson:");
    parts.push(`- Title: ${context.currentLesson.title}`);
    parts.push(`- Module: ${context.currentLesson.moduleTitle}`);
    parts.push(`- Course: ${context.currentLesson.courseName}`);
    parts.push(`- Type: ${context.currentLesson.contentType}`);
    parts.push(`- Progress: ${context.currentLesson.progressPercent}%${context.currentLesson.completed ? " (completed)" : ""}`);
  }

  // Add notification context
  if (context.notifications.unreadCount > 0) {
    parts.push(`\n### Notifications: ${context.notifications.unreadCount} unread${context.notifications.hasUrgent ? " (including urgent)" : ""}`);
  }

  return parts.join("\n");
}

/**
 * Build intent-specific guidelines
 */
function buildIntentGuidelines(intent: QuestionIntent): string {
  const guidelines: Record<QuestionIntent, string> = {
    grades: `## For Grade Questions
- Provide specific grade information when available
- Explain grade calculations if asked
- Offer encouragement and constructive feedback
- If grades are not visible, explain that grades are released by teachers
- Suggest ways to improve if grades are low`,

    schedule: `## For Schedule Questions
- Be specific about dates and times
- Highlight urgent or upcoming deadlines
- Help prioritize tasks if multiple are due
- Mention any overdue items that need attention`,

    assessment: `## For Assessment Questions
- Provide clear information about assessment requirements
- Explain submission process if asked
- Offer study tips relevant to the assessment type
- Remind about due dates and remaining time`,

    lesson: `## For Lesson Questions
- Use the lesson transcript/content if available to answer questions
- Explain concepts clearly with examples
- Break down complex topics into simpler parts
- Relate concepts to practical applications
- Encourage questions and curiosity`,

    progress: `## For Progress Questions
- Provide specific progress metrics
- Celebrate achievements and completed work
- Identify areas needing attention
- Suggest next steps for improvement`,

    recommendation: `## For Recommendation Requests
- Consider the student's current workload and deadlines
- Prioritize urgent items (overdue, due soon)
- Balance catching up with ongoing work
- Provide specific, actionable recommendations`,

    planning: `## For Study Planning
- Help create realistic study plans
- Consider upcoming assessments and deadlines
- Suggest time allocation based on difficulty
- Include breaks and review sessions
- Be flexible and adaptable to student needs`,

    summary: `## For Summary Requests
- Provide concise but comprehensive summaries
- Highlight key points and main takeaways
- Use bullet points for clarity
- Include both achievements and areas for improvement`,

    help: `## For Help Requests
- Provide clear, step-by-step guidance
- Use simple language
- Anticipate follow-up questions
- Offer multiple ways to accomplish tasks if available`,

    general: `## For General Questions
- Be helpful and conversational
- Steer towards academic topics when relevant
- Offer to help with specific academic needs
- Keep responses focused and useful`,
  };

  return guidelines[intent];
}

/**
 * Build response guidelines section
 */
function buildResponseGuidelines(): string {
  return `## Response Guidelines
- Keep responses concise but complete (2-4 paragraphs max for most questions)
- Use markdown formatting for readability (bullets, bold for emphasis)
- Be encouraging and supportive
- If you don't have specific information, acknowledge it honestly
- Suggest relevant follow-up actions when appropriate
- Use Filipino expressions sparingly if appropriate (e.g., "Kaya mo yan!" for encouragement)
- Never make up specific data (grades, dates, etc.) - only use what's provided in context`;
}

/**
 * Build transcript section
 */
function buildTranscriptSection(transcript: string): string {
  // Truncate if too long
  const maxLength = 6000;
  const truncatedTranscript = transcript.length > maxLength
    ? transcript.substring(0, maxLength) + "...[transcript truncated]"
    : transcript;

  return `## Lesson Video Transcript
The following is the transcript from the lesson video. Use this to answer questions about the lesson content:

"""
${truncatedTranscript}
"""

When answering questions about the lesson, reference specific parts of the transcript when relevant.`;
}

/**
 * Build follow-up instructions
 */
function buildFollowUpInstructions(intent: QuestionIntent): string {
  return `## Follow-up Questions
At the end of your response, include 2-3 suggested follow-up questions that the student might want to ask. Format them as:

---
**Want to explore more?**
1. [First follow-up question]
2. [Second follow-up question]
3. [Third follow-up question]

Make follow-up questions relevant to: ${intent} and the student's context.`;
}

/**
 * Build user prompt with additional context
 *
 * @param message - The user's message
 * @param intent - The classified intent
 * @returns Formatted user prompt
 */
export function buildUserPrompt(message: string, intent: QuestionIntent): string {
  // For most cases, the message itself is sufficient
  // Add intent hint for ambiguous cases
  if (intent === "general") {
    return message;
  }

  return message;
}

/**
 * Generate contextual follow-up questions based on student context and intent
 *
 * @param context - Student context
 * @param intent - Current question intent
 * @returns Array of follow-up question suggestions
 */
export function generateContextualFollowUps(
  context: StudentContext,
  intent: QuestionIntent
): string[] {
  const followUps: string[] = [];

  // Intent-specific follow-ups
  switch (intent) {
    case "grades":
      followUps.push("How can I improve my grades this semester?");
      if (context.courses.length > 0) {
        followUps.push(`What's my progress in ${context.courses[0].name}?`);
      }
      followUps.push("What assessments are coming up?");
      break;

    case "schedule":
      followUps.push("What should I focus on this week?");
      if (context.upcomingAssessments.length > 0) {
        followUps.push(`Tell me more about the ${context.upcomingAssessments[0].title}`);
      }
      followUps.push("Help me plan my study schedule");
      break;

    case "assessment":
      followUps.push("What's the best way to prepare for this?");
      followUps.push("How much time should I spend studying?");
      if (context.upcomingAssessments.length > 1) {
        followUps.push("What other assessments do I have coming up?");
      }
      break;

    case "lesson":
      followUps.push("Can you give me more examples?");
      followUps.push("How does this relate to real life?");
      followUps.push("What should I study next?");
      break;

    case "progress":
      followUps.push("What should I focus on to improve?");
      if (context.incompleteModules.length > 0) {
        followUps.push(`Help me complete ${context.incompleteModules[0].title}`);
      }
      followUps.push("How am I doing compared to my goals?");
      break;

    case "recommendation":
      followUps.push("Create a study plan for this week");
      followUps.push("What's the most important thing to do today?");
      followUps.push("How should I balance my subjects?");
      break;

    case "planning":
      followUps.push("How much time should I spend on each subject?");
      followUps.push("What's the best study routine?");
      followUps.push("Help me prepare for my upcoming exams");
      break;

    case "summary":
      followUps.push("What are my biggest achievements so far?");
      followUps.push("Where do I need to improve?");
      followUps.push("What's my next priority?");
      break;

    case "help":
      followUps.push("How do I track my progress?");
      followUps.push("Where can I find my assignments?");
      followUps.push("How do I contact my teacher?");
      break;

    case "general":
    default:
      followUps.push("What should I study today?");
      if (context.upcomingAssessments.length > 0) {
        followUps.push("What assessments are coming up?");
      }
      followUps.push("Show me my progress overview");
      break;
  }

  // Add context-aware follow-ups
  if (context.upcomingAssessments.some(a => a.isOverdue)) {
    followUps.unshift("Help me catch up on overdue work");
  }

  if (context.notifications.hasUrgent) {
    followUps.push("What urgent notifications do I have?");
  }

  // Return unique follow-ups, limited to 3
  return Array.from(new Set(followUps)).slice(0, 3);
}

/**
 * Build system prompt for specific contexts (utility function)
 *
 * @param context - Student context
 * @returns Basic system prompt without intent-specific guidelines
 */
export function buildSystemPrompt(context: StudentContext): string {
  return buildPersonalizedPrompt({
    context,
    intent: "general",
  });
}
