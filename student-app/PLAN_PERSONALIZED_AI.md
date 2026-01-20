# Personalized AI Learning Assistant - Implementation Plan

## Vision
Transform the AI from a generic lesson helper into a **personalized learning companion** that knows each student intimately - their progress, strengths, weaknesses, upcoming deadlines, and can proactively guide their learning journey.

---

## 1. Student Context Data Model

### 1.1 Data the AI Needs Access To

```
┌─────────────────────────────────────────────────────────────────┐
│                    STUDENT CONTEXT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   PROFILE    │  │   ACADEMIC   │  │  ASSESSMENTS │          │
│  │              │  │   PROGRESS   │  │              │          │
│  │ • Name       │  │              │  │ • Upcoming   │          │
│  │ • Grade      │  │ • Courses    │  │ • Past scores│          │
│  │ • Section    │  │ • Modules    │  │ • Due dates  │          │
│  │ • School     │  │ • Lessons    │  │ • Submissions│          │
│  │ • Avatar     │  │ • % Complete │  │ • Feedback   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │NOTIFICATIONS │  │   LEARNING   │  │    NOTES     │          │
│  │              │  │   ACTIVITY   │  │              │          │
│  │ • Unread     │  │              │  │ • By course  │          │
│  │ • Deadlines  │  │ • Last active│  │ • Favorites  │          │
│  │ • Announce-  │  │ • Study time │  │ • Recent     │          │
│  │   ments      │  │ • Streaks    │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Specific Data Points

| Category | Data Points | Use Case |
|----------|-------------|----------|
| **Profile** | name, grade_level, section, school_name | Personalized greetings, context |
| **Enrollments** | course_id, course_name, subject_code | "What courses am I taking?" |
| **Course Progress** | progress_percent per course | "How am I doing?" |
| **Module Progress** | completed modules, in-progress, not started | "What should I study next?" |
| **Lesson Progress** | completed lessons, time spent | Detailed progress tracking |
| **Assessments** | title, type, due_date, total_points | "What exams do I have?" |
| **Submissions** | score, status, feedback | "How did I do on my quiz?" |
| **Notifications** | unread count, recent messages, types | "Any new announcements?" |
| **Notes** | count, recent notes, favorites | "Show my notes on databases" |
| **Downloads** | available offline content | "What can I study offline?" |

---

## 2. Question Intent Classification

### 2.1 Intent Categories

The AI should recognize different types of questions and fetch relevant context:

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTENT CLASSIFICATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PROGRESS QUERIES          SCHEDULE QUERIES                      │
│  ├─ "How am I doing?"      ├─ "What's due this week?"           │
│  ├─ "My course progress"   ├─ "Upcoming exams?"                 │
│  └─ "What % complete?"     └─ "Any deadlines?"                  │
│                                                                  │
│  RECOMMENDATION QUERIES    SUMMARY QUERIES                       │
│  ├─ "What should I study?" ├─ "Summarize notifications"         │
│  ├─ "What's next?"         ├─ "Overview of my week"             │
│  └─ "Priority topics?"     └─ "Quick status update"             │
│                                                                  │
│  ASSESSMENT QUERIES        LESSON QUERIES (existing)             │
│  ├─ "How did I do?"        ├─ "Explain this concept"            │
│  ├─ "My quiz scores"       ├─ "What is a database?"             │
│  └─ "Areas to improve?"    └─ "Give me examples"                │
│                                                                  │
│  PERSONAL QUERIES          PLANNING QUERIES                      │
│  ├─ "My notes on X"        ├─ "Plan my study week"              │
│  ├─ "My strengths?"        ├─ "How to improve in Math?"         │
│  └─ "Weak subjects?"       └─ "Study schedule suggestion"       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Context Fetching Strategy

Based on intent, fetch only relevant data (to minimize token usage):

| Intent | Data to Fetch |
|--------|---------------|
| Progress Query | Profile + All course progress + Module completion |
| Schedule Query | Upcoming assessments + Due dates + Notifications |
| Recommendation | Progress + Incomplete modules + Weak areas |
| Summary | Notifications + Recent activity + Assessments |
| Assessment Query | Submissions + Scores + Feedback |
| Lesson Query | Current lesson + Transcript (existing) |
| Personal Query | Notes + Profile + Learning history |
| Planning Query | Full context (progress + schedule + recommendations) |

---

## 3. Architecture Design

### 3.1 New API Structure

```
/api/ai/
├── ask/route.ts           # Enhanced - main AI endpoint
├── context/route.ts       # NEW - fetches student context
└── intents.ts             # NEW - intent classification helpers
```

### 3.2 Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Student    │────▶│  AI Panel    │────▶│   /api/ai/   │
│   Question   │     │  Component   │     │     ask      │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────────┐
                     │                            ▼                            │
                     │              ┌──────────────────────┐                   │
                     │              │  Intent Classifier   │                   │
                     │              │  (keyword matching)  │                   │
                     │              └──────────┬───────────┘                   │
                     │                         │                               │
                     │         ┌───────────────┼───────────────┐               │
                     │         ▼               ▼               ▼               │
                     │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
                     │  │  Profile   │  │  Progress  │  │ Assessments│        │
                     │  │  Context   │  │  Context   │  │  Context   │        │
                     │  └────────────┘  └────────────┘  └────────────┘        │
                     │         │               │               │               │
                     │         └───────────────┼───────────────┘               │
                     │                         ▼                               │
                     │              ┌──────────────────────┐                   │
                     │              │   Build System       │                   │
                     │              │   Prompt with        │                   │
                     │              │   Student Context    │                   │
                     │              └──────────┬───────────┘                   │
                     │                         │                               │
                     │                         ▼                               │
                     │              ┌──────────────────────┐                   │
                     │              │   OpenAI LLM API     │                   │
                     │              │   (Llama 3.3 70B)    │                   │
                     │              └──────────┬───────────┘                   │
                     │                         │                               │
                     └─────────────────────────┼───────────────────────────────┘
                                               ▼
                                    ┌──────────────────────┐
                                    │  Personalized        │
                                    │  Response with       │
                                    │  Follow-up Questions │
                                    └──────────────────────┘
```

---

## 4. Implementation Details

### 4.1 Student Context Builder (`lib/ai/studentContext.ts`)

```typescript
interface StudentContext {
  profile: {
    name: string;
    gradeLevel: string;
    section: string;
    school: string;
  };

  courses: {
    id: string;
    name: string;
    code: string;
    progressPercent: number;
    completedModules: number;
    totalModules: number;
  }[];

  upcomingAssessments: {
    title: string;
    type: string;
    courseName: string;
    dueDate: Date;
    daysUntilDue: number;
  }[];

  recentSubmissions: {
    title: string;
    score: number;
    totalPoints: number;
    percentScore: number;
    feedback?: string;
  }[];

  notifications: {
    unreadCount: number;
    recent: {
      type: string;
      title: string;
      message: string;
      createdAt: Date;
    }[];
  };

  recommendations: {
    nextModule: { title: string; courseName: string };
    weakAreas: string[];
    priorityTasks: string[];
  };

  stats: {
    overallProgress: number;
    coursesEnrolled: number;
    modulesCompleted: number;
    assessmentsPending: number;
    averageScore: number;
  };
}
```

### 4.2 Intent Classification Keywords

```typescript
const intentKeywords = {
  progress: [
    'progress', 'how am i doing', 'my courses', 'completion',
    'percentage', 'status', 'performance', 'grades'
  ],
  schedule: [
    'due', 'deadline', 'upcoming', 'exam', 'quiz', 'when',
    'schedule', 'this week', 'tomorrow', 'assessment'
  ],
  recommendation: [
    'what should i', 'study next', 'recommend', 'suggest',
    'priority', 'focus on', 'improve', 'next step'
  ],
  summary: [
    'summarize', 'overview', 'summary', 'notifications',
    'announcements', 'what\'s new', 'update me', 'brief'
  ],
  personal: [
    'my notes', 'my strengths', 'my weaknesses', 'my profile',
    'about me', 'my learning', 'my history'
  ],
  planning: [
    'plan', 'schedule', 'organize', 'time management',
    'study plan', 'weekly plan', 'how to prepare'
  ]
};
```

### 4.3 Enhanced System Prompt Template

```
You are {studentName}'s personal AI learning assistant at Mindanao State University.
You know them well and are here to help them succeed academically.

=== STUDENT PROFILE ===
Name: {name}
Grade: {gradeLevel}
Section: {section}
School: {school}

=== ACADEMIC OVERVIEW ===
Overall Progress: {overallProgress}%
Courses Enrolled: {coursesEnrolled}
Average Assessment Score: {averageScore}%

=== CURRENT COURSES ===
{foreach course}
• {courseName} ({code}): {progressPercent}% complete
  - Completed: {completedModules}/{totalModules} modules
{/foreach}

=== UPCOMING DEADLINES ===
{foreach assessment}
• {title} ({type}) - {courseName}
  Due: {dueDate} ({daysUntilDue} days)
{/foreach}

=== RECENT PERFORMANCE ===
{foreach submission}
• {title}: {score}/{totalPoints} ({percentScore}%)
{/foreach}

=== NOTIFICATIONS ({unreadCount} unread) ===
{foreach notification}
• [{type}] {title}: {message}
{/foreach}

=== RECOMMENDATIONS FOR {studentName} ===
Next suggested module: {nextModule}
Areas needing attention: {weakAreas}
Priority tasks: {priorityTasks}

---

PERSONALITY & BEHAVIOR:
1. Address {studentName} by name occasionally
2. Be encouraging but honest about areas needing improvement
3. Proactively mention upcoming deadlines when relevant
4. Celebrate progress and achievements
5. Give specific, actionable advice based on their actual data
6. When asked "what should I study", use their actual progress data
7. When asked about assessments, reference their actual upcoming tests
8. Format responses beautifully with markdown
9. Always end with relevant follow-up question suggestions
```

---

## 5. Sample Interactions

### Example 1: Progress Query
**Student:** "How am I doing in my courses?"

**AI Response:**
> Hey Juan! Let me give you a quick overview of your progress 📊
>
> **Your Academic Standing:**
>
> | Course | Progress | Status |
> |--------|----------|--------|
> | Database Management | 75% | 🟢 On track |
> | Data Structures | 45% | 🟡 Needs attention |
> | Web Development | 90% | 🟢 Almost done! |
>
> **Overall:** You're at **70%** across all courses - great job!
>
> **My recommendation:** Focus on Data Structures this week. You have 3 modules left, and there's a quiz coming up on Friday.
>
> ---
> **Continue exploring:**
> - What modules should I prioritize in Data Structures?
> - When is my next assessment?
> - Show me my recent quiz scores

### Example 2: Schedule Query
**Student:** "What exams do I have coming up?"

**AI Response:**
> Here's what's on your calendar, Juan 📅
>
> **This Week:**
> - 🔴 **Database Quiz** - Tomorrow (Dec 28)
>   - Covers: SQL Joins, Normalization
>   - Worth: 50 points
>
> **Next Week:**
> - 🟡 **Data Structures Midterm** - Jan 3
>   - Covers: Arrays, Linked Lists, Trees
>   - Worth: 100 points
>
> **Pro tip:** Based on your progress, I'd suggest reviewing Trees tonight - you scored 65% on that module quiz.
>
> ---
> **Continue exploring:**
> - Help me prepare for the Database Quiz
> - What topics should I review for the midterm?
> - Show me my notes on SQL Joins

### Example 3: Recommendation Query
**Student:** "What should I study next?"

**AI Response:**
> Based on your current progress and upcoming deadlines, here's my recommendation, Juan 🎯
>
> **Priority 1: Database Management - SQL Optimization**
> - You're at 75% in this course
> - Quiz tomorrow! This module covers key topics
> - Estimated time: 45 minutes
>
> **Priority 2: Data Structures - Binary Trees**
> - Currently at 45% (needs catch-up)
> - This will be on your midterm
> - You have 2 unwatched videos here
>
> **Priority 3: Complete Web Dev Final Project**
> - You're so close at 90%!
> - Just the final module left
>
> Want me to explain any of these topics, or shall I create a study plan for this week?
>
> ---
> **Continue exploring:**
> - Explain SQL Optimization
> - Create a study plan for this week
> - What are Binary Trees?

---

## 6. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `lib/ai/studentContext.ts` | Fetch and build student context |
| `lib/ai/intentClassifier.ts` | Classify question intent |
| `lib/ai/promptBuilder.ts` | Build personalized prompts |
| `lib/ai/types.ts` | TypeScript interfaces |

### Modified Files
| File | Changes |
|------|---------|
| `app/api/ai/ask/route.ts` | Integrate context fetching, intent classification |
| `AskAIPanel.tsx` | Add "Ask about your progress" suggestions |

---

## 7. Implementation Phases

### Phase 1: Core Context (Priority)
- [ ] Create `studentContext.ts` with all data fetching
- [ ] Create `types.ts` with interfaces
- [ ] Update API route to fetch basic context
- [ ] Add profile + courses + progress to prompt

### Phase 2: Intent Classification
- [ ] Create `intentClassifier.ts`
- [ ] Implement keyword-based classification
- [ ] Fetch context based on intent (optimize tokens)

### Phase 3: Assessments & Schedule
- [ ] Add upcoming assessments to context
- [ ] Add recent submissions and scores
- [ ] Add deadline awareness to prompts

### Phase 4: Notifications & Recommendations
- [ ] Add notifications summary
- [ ] Implement recommendation engine
- [ ] Add weak area detection

### Phase 5: UI Enhancements
- [ ] Add quick action buttons ("My Progress", "Upcoming Exams")
- [ ] Add student greeting with name
- [ ] Show context indicators (courses loaded, etc.)

---

## 8. Performance Considerations

1. **Context Caching**: Cache student context for 5 minutes to avoid repeated DB calls
2. **Lazy Loading**: Only fetch full context when needed (based on intent)
3. **Token Optimization**: Summarize long lists (show top 5 notifications, not all)
4. **Background Prefetch**: Prefetch context when student opens AI panel

---

## 9. Success Metrics

- AI can answer "How am I doing?" with actual student data
- AI can list upcoming assessments with correct dates
- AI can recommend specific modules based on progress
- AI addresses student by name
- AI proactively mentions relevant deadlines
- Response time < 3 seconds
- Context accuracy: 100% (no hallucinated data)
