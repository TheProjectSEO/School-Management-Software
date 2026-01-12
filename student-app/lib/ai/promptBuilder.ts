import { StudentContext, QuestionIntent } from "./types";
import { getRequiredContextForIntent } from "./intentClassifier";

interface PromptBuilderOptions {
  context: StudentContext;
  intent: QuestionIntent;
  lessonTranscript?: string;
  additionalContext?: string;
}

export function buildPersonalizedPrompt(options: PromptBuilderOptions): string {
  const { context, intent, lessonTranscript, additionalContext } = options;
  const { profile, courses, incompleteModules, upcomingAssessments, recentSubmissions, notifications, stats, recommendations, currentLesson } = context;

  const requirements = getRequiredContextForIntent(intent);

  // Build the prompt sections
  const sections: string[] = [];

  // Header - Always include with complete data access instructions
  sections.push(`You are ${profile.name}'s personal AI learning assistant at ${profile.schoolName}.
You know this student well and are here to help them succeed academically.

CRITICAL INSTRUCTIONS:
1. Be CONCISE and action-oriented. Get straight to the point.
2. DO NOT repeat obvious information the student already knows (like "You are a student of X course").
3. DO NOT include lengthy introductions or explanations of your capabilities.
4. When listing items (assessments, modules, courses), just mention them BRIEFLY by name since we display interactive cards for them.
5. Focus on ANSWERING the question directly with actionable insights.
6. Use short, scannable bullet points rather than long paragraphs.
7. Always be encouraging but keep praise brief.

DATA ACCESS NOTICE:
- You have COMPLETE access to this student's identity, enrollment, and academic data.
- ALWAYS answer questions about student IDs, enrollment numbers, section info, and personal data DIRECTLY.
- NEVER say "I don't have that information" or "not explicitly mentioned" for data provided in STUDENT IDENTITY below.
- If a student asks "What is my student ID?" - give the exact ID from the data.
- If a student asks "What is my LRN/student number?" - give the exact LRN if available, or clarify if not set.
- If a student asks "What section am I in?" - give the exact section name and ID.
- If a student asks "What courses am I enrolled in?" - list all enrolled courses with their IDs.`);

  // Student Identity section - ALWAYS include with complete data
  const formatDate = (date: Date | null) => date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not available';

  sections.push(`
=== STUDENT IDENTITY (COMPLETE DATA - ALWAYS USE FOR IDENTITY QUESTIONS) ===
-- Primary Identifiers --
Student ID (UUID): ${profile.studentId}
LRN/Student Number: ${profile.lrn || 'Not assigned'}
Profile ID: ${profile.profileId || 'Not available'}

-- Personal Information --
Full Name: ${profile.name}
Email: ${profile.email || 'Not available'}
Phone: ${profile.phone || 'Not available'}

-- Academic Information --
School: ${profile.schoolName}${profile.schoolId ? ` (ID: ${profile.schoolId})` : ''}
Grade Level: ${profile.gradeLevel || 'Not specified'}
Section: ${profile.section || 'Not assigned'}${profile.sectionId ? ` (ID: ${profile.sectionId})` : ''}

-- Enrollment Information --
Number of Enrollments: ${profile.enrollmentIds.length}
${profile.enrollmentIds.length > 0 ? `Enrollment IDs: ${profile.enrollmentIds.join(', ')}` : 'No enrollments found'}
${profile.enrolledCourseIds.length > 0 ? `Enrolled Course IDs: ${profile.enrolledCourseIds.join(', ')}` : 'No courses enrolled'}
First Enrollment Date: ${formatDate(profile.enrollmentDate)}

-- Account Information --
Account Created: ${formatDate(profile.accountCreatedAt)}`);

  // Stats section
  if (requirements.needsStats) {
    sections.push(`
=== LEARNING STATISTICS ===
Overall Progress: ${stats.overallProgress}%
Courses Enrolled: ${stats.coursesEnrolled}
Lessons Completed: ${stats.lessonsCompleted}/${stats.totalLessons}
${stats.averageScore !== null ? `Average Assessment Score: ${stats.averageScore}%` : ""}
Pending Assessments: ${stats.assessmentsPending}
Notes Created: ${stats.notesCount}
Downloads: ${stats.downloadsCount}`);
  }

  // Courses section - include IDs for reference
  if (requirements.needsCourses && courses.length > 0) {
    const coursesList = courses
      .map((c) => {
        const statusEmoji = c.progressPercent >= 80 ? "🟢" : c.progressPercent >= 50 ? "🟡" : "🔴";
        return `• ${c.name}${c.code ? ` (${c.code})` : ""} [Course ID: ${c.id}]: ${c.progressPercent}% complete ${statusEmoji}
    - Modules: ${c.completedModules}/${c.totalModules} completed
    - Lessons: ${c.completedLessons}/${c.totalLessons} completed`;
      })
      .join("\n");

    sections.push(`
=== ENROLLED COURSES (with IDs) ===
Total Enrolled: ${courses.length}
${coursesList}`);
  }

  // Incomplete modules section - include IDs for reference
  if (requirements.needsModules && incompleteModules.length > 0) {
    const modulesList = incompleteModules
      .slice(0, 8)
      .map((m) => {
        const status = m.progressPercent > 0 ? "In Progress" : "Not Started";
        return `• ${m.title} (${m.courseName}) [Module ID: ${m.id}]
    - Progress: ${m.progressPercent}% - ${status}
    - Remaining: ${m.totalLessons - m.completedLessons} lessons`;
      })
      .join("\n");

    sections.push(`
=== MODULES TO COMPLETE (with IDs) ===
${modulesList}`);
  }

  // Upcoming assessments section - include IDs for reference
  if (requirements.needsAssessments && upcomingAssessments.length > 0) {
    const assessmentsList = upcomingAssessments
      .slice(0, 6)
      .map((a) => {
        const urgencyEmoji = a.isOverdue ? "🔴 OVERDUE" : a.daysUntilDue <= 3 ? "🟠 URGENT" : "🟢";
        const dueText = a.isOverdue
          ? `${Math.abs(a.daysUntilDue)} days overdue`
          : a.daysUntilDue === 0
          ? "Due TODAY"
          : a.daysUntilDue === 1
          ? "Due TOMORROW"
          : `Due in ${a.daysUntilDue} days`;
        return `• ${a.title} (${a.type}) - ${a.courseName} [Assessment ID: ${a.id}]
    - ${dueText} ${urgencyEmoji}
    - Worth: ${a.totalPoints} points`;
      })
      .join("\n");

    sections.push(`
=== UPCOMING ASSESSMENTS (with IDs) ===
Total Upcoming: ${upcomingAssessments.length}
${assessmentsList}`);
  }

  // Recent submissions section - include IDs for reference
  if (requirements.needsSubmissions && recentSubmissions.length > 0) {
    const submissionsList = recentSubmissions
      .slice(0, 5)
      .map((s) => {
        const scoreText = s.percentScore !== null
          ? `${s.score}/${s.totalPoints} (${s.percentScore}%)`
          : s.status === "pending"
          ? "Pending"
          : "Submitted";
        const statusEmoji = s.percentScore !== null
          ? s.percentScore >= 80 ? "🌟" : s.percentScore >= 60 ? "✓" : "📚"
          : "⏳";
        return `• ${s.assessmentTitle} (${s.courseName}) [Submission ID: ${s.id}]: ${scoreText} ${statusEmoji}
    ${s.feedback ? `  Feedback: "${s.feedback.slice(0, 100)}${s.feedback.length > 100 ? "..." : ""}"` : ""}`;
      })
      .join("\n");

    sections.push(`
=== RECENT ASSESSMENT RESULTS (with IDs) ===
${submissionsList}`);
  }

  // Notifications section - include IDs for reference
  if (requirements.needsNotifications) {
    sections.push(`
=== NOTIFICATIONS (with IDs) ===
Unread: ${notifications.unreadCount}
Total: ${notifications.totalCount}
${notifications.recent.length > 0 ? `Recent:
${notifications.recent
  .slice(0, 3)
  .map((n) => `• [${n.type.toUpperCase()}] ${n.title} [Notification ID: ${n.id}]: ${n.message.slice(0, 80)}${n.message.length > 80 ? "..." : ""}`)
  .join("\n")}` : "No recent notifications"}`);
  }

  // Recommendations section
  if (requirements.needsRecommendations && recommendations.length > 0) {
    const recList = recommendations
      .map((r, i) => {
        const priorityEmoji = r.priority === "high" ? "🔴" : r.priority === "medium" ? "🟡" : "🟢";
        return `${i + 1}. ${priorityEmoji} ${r.title}
   - ${r.description}
   - Reason: ${r.reason}`;
      })
      .join("\n");

    sections.push(`
=== PERSONALIZED RECOMMENDATIONS FOR ${profile.name.toUpperCase()} ===
${recList}`);
  }

  // Current lesson context (for lesson-specific questions)
  if (requirements.needsLesson && currentLesson) {
    sections.push(`
=== CURRENT LESSON CONTEXT ===
Lesson: ${currentLesson.title}
Module: ${currentLesson.moduleTitle}
Course: ${currentLesson.courseName}`);

    if (lessonTranscript) {
      sections.push(`
=== VIDEO TRANSCRIPT ===
${lessonTranscript.slice(0, 8000)}`);
    }
  }

  // Additional context if provided
  if (additionalContext) {
    sections.push(`
=== ADDITIONAL CONTEXT ===
${additionalContext}`);
  }

  // Intent-specific instructions
  sections.push(getIntentInstructions(intent, profile.name));

  // General formatting instructions
  sections.push(`
=== RESPONSE GUIDELINES ===
1. Be DIRECT - answer the question in the first sentence
2. Keep responses SHORT (50-150 words max for simple queries, 150-250 for complex ones)
3. Use **bold** sparingly for key numbers or important actions
4. Use bullet points - one line per point, no lengthy explanations
5. NEVER start with "As your AI assistant..." or similar phrases
6. NEVER say "You are a student of..." - they already know this
7. When mentioning assessments/modules, just name them briefly - we show clickable cards
8. End with 2-3 SHORT follow-up questions (not formatted as a section, just naturally suggested)

Example good response for "What assessments do I have?":
"You have **3 upcoming assessments** this week:

- **Quiz 1** (Biology) - due tomorrow
- **Midterm** (Math) - due Friday
- **Essay** (English) - due next Monday

The Biology quiz needs your attention first! Would you like study tips for any of these?"

Example BAD response (avoid this):
"Hello ${profile.name}! As your personal AI learning assistant, I'm here to help you manage your academic journey. You are enrolled in Biology 101 and other courses at our school. Looking at your schedule, I can see that you have several assessments coming up..." [too long, repeats known info]`);

  return sections.join("\n");
}

function getIntentInstructions(intent: QuestionIntent, studentName: string): string {
  switch (intent) {
    case "progress":
      return `
=== INTENT: PROGRESS ===
Be brief. State overall progress %, highlight 1-2 achievements, mention 1-2 areas to improve.
Use numbers. Interactive cards will show detailed course/module info.`;

    case "schedule":
      return `
=== INTENT: SCHEDULE/DEADLINES ===
List assessments by urgency in 1 line each. Flag anything urgent.
Interactive cards will show the full details - just give a quick summary.`;

    case "recommendation":
      return `
=== INTENT: RECOMMENDATIONS ===
Give 2-3 specific recommendations in bullet points.
Focus on WHAT to do and WHY in one sentence each.
Interactive cards will show clickable items.`;

    case "summary":
      return `
=== INTENT: SUMMARY ===
Quick snapshot in 4-5 bullet points max:
- Overall progress
- Urgent items (if any)
- What's going well
- One suggestion`;

    case "assessment":
      return `
=== INTENT: ASSESSMENTS ===
Count upcoming assessments. List them briefly by name and due date.
Interactive cards will show clickable assessment details.
Mention the most urgent one first.`;

    case "personal":
      return `
=== INTENT: PERSONAL ===
Answer their specific question about their data/activity/identity DIRECTLY.
For identity questions (student ID, LRN, section, email, enrollment info):
- Look at STUDENT IDENTITY section above
- Give the EXACT value from the data
- NEVER say "I don't have that information" if it's in STUDENT IDENTITY
- If a field shows "Not assigned" or "Not available", state that clearly
Be brief and supportive.`;

    case "planning":
      return `
=== INTENT: STUDY PLANNING ===
Create a simple, actionable plan:
- List 3-5 specific tasks
- Order by priority
- Keep each task to one line
Interactive cards will show clickable items to work on.`;

    case "lesson":
      return `
=== INTENT: LESSON CONTENT ===
Explain clearly using the transcript if available.
Use examples. Keep explanations digestible.
This intent doesn't show action cards - focus on teaching.`;

    case "general":
    default:
      return `
=== INTENT: GENERAL ===
Answer directly and helpfully.
Keep it brief unless detail is needed.`;
  }
}

// Generate contextual follow-up questions based on student data
export function generateContextualFollowUps(
  context: StudentContext,
  intent: QuestionIntent
): string[] {
  const followUps: string[] = [];
  const { profile, courses, upcomingAssessments, stats, recommendations } = context;

  switch (intent) {
    case "progress":
      if (courses.some((c) => c.progressPercent < 50)) {
        const lowCourse = courses.find((c) => c.progressPercent < 50);
        followUps.push(`How can I catch up in ${lowCourse?.name}?`);
      }
      if (upcomingAssessments.length > 0) {
        followUps.push("What assessments do I have coming up?");
      }
      followUps.push("What should I focus on next?");
      break;

    case "schedule":
      if (upcomingAssessments.length > 0) {
        followUps.push(`Help me prepare for ${upcomingAssessments[0].title}`);
      }
      followUps.push("Create a study plan for this week");
      followUps.push("How am I doing overall?");
      break;

    case "recommendation":
      if (recommendations.length > 0) {
        followUps.push(`Tell me more about ${recommendations[0].title}`);
      }
      followUps.push("Show me my upcoming deadlines");
      followUps.push("What are my strongest subjects?");
      break;

    default:
      followUps.push("How am I doing in my courses?");
      followUps.push("What should I study next?");
      followUps.push("Any upcoming deadlines?");
  }

  return followUps.slice(0, 3);
}
