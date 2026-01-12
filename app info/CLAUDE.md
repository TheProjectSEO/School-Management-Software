# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Mindanao State University (MSU) Student Web App** that needs to be built from HTML mockups. The project converts existing Tailwind CDN HTML screens into a production-grade Next.js application with Supabase backend.

**Current State**: Pre-development with HTML mockups in screen folders (each containing `code.html` and `screen.png` reference).

## Tech Stack (Target)

- **Next.js** (App Router, latest stable)
- **Tailwind CSS** (build-time, NOT CDN)
- **Supabase** (Auth, RLS, Storage, Database)
- **TypeScript**
- **Lexend font** + Material Symbols icons

## Build Commands (after project initialization)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Generate Supabase types
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
```

## Project Architecture

### Route Structure
```
/app
├── (auth)/           # Public auth routes
│   ├── login/
│   └── register/
└── (student)/        # Protected student routes (requires auth)
    ├── page.tsx              # Dashboard (student_home)
    ├── subjects/
    │   ├── page.tsx          # subjects_home_(my_subjects)
    │   └── [subjectId]/
    │       ├── page.tsx      # subject_space_-_overview
    │       └── modules/[moduleId]/page.tsx  # module_page_(learning_surface)
    ├── assessments/          # assessments_(msu_branded)
    ├── progress/             # progress_+_mastery_(msu_branded)
    ├── notes/                # notes_
    ├── downloads/            # downloads_
    ├── notifications/        # notifications_
    ├── profile/              # profile_
    └── help/                 # help_ (must include Support MSU section)
```

### Key Components
- `components/brand/BrandLogo.tsx` - **Single source of truth for logo** (use everywhere)
- `components/layout/AppShell.tsx` - Student shell with sidebar
- `components/layout/Sidebar.tsx` - Navigation sidebar
- `lib/supabase/server.ts` and `lib/supabase/client.ts` - Supabase clients

### Design Tokens (from HTML mockups)
```
Primary (MSU Maroon): #7B1113
MSU Gold: #FDB913
MSU Green: #006400
Background Light: #f6f7f8
Background Dark: #101822
Font: Lexend
```

## Critical Rules

### Logo Consistency
- Single logo asset at `/public/brand/logo.svg` or `/public/brand/logo.png`
- Always use `BrandLogo` component - never duplicate or inline logo
- No color overrides, filters, or stretching

### HTML to Next.js Migration
- Source HTML files are in screen folders (e.g., `student_home/code.html`)
- Reference screenshots in same folders (e.g., `student_home/screen.png`)
- Remove all Tailwind CDN `<script>` tags when converting
- Preserve exact class names initially, refactor after parity confirmed

### Supabase Integration
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- RLS policies enforce authorization (UI checks are supplementary)
- Use server components for data reads, client components for interactive widgets

## Screen Folders Reference

| Folder | Route |
|--------|-------|
| `student_login/` | `/login` |
| `student_registration_(msu_branded)_/` | `/register` |
| `student_home/` | `/` (dashboard) |
| `subjects_home_(my_subjects)/` | `/subjects` |
| `subject_space_-_overview/` | `/subjects/[subjectId]` |
| `module_page_(learning_surface)/` | `/subjects/[subjectId]/modules/[moduleId]` |
| `assessments_(msu_branded)_/` | `/assessments` |
| `progress_+_mastery_(msu_branded)_/` | `/progress` |
| `notes_/` | `/notes` |
| `downloads_/` | `/downloads` |
| `notifications_/` | `/notifications` |
| `profile_/` | `/profile` |
| `help_/` | `/help` (includes Support MSU) |

## Data Access Layer

Create typed query helpers in `/lib/db/`:
- `getStudentProfile()`
- `getSubjectsForStudent(studentId)`
- `getSubject(subjectId, studentId)`
- `getModules(subjectId, studentId)`
- `getModule(moduleId, studentId)`
- `getTranscript(moduleId)`
- `getAttachments(moduleId)`
- `updateModuleProgress(studentId, moduleId, payload)`
- `getNotifications(studentId)`
- `createSupportTicket(studentId, payload)`
