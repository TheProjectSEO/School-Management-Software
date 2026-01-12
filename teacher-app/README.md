# MSU Teacher Web App

Teacher Portal for Mindanao State University Online School OS.

## Tech Stack

- **Next.js 14+** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** (build-time)
- **Supabase** (Auth, Database, Storage, RLS)
- **Lexend** font + Material Symbols Outlined icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

3. Add your Supabase credentials to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_PROJECT_ID=your-project-id
```

4. Run development server:
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Project Structure

```
teacher-app/
├── app/
│   ├── (auth)/
│   │   └── teacher-register/  # Teacher registration
│   ├── teacher/               # Protected teacher routes
│   │   ├── page.tsx          # Dashboard
│   │   ├── classes/          # Class management
│   │   ├── subjects/         # Subject workspace
│   │   ├── assessments/      # Assessment builder
│   │   ├── submissions/      # Grading inbox
│   │   ├── gradebook/        # Gradebook
│   │   ├── attendance/       # Attendance tracking
│   │   ├── calendar/         # Calendar
│   │   ├── messages/         # Messaging
│   │   └── students/         # Student directory
│   └── layout.tsx
├── components/
│   ├── brand/
│   │   └── BrandLogo.tsx     # Single source of truth for logo
│   ├── layout/
│   │   ├── TeacherShell.tsx  # Main layout wrapper
│   │   └── TeacherSidebar.tsx # Navigation sidebar
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   └── server.ts         # Server client
│   ├── dal/teacher/          # Data access layer
│   └── utils.ts
└── types/
    └── supabase.ts           # Generated Supabase types
```

## Key Features

### Phase 1 - Foundation ✅
- [x] Teacher registration
- [x] Teacher dashboard
- [x] Branded layout with sidebar navigation
- [x] Shared UI components

### Phase 2 - Core Backend (In Progress)
- [ ] Teacher profile migrations
- [ ] Teacher DAL functions
- [ ] RLS policies
- [ ] API routes

### Phase 3 - Content Management
- [ ] Module Editor
- [ ] Transcript management
- [ ] Content asset uploads
- [ ] AI module generation

### Phase 4 - Assessments
- [ ] Question Bank Manager
- [ ] Assessment Builder
- [ ] Randomization engine
- [ ] Quiz snapshot generation

### Phase 5 - Grading
- [ ] Grading Inbox UI
- [ ] Rubric Builder
- [ ] AI feedback drafting
- [ ] Grade release workflow

### Phase 6 - Communication
- [ ] Announcements system
- [ ] Direct messaging
- [ ] Discussion threads
- [ ] Notification triggers

### Phase 7 - Attendance & Live
- [ ] Daily attendance tracking
- [ ] Live session scheduling
- [ ] Presence detection
- [ ] Attendance override UI

## Database Schema

All tables live in `n8n_content_creation` schema only.

### Shared Tables (with Student App)
- `profiles`, `schools`, `sections`, `students`
- `courses`, `enrollments`, `modules`, `lessons`
- `assessments`, `questions`, `submissions`
- `student_progress`, `notifications`

### Teacher-Specific Tables
- `teacher_profiles`, `teacher_assignments`
- `teacher_transcripts`, `teacher_notes`
- `teacher_live_sessions`, `teacher_attendance`
- `teacher_question_banks`, `teacher_rubric_templates`
- `teacher_announcements`, `teacher_discussion_threads`

## Design Tokens

```css
Primary (MSU Maroon): #7B1113
Primary Hover: #961517
Primary Active: #5a0c0e
MSU Gold: #FDB913
MSU Green: #006400
Background Light: #f6f7f8
Background Dark: #101822
Card Dark: #1a2634
Font: Lexend
Icons: Material Symbols Outlined (FILL:1, wght:400, GRAD:0, opsz:24)
```

## Scripts

```bash
# Development
npm run dev          # Start dev server on port 3001

# Production
npm run build        # Build for production
npm start            # Start production server

# Type checking
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler

# Supabase
npm run gen-types    # Generate TypeScript types from Supabase schema
```

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_PROJECT_ID` - For type generation

## License

© 2025 Mindanao State University. All rights reserved.
