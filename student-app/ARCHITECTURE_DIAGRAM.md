# Architecture Diagram - Subjects & Modules

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         MSU Student App                          │
│                     Subjects & Modules System                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          User Journey                            │
└─────────────────────────────────────────────────────────────────┘

    /subjects
        │
        ├─► Lists all enrolled courses/subjects
        │   with progress percentages
        │
        ▼
    /subjects/[subjectId]
        │
        ├─► Shows all modules in the subject
        │   Shows overall course progress
        │   Highlights next module to continue
        │
        ▼
    /subjects/[subjectId]/modules/[moduleId]
        │
        ├─► Displays lesson content
        │   Video player for video lessons
        │   Navigation between lessons
        │   Mark as complete functionality
        │
        └─► Lesson query: ?lesson=[lessonId]
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Page Components (RSC)                       │
└─────────────────────────────────────────────────────────────────┘

/subjects/page.tsx                    [Server Component]
│
├─► getCurrentStudent()               [DAL - lib/dal/student.ts]
├─► getStudentSubjects()              [DAL - lib/dal/subjects.ts]
└─► Renders subject cards with progress

/subjects/[subjectId]/page.tsx        [Server Component]
│
├─► getCurrentStudent()
├─► getSubjectById()                  [DAL - lib/dal/subjects.ts]
├─► getModulesBySubject()             [DAL - lib/dal/subjects.ts]
├─► getSubjectProgress()              [DAL - lib/dal/subjects.ts]
└─► Renders module list and current module card

/subjects/[subjectId]/modules/[moduleId]/page.tsx  [Server Component]
│
├─► getCurrentStudent()
├─► getModuleById()                   [DAL - lib/dal/subjects.ts]
├─► getSubjectById()                  [DAL - lib/dal/subjects.ts]
├─► getLessonsByModule()              [DAL - lib/dal/subjects.ts]
├─► getLessonWithProgress()           [DAL - lib/dal/subjects.ts]
│
├─► VideoPlayer (Client Component)
│   └─► Updates progress via API
│
├─► LessonNavigation (Client Component)
│   └─► Marks complete via API
│
└─► Renders lesson content and navigation

┌─────────────────────────────────────────────────────────────────┐
│                    Client Components                             │
└─────────────────────────────────────────────────────────────────┘

VideoPlayer.tsx                       [Client Component]
│
├─► Props: embedUrl, lessonId, studentId, courseId, initialProgress
├─► State: isPlaying, progress
├─► Effect: Auto-update progress at 80%
└─► API Call: POST /api/progress/update

LessonNavigation.tsx                  [Client Component]
│
├─► Props: currentLesson, nextLesson, prevLesson, etc.
├─► State: completing, completed
├─► Handler: handleMarkComplete()
└─► API Call: POST /api/progress/complete

┌─────────────────────────────────────────────────────────────────┐
│                        API Routes                                │
└─────────────────────────────────────────────────────────────────┘

/api/progress/update/route.ts         [Route Handler]
│
├─► Method: POST
├─► Body: { studentId, courseId, lessonId, progress }
├─► Calls: updateLessonProgress()     [DAL]
└─► Returns: { success, progress }

/api/progress/complete/route.ts       [Route Handler]
│
├─► Method: POST
├─► Body: { studentId, courseId, lessonId }
├─► Calls: markLessonComplete()       [DAL]
└─► Returns: { success }

┌─────────────────────────────────────────────────────────────────┐
│                   Data Access Layer (DAL)                        │
└─────────────────────────────────────────────────────────────────┘

lib/dal/subjects.ts
│
├─► getStudentSubjects(studentId)
│   └─► Supabase: SELECT enrollments + courses + progress
│
├─► getSubjectById(courseId)
│   └─► Supabase: SELECT courses WHERE id = courseId
│
├─► getModulesBySubject(courseId)
│   └─► Supabase: SELECT modules WHERE course_id = courseId
│
├─► getModuleById(moduleId)
│   └─► Supabase: SELECT modules WHERE id = moduleId
│
├─► getLessonsByModule(moduleId)
│   └─► Supabase: SELECT lessons WHERE module_id = moduleId
│
├─► getLessonById(lessonId)
│   └─► Supabase: SELECT lessons WHERE id = lessonId
│
├─► getLessonWithProgress(lessonId, studentId)
│   └─► Supabase: SELECT lessons + JOIN progress
│
├─► updateLessonProgress(studentId, courseId, lessonId, progress)
│   └─► Supabase: UPSERT student_progress
│
├─► markLessonComplete(studentId, courseId, lessonId)
│   └─► Calls updateLessonProgress() with progress = 100
│
└─► getSubjectProgress(studentId, courseId)
    └─► Supabase: SELECT student_progress WHERE ...

lib/dal/student.ts
│
└─► getCurrentStudent()
    └─► Supabase: Auth + SELECT students + profiles

┌─────────────────────────────────────────────────────────────────┐
│                        Utilities                                 │
└─────────────────────────────────────────────────────────────────┘

lib/utils/video.ts
│
├─► extractYouTubeVideoId(url)
│   └─► Regex patterns for YouTube URLs
│
├─► getYouTubeEmbedUrl(videoId)
│   └─► Returns: https://youtube.com/embed/...
│
└─► getYouTubeThumbnail(videoId, quality)
    └─► Returns: https://img.youtube.com/vi/...

┌─────────────────────────────────────────────────────────────────┐
│                     Database Schema                              │
└─────────────────────────────────────────────────────────────────┘

courses (subjects)
├─ id, school_id, section_id
├─ name, subject_code
└─ teacher_id, timestamps

modules
├─ id, course_id
├─ title, description, order
├─ duration_minutes, is_published
└─ timestamps

lessons
├─ id, module_id
├─ title, content, content_type
├─ video_url, duration_minutes, order
├─ is_published
└─ timestamps

student_progress
├─ id, student_id, course_id, lesson_id
├─ progress_percent, completed_at
├─ last_accessed_at
└─ timestamps
└─ UNIQUE(student_id, lesson_id)

enrollments
├─ id, school_id, student_id
├─ course_id
└─ timestamps

students
├─ id, school_id, profile_id
├─ lrn, grade_level, section_id
└─ timestamps

profiles
├─ id, auth_user_id
├─ full_name, phone, avatar_url
└─ timestamps
```

## Data Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. User navigates to /subjects/[id]/modules/[moduleId]
       ▼
┌────────────────────────────────────────┐
│   Next.js Server Component (RSC)       │
├────────────────────────────────────────┤
│ • getCurrentStudent()                  │
│ • getModuleById(moduleId)              │
│ • getSubjectById(subjectId)            │
│ • getLessonsByModule(moduleId)         │
│ • getLessonWithProgress(lessonId, sid) │
└──────┬─────────────────────────────────┘
       │
       │ 2. DAL queries Supabase
       ▼
┌────────────────────────────────────────┐
│    Supabase (PostgreSQL)               │
├────────────────────────────────────────┤
│ Schema: "school software"              │
│ • courses table                        │
│ • modules table                        │
│ • lessons table                        │
│ • student_progress table               │
│ • enrollments table                    │
└──────┬─────────────────────────────────┘
       │
       │ 3. Returns data to DAL
       ▼
┌────────────────────────────────────────┐
│   DAL processes and returns            │
│   typed data objects                   │
└──────┬─────────────────────────────────┘
       │
       │ 4. Server component renders HTML
       ▼
┌────────────────────────────────────────┐
│   Rendered HTML sent to browser        │
├────────────────────────────────────────┤
│ • Static content (lesson info)         │
│ • Hydration islands:                   │
│   - VideoPlayer (client component)     │
│   - LessonNavigation (client component)│
└──────┬─────────────────────────────────┘
       │
       │ 5. User clicks "Mark as Complete"
       ▼
┌────────────────────────────────────────┐
│   LessonNavigation.tsx                 │
│   (Client Component)                   │
└──────┬─────────────────────────────────┘
       │
       │ 6. POST /api/progress/complete
       ▼
┌────────────────────────────────────────┐
│   /api/progress/complete/route.ts      │
│   (API Route)                          │
└──────┬─────────────────────────────────┘
       │
       │ 7. markLessonComplete()
       ▼
┌────────────────────────────────────────┐
│   DAL: updateLessonProgress()          │
│   (Sets progress to 100)               │
└──────┬─────────────────────────────────┘
       │
       │ 8. UPSERT student_progress
       ▼
┌────────────────────────────────────────┐
│   Supabase writes to database          │
└──────┬─────────────────────────────────┘
       │
       │ 9. Returns success
       ▼
┌────────────────────────────────────────┐
│   API returns { success: true }        │
└──────┬─────────────────────────────────┘
       │
       │ 10. Client updates UI state
       ▼
┌─────────────┐
│   Browser   │
│ Shows green │
│ "Completed" │
│   badge     │
└─────────────┘
```

## File Structure

```
student-app/
│
├── app/
│   ├── (student)/
│   │   └── subjects/
│   │       ├── page.tsx                    ✅ Lists all subjects
│   │       └── [subjectId]/
│   │           ├── page.tsx                ✅ Subject detail + modules
│   │           └── modules/
│   │               └── [moduleId]/
│   │                   ├── page.tsx        ✅ Module/lesson page
│   │                   ├── VideoPlayer.tsx ✅ Video player component
│   │                   └── LessonNavigation.tsx ✅ Lesson nav
│   │
│   └── api/
│       └── progress/
│           ├── update/
│           │   └── route.ts                ✅ Update progress API
│           └── complete/
│               └── route.ts                ✅ Mark complete API
│
├── lib/
│   ├── dal/
│   │   ├── index.ts
│   │   ├── types.ts                        ✅ TypeScript types
│   │   ├── student.ts                      ✅ Student DAL
│   │   └── subjects.ts                     ✅ Subjects/modules DAL
│   │
│   ├── supabase/
│   │   ├── server.ts                       ✅ Supabase client
│   │   └── client.ts
│   │
│   └── utils/
│       └── video.ts                        ✅ Video utilities
│
└── Documentation
    ├── SUBJECTS_MODULES_IMPLEMENTATION.md  ✅ Implementation guide
    ├── TESTING_GUIDE.md                    ✅ Testing guide
    └── ARCHITECTURE_DIAGRAM.md             ✅ This file
```

## Key Design Decisions

1. **Server Components First**: All pages are server components for fast initial load
2. **Client Components for Interactivity**: Only video player and navigation use client
3. **API Routes for Mutations**: Progress updates go through API for security
4. **DAL Pattern**: All database queries centralized in lib/dal/
5. **Type Safety**: Full TypeScript with proper types for all data
6. **YouTube Embeds**: Direct iframe embeds for reliability
7. **Progress on Server**: Fetch initial progress server-side for SEO
8. **Progressive Enhancement**: Works without JS, enhanced with JS
